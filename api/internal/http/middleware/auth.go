package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"kollab/api/internal/domain"
)

type contextKey string

const (
	userIDKey   contextKey = "user_id"
	usernameKey contextKey = "username"
)

// JWKSCache handles fetching and caching JWK public keys from the OIDC provider.
type JWKSCache struct {
	mu             sync.RWMutex
	jwksURL        string
	issuer         string
	audience       string
	requiredScope  string
	allowLocalHMAC bool
	keys           map[string]any // kid -> public key (*rsa.PublicKey or *ecdsa.PublicKey)
	httpClient     *http.Client
}

// NewJWKSCache creates a new instance of JWKSCache.
func NewJWKSCache(jwksURL string) *JWKSCache {
	return &JWKSCache{
		jwksURL:        jwksURL,
		allowLocalHMAC: true,
		keys:           make(map[string]any),
		httpClient:     &http.Client{Timeout: 10 * time.Second},
	}
}

// NewOIDCJWKSCache discovers a provider's JWKS URI and binds all accepted
// API access tokens to its issuer, dedicated API audience, and required scope.
func NewOIDCJWKSCache(ctx context.Context, issuer, audience, requiredScope string) (*JWKSCache, error) {
	issuer = strings.TrimRight(strings.TrimSpace(issuer), "/")
	audience = strings.TrimSpace(audience)
	requiredScope = strings.TrimSpace(requiredScope)
	if issuer == "" || audience == "" || requiredScope == "" {
		return nil, fmt.Errorf("OIDC issuer, API audience, and API scope are required")
	}
	issuerURL, err := url.Parse(issuer)
	if err != nil || issuerURL.Scheme != "https" || issuerURL.Host == "" {
		return nil, fmt.Errorf("OIDC issuer must be an absolute HTTPS URL")
	}
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, issuer+"/.well-known/openid-configuration", nil)
	if err != nil {
		return nil, fmt.Errorf("create OIDC discovery request: %w", err)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch OIDC discovery document: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OIDC discovery returned status %d", resp.StatusCode)
	}
	var discovery struct {
		Issuer  string `json:"issuer"`
		JWKSURI string `json:"jwks_uri"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&discovery); err != nil {
		return nil, fmt.Errorf("decode OIDC discovery document: %w", err)
	}
	if strings.TrimRight(discovery.Issuer, "/") != issuer {
		return nil, fmt.Errorf("OIDC discovery issuer does not match configured issuer")
	}
	jwksURL, err := url.Parse(discovery.JWKSURI)
	if err != nil || jwksURL.Scheme != "https" || jwksURL.Host == "" {
		return nil, fmt.Errorf("OIDC discovery returned an invalid JWKS URI")
	}
	return &JWKSCache{
		jwksURL:       discovery.JWKSURI,
		issuer:        issuer,
		audience:      audience,
		requiredScope: requiredScope,
		keys:          make(map[string]any),
		httpClient:    client,
	}, nil
}

// AllowsLocalCredentials reports whether development-only HMAC authentication
// is active. Production OIDC caches always return false.
func (c *JWKSCache) AllowsLocalCredentials() bool {
	return c == nil || c.allowLocalHMAC
}

// fetchKeys fetches public keys from the OIDC JWKS endpoint and updates the cache.
func (c *JWKSCache) fetchKeys(ctx context.Context) error {
	if c.jwksURL == "" || strings.Contains(c.jwksURL, "mock") {
		return fmt.Errorf("JWKS URL is empty or mock: %s", c.jwksURL)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.jwksURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create JWKS request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to fetch JWKS: status %d", resp.StatusCode)
	}

	var jwks struct {
		Keys []struct {
			Kty string `json:"kty"`
			Kid string `json:"kid"`
			Alg string `json:"alg"`
			Crv string `json:"crv"`
			X   string `json:"x"`
			Y   string `json:"y"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	newKeys := make(map[string]any)
	for _, key := range jwks.Keys {
		var pubKey any
		switch key.Kty {
		case "RSA":
			nBytes, err := base64.RawURLEncoding.DecodeString(key.N)
			if err != nil {
				continue
			}
			eBytes, err := base64.RawURLEncoding.DecodeString(key.E)
			if err != nil {
				continue
			}
			var eVal int
			for _, b := range eBytes {
				eVal = (eVal << 8) | int(b)
			}
			pubKey = &rsa.PublicKey{
				N: new(big.Int).SetBytes(nBytes),
				E: eVal,
			}
		case "EC":
			xBytes, err := base64.RawURLEncoding.DecodeString(key.X)
			if err != nil {
				continue
			}
			yBytes, err := base64.RawURLEncoding.DecodeString(key.Y)
			if err != nil {
				continue
			}
			var curve elliptic.Curve
			switch key.Crv {
			case "P-256":
				curve = elliptic.P256()
			case "P-384":
				curve = elliptic.P384()
			case "P-521":
				curve = elliptic.P521()
			default:
				continue
			}
			pubKey = &ecdsa.PublicKey{
				Curve: curve,
				X:     new(big.Int).SetBytes(xBytes),
				Y:     new(big.Int).SetBytes(yBytes),
			}
		}

		if pubKey != nil {
			newKeys[key.Kid] = pubKey
		}
	}

	c.mu.Lock()
	c.keys = newKeys
	c.mu.Unlock()

	return nil
}

// GetKey returns the cached public key matching the key ID (kid), or fetches and updates the cache if not found.
func (c *JWKSCache) GetKey(ctx context.Context, kid string) (any, error) {
	c.mu.RLock()
	key, exists := c.keys[kid]
	c.mu.RUnlock()

	if exists {
		return key, nil
	}

	// Refresh cache
	if err := c.fetchKeys(ctx); err != nil {
		return nil, fmt.Errorf("failed to fetch JWK keys: %w", err)
	}

	c.mu.RLock()
	key, exists = c.keys[kid]
	c.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("key %q not found in JWKS", kid)
	}

	return key, nil
}

// AuthMiddleware returns a middleware that validates a JWT token and adds user claims to the context.
// It supports verifying OIDC tokens using a JWKS cache with an HMAC fallback for local development and testing.
func ValidateToken(ctx context.Context, tokenString string, jwtSecret []byte, jwksCache *JWKSCache) (jwt.MapClaims, error) {
	claims := jwt.MapClaims{}
	validMethods := []string{"HS256", "HS384", "HS512"}
	parseOptions := []jwt.ParserOption{jwt.WithLeeway(30 * time.Second), jwt.WithValidMethods(validMethods)}
	if jwksCache != nil && !jwksCache.allowLocalHMAC {
		validMethods = []string{"RS256", "RS384", "RS512", "ES256", "ES384", "ES512"}
		parseOptions = []jwt.ParserOption{
			jwt.WithLeeway(30 * time.Second),
			jwt.WithValidMethods(validMethods),
			jwt.WithIssuer(jwksCache.issuer),
			jwt.WithAudience(jwksCache.audience),
		}
	}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
			if jwksCache != nil && !jwksCache.allowLocalHMAC {
				return nil, fmt.Errorf("HMAC tokens are not accepted in OIDC mode")
			}
			if jwksCache != nil && len(jwtSecret) < 32 {
				return nil, fmt.Errorf("local JWT secret is not configured securely")
			}
			return jwtSecret, nil
		}
		kid, ok := token.Header["kid"].(string)
		if !ok || kid == "" || jwksCache == nil {
			return nil, fmt.Errorf("OIDC token is missing a usable key identifier")
		}
		return jwksCache.GetKey(ctx, kid)
	}, parseOptions...)
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token: %w", err)
	}
	if jwksCache != nil && !jwksCache.allowLocalHMAC && !hasRequiredScope(claims, jwksCache.requiredScope) {
		return nil, fmt.Errorf("access token does not include required scope")
	}
	return claims, nil
}

func hasRequiredScope(claims jwt.MapClaims, requiredScope string) bool {
	for _, claimName := range []string{"scope", "scp"} {
		switch value := claims[claimName].(type) {
		case string:
			for _, scope := range strings.Fields(value) {
				if scope == requiredScope {
					return true
				}
			}
		case []string:
			for _, scope := range value {
				if scope == requiredScope {
					return true
				}
			}
		case []any:
			for _, item := range value {
				if scope, ok := item.(string); ok && scope == requiredScope {
					return true
				}
			}
		}
	}
	return false
}

func AuthMiddleware(jwtSecret []byte, jwksCache *JWKSCache, userRepo domain.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			tokenString := ""
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
					http.Error(w, "Unauthorized: Authorization header must be Bearer <token>", http.StatusUnauthorized)
					return
				}
				tokenString = parts[1]
			} else if strings.HasPrefix(r.URL.Path, "/api/attachments/") || strings.HasPrefix(r.URL.Path, "/api/images/") {
				// Browser elements cannot send Authorization headers. This narrow
				// exception is limited to attachment rendering routes.
				tokenString = r.URL.Query().Get("authToken")
			}
			if tokenString == "" {
				http.Error(w, "Unauthorized: Authorization header must be Bearer <token>", http.StatusUnauthorized)
				return
			}
			claims, err := ValidateToken(r.Context(), tokenString, jwtSecret, jwksCache)
			if err != nil {
				log.Printf("JWT validation failed: %v", err)
				http.Error(w, "Unauthorized: Invalid or expired token", http.StatusUnauthorized)
				return
			}

			// Robust claim extraction: supports OIDC 'sub' and custom 'user_id', as well as multiple username claims
			var userID, username string
			if sub, ok := claims["sub"].(string); ok {
				userID = sub
			} else if uid, ok := claims["user_id"].(string); ok {
				userID = uid
			}

			if uName, ok := claims["username"].(string); ok {
				username = uName
			} else if prefName, ok := claims["preferred_username"].(string); ok {
				username = prefName
			} else if name, ok := claims["name"].(string); ok {
				username = name
			}

			if userID == "" {
				http.Error(w, "Unauthorized: Invalid token claims (user ID not found)", http.StatusUnauthorized)
				return
			}

			if username == "" {
				username = userID // fallback
			}

			var email, displayName string
			if em, ok := claims["email"].(string); ok {
				email = em
			}
			if n, ok := claims["name"].(string); ok {
				displayName = n
			} else {
				displayName = username
			}

			// Local users must still exist and be active. Never upsert a local user
			// from stale token claims; doing so resurrects deleted accounts and overwrites profiles.
			if userRepo != nil {
				if jwksCache.AllowsLocalCredentials() {
					current, err := userRepo.GetByID(r.Context(), userID)
					version, _ := claims["credential_version"].(string)
					if err != nil || current == nil || !current.IsActive || version != domain.CredentialVersion(current.PasswordHash) {
						http.Error(w, "Unauthorized: session expired", http.StatusUnauthorized)
						return
					}
					username = current.Username
				} else {
					u := &domain.User{ID: userID, Username: username, Email: email, DisplayName: displayName, IsActive: true}
					if err := userRepo.Upsert(r.Context(), u); err != nil {
						http.Error(w, "Unable to establish user session", http.StatusServiceUnavailable)
						return
					}
					current, err := userRepo.GetByID(r.Context(), userID)
					if err != nil || current == nil || !current.IsActive {
						http.Error(w, "Unauthorized: account disabled", http.StatusUnauthorized)
						return
					}
				}
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			ctx = context.WithValue(ctx, usernameKey, username)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID retrieves the user ID from the context.
func GetUserID(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(userIDKey).(string)
	return val, ok
}

// GetUsername retrieves the username from the context.
func GetUsername(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(usernameKey).(string)
	return val, ok
}
