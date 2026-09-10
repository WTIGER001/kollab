package attachment

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOfficeConverterClientSendsConversionAndConfigurationRequests(t *testing.T) {
	var conversionRequest PreviewRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/convert":
			if err := json.NewDecoder(r.Body).Decode(&conversionRequest); err != nil {
				t.Fatalf("decode conversion request: %v", err)
			}
			w.WriteHeader(http.StatusOK)
		case r.Method == http.MethodGet && r.URL.Path == "/convert/config":
			_ = json.NewEncoder(w).Encode(map[string]any{"asposeEnabled": true, "asposeLicensed": true})
		case r.Method == http.MethodPost && r.URL.Path == "/convert/config":
			var request map[string]any
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				t.Fatalf("decode configuration update: %v", err)
			}
			if request["asposeEnabled"] != true || request["asposeLicense"] != "license XML" {
				t.Fatalf("unexpected configuration update: %#v", request)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"asposeEnabled": true, "asposeLicensed": true})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := &OfficeConverterClient{BaseURL: server.URL + "/convert", HttpClient: server.Client()}
	ctx := context.Background()
	if err := client.Convert(ctx, "job-1", StorageConfig{Type: "local", Path: "/tmp/source"}, StorageConfig{Type: "s3", Bucket: "previews", Key: "job-1"}); err != nil {
		t.Fatalf("convert: %v", err)
	}
	if conversionRequest.JobId != "job-1" || conversionRequest.Source.Path != "/tmp/source" || conversionRequest.Destination.Bucket != "previews" {
		t.Fatalf("unexpected conversion request: %#v", conversionRequest)
	}

	config, err := client.GetConfig(ctx)
	if err != nil {
		t.Fatalf("get config: %v", err)
	}
	if !config.AsposeEnabled || !config.AsposeLicensed {
		t.Fatalf("unexpected configuration: %#v", config)
	}
	updated, err := client.UpdateConfig(ctx, true, "license XML")
	if err != nil {
		t.Fatalf("update config: %v", err)
	}
	if !updated.AsposeEnabled || !updated.AsposeLicensed {
		t.Fatalf("unexpected updated configuration: %#v", updated)
	}
}

func TestOfficeConverterClientReportsServiceFailures(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "converter unavailable", http.StatusBadGateway)
	}))
	defer server.Close()

	client := &OfficeConverterClient{BaseURL: server.URL, HttpClient: server.Client()}
	if err := client.Convert(context.Background(), "job-1", StorageConfig{}, StorageConfig{}); err == nil || !strings.Contains(err.Error(), "502") {
		t.Fatalf("expected converter status error, got %v", err)
	}
	if _, err := client.GetConfig(context.Background()); err == nil || !strings.Contains(err.Error(), "502") {
		t.Fatalf("expected config status error, got %v", err)
	}
	if _, err := client.UpdateConfig(context.Background(), false, ""); err == nil || !strings.Contains(err.Error(), "502") {
		t.Fatalf("expected update status error, got %v", err)
	}
}
