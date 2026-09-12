package permissions

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"time"
)

// IssueSharedMediaGrant exchanges a successfully checked sharing challenge for a
// short-lived, document-scoped capability. It never contains the link password.
func (e *AccessEvaluator) IssueSharedMediaGrant(token, documentID, userID string) (string, error) {
	hash := sha256.Sum256([]byte(token))
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"document": documentID, "link": hex.EncodeToString(hash[:]), "sub": userID, "exp": time.Now().Add(time.Hour).Unix()}).SignedString(e.mediaKey)
}
func (e *AccessEvaluator) SharedMediaDocument(ctx context.Context, token string) (string, error) {
	parsed, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) { return e.mediaKey, nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
	if err != nil || !parsed.Valid {
		return "", fmt.Errorf("invalid media grant")
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}
	doc, _ := claims["document"].(string)
	link, _ := claims["link"].(string)
	user, _ := claims["sub"].(string)
	if e.db == nil {
		return "", fmt.Errorf("media sharing requires database")
	}
	var valid bool
	err = e.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM sharing_links l JOIN documents d ON d.id=l.document_id
 WHERE l.token_hash=$1 AND l.document_id=$2 AND d.deleted_at IS NULL AND (l.expires_at IS NULL OR l.expires_at>now())
 AND (l.scope IN ('anonymous','anyone') OR (l.scope='organization' AND EXISTS(SELECT 1 FROM users u WHERE u.id=$3 AND u.is_active))))`, link, doc, user).Scan(&valid)
	if err != nil || !valid {
		return "", fmt.Errorf("media sharing link unavailable")
	}
	return doc, nil
}
func (e *AccessEvaluator) CanReadSharedImage(ctx context.Context, token, imageID string) bool {
	doc, err := e.SharedMediaDocument(ctx, token)
	if err != nil {
		return false
	}
	var contains bool
	err = e.db.QueryRow(ctx, "SELECT strpos(COALESCE(cs.content,d.content)::text,$2)>0 FROM documents d LEFT JOIN collaborative_states cs ON cs.document_id=d.id WHERE d.id=$1", doc, imageID).Scan(&contains)
	return err == nil && contains
}
