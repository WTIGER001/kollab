package ai

import (
	"context"
	"testing"
)

func TestOpenAIClient(t *testing.T) {
	client := NewOpenAIClient("dummy_key")
	if client == nil {
		t.Fatal("expected client to be created")
	}

	// Generating text with invalid key will fail, so we just check for error
	_, err := client.GenerateText(context.Background(), "test prompt")
	if err == nil {
		t.Errorf("expected error generating text with dummy key")
	}

	_, err = client.GenerateTextEmbeddings(context.Background(), "test prompt")
	if err == nil {
		t.Errorf("expected error generating embeddings with dummy key")
	}
}
