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

type OpenAIClient struct {
	apiKey     string
	model      string
	embedModel string
	client     *http.Client
}

func NewOpenAIClient(apiKey string) *OpenAIClient {
	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		model = "gpt-4o-mini"
	}
	embedModel := os.Getenv("OPENAI_EMBED_MODEL")
	if embedModel == "" {
		embedModel = "text-embedding-3-small"
	}
	return &OpenAIClient{
		apiKey:     apiKey,
		model:      model,
		embedModel: embedModel,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChatRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	Temperature float32         `json:"temperature"`
}

type openAIChatChoice struct {
	Message openAIMessage `json:"message"`
}

type openAIChatResponse struct {
	Choices []openAIChatChoice `json:"choices"`
}

func (c *OpenAIClient) GenerateText(ctx context.Context, prompt string) (string, error) {
	reqBody := openAIChatRequest{
		Model: c.model,
		Messages: []openAIMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.7,
	}

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(reqBody); err != nil {
		return "", fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", buf)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call OpenAI API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenAI API returned non-OK status: %d", resp.StatusCode)
	}

	var respBody openAIChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&respBody); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(respBody.Choices) == 0 {
		return "", fmt.Errorf("OpenAI API returned empty choices list")
	}

	return respBody.Choices[0].Message.Content, nil
}

type openAIEmbedRequest struct {
	Model      string `json:"model"`
	Input      string `json:"input"`
	Dimensions int    `json:"dimensions,omitempty"`
}

type openAIEmbeddingData struct {
	Embedding []float32 `json:"embedding"`
}

type openAIEmbedResponse struct {
	Data []openAIEmbeddingData `json:"data"`
}

func (c *OpenAIClient) GenerateTextEmbeddings(ctx context.Context, text string) ([]float32, error) {
	reqBody := openAIEmbedRequest{
		Model: c.embedModel,
		Input: text,
	}
	// We only request 768 dimensions if using text-embedding-3-small or text-embedding-3-large
	if c.embedModel == "text-embedding-3-small" || c.embedModel == "text-embedding-3-large" {
		reqBody.Dimensions = 768
	}

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(reqBody); err != nil {
		return nil, fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/embeddings", buf)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call OpenAI API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OpenAI API returned non-OK status: %d", resp.StatusCode)
	}

	var respBody openAIEmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&respBody); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(respBody.Data) == 0 {
		return nil, fmt.Errorf("OpenAI API returned empty embedding data list")
	}

	return respBody.Data[0].Embedding, nil
}
