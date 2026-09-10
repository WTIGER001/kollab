package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOllamaClientGeneratesTextAndEmbeddings(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var request map[string]any
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		switch r.URL.Path {
		case "/api/generate":
			if request["stream"] != false {
				t.Fatalf("expected non-streaming text request: %#v", request)
			}
			_, _ = w.Write([]byte(`{"response":"local text"}`))
		case "/api/embeddings":
			_, _ = w.Write([]byte(`{"embedding":[0.4,0.5]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := NewOllamaClient()
	client.baseURL = server.URL
	client.client = server.Client()
	text, err := client.GenerateText(context.Background(), "hello")
	if err != nil || text != "local text" {
		t.Fatalf("unexpected generated text: %q, %v", text, err)
	}
	embedding, err := client.GenerateTextEmbeddings(context.Background(), "embed me")
	if err != nil || len(embedding) != 2 || embedding[1] != 0.5 {
		t.Fatalf("unexpected embedding: %#v, %v", embedding, err)
	}
}

func TestOllamaClientReportsBadResponses(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "model unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()
	client := &OllamaClient{baseURL: server.URL, client: server.Client()}

	if _, err := client.GenerateText(context.Background(), "hello"); err == nil {
		t.Fatal("expected generate status failure")
	}
	if _, err := client.GenerateTextEmbeddings(context.Background(), "hello"); err == nil {
		t.Fatal("expected embedding status failure")
	}
}
