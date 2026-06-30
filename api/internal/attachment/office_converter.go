package attachment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type StorageConfig struct {
	Type   string `json:"type"`
	Path   string `json:"path,omitempty"`
	Bucket string `json:"bucket,omitempty"`
	Key    string `json:"key,omitempty"`
}

type PreviewRequest struct {
	JobId       string        `json:"jobId"`
	Source      StorageConfig `json:"source"`
	Destination StorageConfig `json:"destination"`
}

type OfficeConverterClient struct {
	BaseURL    string
	HttpClient *http.Client
}

func NewOfficeConverterClient() *OfficeConverterClient {
	url := os.Getenv("OFFICE_CONVERTER_URL")
	if url == "" {
		url = "http://localhost:8082/api/v1/preview"
	}
	return &OfficeConverterClient{
		BaseURL: url,
		HttpClient: &http.Client{
			Timeout: 120 * time.Second, // conversions can take time
		},
	}
}

// Convert sends the preview request containing file storage coordinates to the external Java microservice.
func (c *OfficeConverterClient) Convert(ctx context.Context, jobId string, source StorageConfig, dest StorageConfig) error {
	reqBody := PreviewRequest{
		JobId:       jobId,
		Source:      source,
		Destination: dest,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal preview request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create http request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute HTTP post: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("conversion service returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}
