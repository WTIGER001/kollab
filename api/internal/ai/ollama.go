package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type OllamaClient struct {
	baseURL    string
	embedModel string
	textModel  string
	client     *http.Client
}

func NewOllamaClient() *OllamaClient {
	baseURL := os.Getenv("OLLAMA_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}
	embedModel := os.Getenv("OLLAMA_EMBED_MODEL")
	if embedModel == "" {
		embedModel = "nomic-embed-text"
	}
	textModel := os.Getenv("OLLAMA_TEXT_MODEL")
	if textModel == "" {
		textModel = "llama3"
	}
	return &OllamaClient{
		baseURL:    baseURL,
		embedModel: embedModel,
		textModel:  textModel,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type embeddingsRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
}

type embeddingsResponse struct {
	Embedding []float32 `json:"embedding"`
}

func (c *OllamaClient) GenerateTextEmbeddings(ctx context.Context, text string) ([]float32, error) {
	reqBody := embeddingsRequest{
		Model:  c.embedModel,
		Prompt: text,
	}
	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(reqBody); err != nil {
		return nil, fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/embeddings", buf)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call Ollama API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Ollama API returned non-OK status: %d", resp.StatusCode)
	}

	var respBody embeddingsResponse
	if err := json.NewDecoder(resp.Body).Decode(&respBody); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return respBody.Embedding, nil
}

type ollamaGenerateRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

type ollamaGenerateResponse struct {
	Response string `json:"response"`
}

func (c *OllamaClient) GenerateText(ctx context.Context, prompt string) (string, error) {
	reqBody := ollamaGenerateRequest{
		Model:  c.textModel,
		Prompt: prompt,
		Stream: false,
	}
	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(reqBody); err != nil {
		return "", fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/generate", buf)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call Ollama API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Ollama API returned non-OK status: %d", resp.StatusCode)
	}

	var respBody ollamaGenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&respBody); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	return respBody.Response, nil
}
