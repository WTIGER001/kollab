package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestOpenAIClientGeneratesTextAndEmbeddings(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer test-key" {
			t.Fatalf("unexpected authorization header: %q", got)
		}
		var request map[string]any
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if _, embeddingRequest := request["input"]; embeddingRequest {
			if request["dimensions"] != float64(768) {
				t.Fatalf("expected 768 embedding dimensions, got %#v", request)
			}
			_, _ = w.Write([]byte(`{"data":[{"embedding":[0.1,0.2]}]}`))
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"generated text"}}]}`))
	}))
	defer server.Close()

	client := NewOpenAIClient("test-key")
	client.client = &http.Client{Timeout: time.Second, Transport: &mockTransport{mockURL: server.URL}}
	text, err := client.GenerateText(context.Background(), "hello")
	if err != nil || text != "generated text" {
		t.Fatalf("unexpected generated text: %q, %v", text, err)
	}
	embedding, err := client.GenerateTextEmbeddings(context.Background(), "embed me")
	if err != nil || len(embedding) != 2 || embedding[0] != 0.1 {
		t.Fatalf("unexpected embedding: %#v, %v", embedding, err)
	}
}

func TestOpenAIClientReportsBadResponses(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "upstream unavailable", http.StatusBadGateway)
	}))
	defer server.Close()
	client := NewOpenAIClient("test-key")
	client.client = &http.Client{Transport: &mockTransport{mockURL: server.URL}}

	if _, err := client.GenerateText(context.Background(), "hello"); err == nil {
		t.Fatal("expected chat status failure")
	}
	if _, err := client.GenerateTextEmbeddings(context.Background(), "hello"); err == nil {
		t.Fatal("expected embedding status failure")
	}

	emptyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"choices":[]}`))
	}))
	defer emptyServer.Close()
	client.client = &http.Client{Transport: &mockTransport{mockURL: emptyServer.URL}}
	if _, err := client.GenerateText(context.Background(), "hello"); err == nil {
		t.Fatal("expected empty choices failure")
	}
}
