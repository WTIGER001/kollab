package handler

import "testing"

func TestSettingsCredentialEncryptionIsWriteOnly(t *testing.T) {
	key := []byte("server-only-test-key")
	ciphertext, err := encryptSetting(key, "sk-test-secret")
	if err != nil {
		t.Fatalf("encrypt setting: %v", err)
	}
	if ciphertext == "sk-test-secret" {
		t.Fatal("credential was not encrypted")
	}
	plain, err := decryptSetting(key, ciphertext)
	if err != nil || plain != "sk-test-secret" {
		t.Fatalf("decrypt setting = %q, %v", plain, err)
	}
	if _, err := decryptSetting([]byte("wrong-key"), ciphertext); err == nil {
		t.Fatal("expected decrypt with wrong key to fail")
	}
}
