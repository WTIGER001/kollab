package middleware

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestLoggerRedaction(t *testing.T) {
	// Redirect log output to a buffer to inspect the logged content
	var buf bytes.Buffer
	log.SetOutput(&buf)
	defer log.SetOutput(nil) // Reset log output

	// Create a dummy handler that returns 200 OK
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// Wrap the dummy handler with our RequestLogger middleware
	loggedHandler := RequestLogger(dummyHandler)

	// Create a request with a token query parameter
	req := httptest.NewRequest(http.MethodGet, "http://localhost:8080/api/documents?token=secret_bearer_token_123&docId=456", nil)
	rr := httptest.NewRecorder()

	loggedHandler.ServeHTTP(rr, req)

	// Inspect the logged content
	logOutput := buf.String()

	if strings.Contains(logOutput, "secret_bearer_token_123") {
		t.Errorf("Expected token to be redacted, but found it in logs: %q", logOutput)
	}

	if !strings.Contains(logOutput, "token=%5BREDACTED%5D") {
		t.Errorf("Expected logs to contain redacted token indicator 'token=%%5BREDACTED%%5D', but got: %q", logOutput)
	}

	if !strings.Contains(logOutput, "docId=456") {
		t.Errorf("Expected logs to preserve other query parameters like 'docId=456', but got: %q", logOutput)
	}
}
