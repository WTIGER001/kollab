package ai

import (
	"context"
	"testing"
)

func TestOllamaClient(t *testing.T) {
	client := NewOllamaClient()
	if client == nil {
		t.Fatal("expected client to be created")
	}

	// This should fail to dial if Ollama isn't running locally, we just want to hit the code paths
	_, err := client.GenerateText(context.Background(), "test prompt")
	if err == nil {
		t.Errorf("expected error generating text with no ollama server")
	}

	_, err = client.GenerateTextEmbeddings(context.Background(), "test prompt")
	if err == nil {
		t.Errorf("expected error generating embeddings with no ollama server")
	}
}
