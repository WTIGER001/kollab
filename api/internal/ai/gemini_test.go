package ai

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestGeminiClientGenerateText(t *testing.T) {
	// Create a mock HTTP server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{
			"candidates": [
				{
					"content": {
						"parts": [
							{"text": "mock response"}
						]
					}
				}
			]
		}`))
	}))
	defer mockServer.Close()

	client := &GeminiClient{
		apiKey:     "test",
		model:      "test-model",
		embedModel: "test-embed",
		client: &http.Client{
			Timeout:   15 * time.Second,
			Transport: &mockTransport{mockURL: mockServer.URL},
		},
	}

	text, err := client.GenerateText(context.Background(), "hello")
	if err != nil {
		t.Fatalf("expected no err, got %v", err)
	}
	if text != "mock response" {
		t.Errorf("expected mock response, got %v", text)
	}
}

func TestGeminiClientGenerateTextEmbeddings(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{
			"embedding": {
				"values": [0.1, 0.2, 0.3]
			}
		}`))
	}))
	defer mockServer.Close()

	client := &GeminiClient{
		apiKey:     "test",
		model:      "test-model",
		embedModel: "test-embed",
		client: &http.Client{
			Timeout:   15 * time.Second,
			Transport: &mockTransport{mockURL: mockServer.URL},
		},
	}

	embed, err := client.GenerateTextEmbeddings(context.Background(), "hello")
	if err != nil {
		t.Fatalf("expected no err, got %v", err)
	}
	if len(embed) != 3 {
		t.Errorf("expected 3 values, got %d", len(embed))
	}
}

// mockTransport rewrites the URL to the mock server
type mockTransport struct {
	mockURL string
}

func (t *mockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	newReq, err := http.NewRequestWithContext(req.Context(), req.Method, t.mockURL, req.Body)
	if err != nil {
		return nil, err
	}
	newReq.Header = req.Header
	return http.DefaultTransport.RoundTrip(newReq)
}
