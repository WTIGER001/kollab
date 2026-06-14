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

type GeminiClient struct {
	apiKey     string
	model      string
	embedModel string
	client     *http.Client
}

func NewGeminiClient(apiKey string) *GeminiClient {
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-1.5-flash"
	}
	embedModel := os.Getenv("GEMINI_EMBED_MODEL")
	if embedModel == "" {
		embedModel = "text-embedding-004"
	}
	return &GeminiClient{
		apiKey:     apiKey,
		model:      model,
		embedModel: embedModel,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiGenerateRequest struct {
	Contents []geminiContent `json:"contents"`
}

type geminiCandidate struct {
	Content geminiContent `json:"content"`
}

type geminiGenerateResponse struct {
	Candidates []geminiCandidate `json:"candidates"`
}

func (c *GeminiClient) GenerateText(ctx context.Context, prompt string) (string, error) {
	reqBody := geminiGenerateRequest{
		Contents: []geminiContent{
			{
				Parts: []geminiPart{
					{Text: prompt},
				},
			},
		},
	}

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(reqBody); err != nil {
		return "", fmt.Errorf("failed to encode request: %w", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", c.model, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, buf)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call Gemini API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Gemini API returned non-OK status: %d", resp.StatusCode)
	}

	var respBody geminiGenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&respBody); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(respBody.Candidates) == 0 || len(respBody.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("Gemini API returned empty candidates list")
	}

	return respBody.Candidates[0].Content.Parts[0].Text, nil
}

type geminiEmbedRequest struct {
	Content geminiContent `json:"content"`
}

type geminiEmbeddingValues struct {
	Values []float32 `json:"values"`
}

type geminiEmbedResponse struct {
	Embedding geminiEmbeddingValues `json:"embedding"`
}

func (c *GeminiClient) GenerateTextEmbeddings(ctx context.Context, text string) ([]float32, error) {
	reqBody := geminiEmbedRequest{
		Content: geminiContent{
			Parts: []geminiPart{
				{Text: text},
			},
		},
	}

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(reqBody); err != nil {
		return nil, fmt.Errorf("failed to encode request: %w", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent?key=%s", c.embedModel, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, buf)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call Gemini API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Gemini API returned non-OK status: %d", resp.StatusCode)
	}

	var respBody geminiEmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&respBody); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return respBody.Embedding.Values, nil
}
