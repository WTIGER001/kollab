package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"log"

	"github.com/golang-jwt/jwt/v5"

	"arkollab/api/internal/domain"
)

type contextKey string

const (
	userIDKey   contextKey = "user_id"
	usernameKey contextKey = "username"
)

// JWKSCache handles fetching and caching JWK public keys from the OIDC provider.
type JWKSCache struct {
	mu      sync.RWMutex
	jwksURL string
	keys    map[string]any // kid -> public key (*rsa.PublicKey or *ecdsa.PublicKey)
}

// NewJWKSCache creates a new instance of JWKSCache.
func NewJWKSCache(jwksURL string) *JWKSCache {
	return &JWKSCache{
		jwksURL: jwksURL,
		keys:    make(map[string]any),
	}
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

	resp, err := http.DefaultClient.Do(req)
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
func AuthMiddleware(jwtSecret []byte, jwksCache *JWKSCache, userRepo domain.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Unauthorized: Authorization header is required", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, "Unauthorized: Authorization header must be Bearer <token>", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]
			claims := jwt.MapClaims{}

			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				// 1. Check if token is signed with HMAC (used in test suite and local dev mode)
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
					return jwtSecret, nil
				}

				// 2. Otherwise, look up public key in the JWKS cache
				kidVal, ok := token.Header["kid"]
				if !ok {
					return nil, fmt.Errorf("missing kid in token header")
				}

				kid, ok := kidVal.(string)
				if !ok {
					return nil, fmt.Errorf("invalid kid header type")
				}

				if jwksCache == nil {
					return nil, fmt.Errorf("JWKS cache is not initialized")
				}

				return jwksCache.GetKey(r.Context(), kid)
			})

			if err != nil || !token.Valid {
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

			// Perform lazy user detail upsert in the background
			if userRepo != nil {
				go func() {
					u := &domain.User{
						ID:          userID,
						Username:    username,
						Email:       email,
						DisplayName: displayName,
					}
					if err := userRepo.Upsert(context.Background(), u); err != nil {
						log.Printf("Warning: failed to upsert user details: %v", err)
					}
				}()
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
