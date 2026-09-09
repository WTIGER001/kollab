package handler

import (
	"net/http/httptest"
	"testing"
)

func TestLocalLoginFailureBlocksAfterThreshold(t *testing.T) {
	h := NewUserHandler(nil, nil, nil, nil)
	request := httptest.NewRequest("POST", "/api/auth/login", nil)
	request.RemoteAddr = "192.0.2.10:4545"
	key := h.loginAttemptKey(request, "Admin")

	for range localLoginMaxFailures {
		h.recordLocalLoginFailure(key)
	}
	if !h.localLoginBlocked(key) {
		t.Fatal("expected login to be blocked after failure threshold")
	}
	h.clearLocalLoginAttempts(key)
	if h.localLoginBlocked(key) {
		t.Fatal("expected successful-login cleanup to remove a block")
	}
}
