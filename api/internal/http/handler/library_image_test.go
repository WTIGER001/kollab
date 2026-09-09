package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/handler"
)

func TestLibraryImageHandlerWithoutService(t *testing.T) {
	h := handler.NewLibraryImageHandler(nil)

	t.Run("lists an empty library", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/library/images", nil)
		recorder := httptest.NewRecorder()

		h.List(recorder, req)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, recorder.Code)
		}
		if got := recorder.Header().Get("Content-Type"); got != "application/json" {
			t.Fatalf("expected JSON content type, got %q", got)
		}

		var images []*domain.LibraryImage
		if err := json.NewDecoder(recorder.Body).Decode(&images); err != nil {
			t.Fatalf("decode list response: %v", err)
		}
		if len(images) != 0 {
			t.Fatalf("expected no images, got %d", len(images))
		}
	})

	for _, test := range []struct {
		name   string
		method string
		handle func(http.ResponseWriter, *http.Request)
		status int
	}{
		{"rejects uploads", http.MethodPost, h.Upload, http.StatusServiceUnavailable},
		{"rejects renames", http.MethodPut, h.UpdateName, http.StatusServiceUnavailable},
		{"accepts idempotent deletes", http.MethodDelete, h.Delete, http.StatusNoContent},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(test.method, "/api/library/images/image-1", nil)
			recorder := httptest.NewRecorder()

			test.handle(recorder, req)

			if recorder.Code != test.status {
				t.Fatalf("expected status %d, got %d", test.status, recorder.Code)
			}
		})
	}
}
