package domain

import (
	"crypto/sha256"
	"encoding/hex"
)

// CredentialVersion invalidates local sessions when the password changes.
func CredentialVersion(passwordHash string) string {
	digest := sha256.Sum256([]byte(passwordHash))
	return hex.EncodeToString(digest[:])
}
