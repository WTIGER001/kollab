package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"

	"github.com/go-chi/chi/v5"

	"arkollab/api/internal/domain"
	"arkollab/api/internal/http/middleware"
)

type AttachmentHandler struct {
	attachmentService domain.AttachmentService
}

func NewAttachmentHandler(attachmentService domain.AttachmentService) *AttachmentHandler {
	return &AttachmentHandler{
		attachmentService: attachmentService,
	}
}

func (h *AttachmentHandler) Upload(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	if docID == "" {
		http.Error(w, "Bad Request: document ID path parameter is required", http.StatusBadRequest)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized: user not authenticated", http.StatusUnauthorized)
		return
	}

	if err := r.ParseMultipartForm(20 << 20); err != nil {
		http.Error(w, "Bad Request: failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Bad Request: file form field is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Internal Server Error: failed to read file data", http.StatusInternalServerError)
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	att, err := h.attachmentService.UploadAttachment(r.Context(), docID, header.Filename, mimeType, data, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(att)
}

func (h *AttachmentHandler) List(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	if docID == "" {
		http.Error(w, "Bad Request: document ID path parameter is required", http.StatusBadRequest)
		return
	}

	attachments, err := h.attachmentService.ListAttachments(r.Context(), docID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(attachments)
}

func (h *AttachmentHandler) Download(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: id path parameter is required", http.StatusBadRequest)
		return
	}

	data, att, err := h.attachmentService.GetAttachmentFile(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", att.MimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(att.FileSize, 10))

	disposition := "attachment; filename=\"" + att.Filename + "\""
	if att.MimeType == "application/pdf" ||
		att.MimeType == "image/png" ||
		att.MimeType == "image/jpeg" ||
		att.MimeType == "image/gif" ||
		att.MimeType == "image/webp" ||
		att.MimeType == "text/plain" {
		disposition = "inline; filename=\"" + att.Filename + "\""
	}
	w.Header().Set("Content-Disposition", disposition)
	_, _ = w.Write(data)
}

func (h *AttachmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: id path parameter is required", http.StatusBadRequest)
		return
	}

	_, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized: user not authenticated", http.StatusUnauthorized)
		return
	}

	err := h.attachmentService.DeleteAttachment(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AttachmentHandler) Preview(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: id path parameter is required", http.StatusBadRequest)
		return
	}

	data, att, err := h.attachmentService.GetAttachmentPreview(r.Context(), id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Preview generation failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Header().Set("Content-Disposition", "inline; filename=\""+att.Filename+".pdf\"")
	_, _ = w.Write(data)
}

func (h *AttachmentHandler) PreviewStatus(w http.ResponseWriter, r *http.Request) {
	macPath := "/Applications/LibreOffice.app/Contents/MacOS/soffice"
	_, macErr := os.Stat(macPath)
	_, sofficePathErr := exec.LookPath("soffice")
	_, libreofficePathErr := exec.LookPath("libreoffice")

	libreofficeInstalled := macErr == nil || sofficePathErr == nil || libreofficePathErr == nil

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{
		"libreofficeInstalled": libreofficeInstalled,
	})
}
