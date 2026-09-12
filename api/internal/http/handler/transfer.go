package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"

	"kollab/api/internal/http/middleware"
	"kollab/api/internal/transfer"
)

func (h *SystemHandler) ExportScope(w http.ResponseWriter, r *http.Request) {
	repo, ok := h.systemService.(transfer.Repository)
	if !ok {
		http.Error(w, "Team/project transfer unavailable", 503)
		return
	}
	a, err := repo.ExportScope(r.Context(), r.URL.Query().Get("kind"), r.URL.Query().Get("id"))
	if err != nil {
		http.Error(w, err.Error(), 422)
		return
	}
	root, err := os.OpenRoot("uploads")
	if err != nil {
		http.Error(w, "Unable to access uploads", 500)
		return
	}
	defer root.Close()
	total := 0
	read := func(key string, required bool) error {
		if !transfer.ValidKey(key) {
			return fmt.Errorf("unsafe storage key")
		}
		f, err := root.Open(key)
		if err != nil {
			if !required && os.IsNotExist(err) {
				return nil
			}
			return fmt.Errorf("a referenced file is missing or unavailable")
		}
		defer f.Close()
		data, err := io.ReadAll(io.LimitReader(f, int64(transfer.MaxBytes-total)+1))
		if err != nil {
			return err
		}
		total += len(data)
		if total > transfer.MaxBytes {
			return fmt.Errorf("archive exceeds 256 MiB")
		}
		a.Files[key] = data
		return nil
	}
	for _, row := range a.Tables["attachments"] {
		if err = read(transfer.Text(row, "storage_key"), true); err != nil {
			http.Error(w, err.Error(), 422)
			return
		}
	}
	for _, row := range a.Tables["images"] {
		prefix := transfer.Text(row, "id") + "_"
		ext := "." + transfer.ImageExtension(transfer.Text(row, "mime_type"))
		for _, size := range []string{"original", "300", "600", "900", "1200"} {
			if err = read(prefix+size+ext, size == "original"); err != nil {
				http.Error(w, err.Error(), 422)
				return
			}
		}
	}
	data, err := transfer.Encode(a)
	if err != nil {
		http.Error(w, err.Error(), 422)
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="kollab-`+a.Kind+`-transfer.zip"`)
	w.Write(data)
}
func scopeUpload(w http.ResponseWriter, r *http.Request) (*transfer.Archive, error) {
	r.Body = http.MaxBytesReader(w, r.Body, transfer.MaxBytes+(1<<20))
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		return nil, fmt.Errorf("invalid upload or archive exceeds 256 MiB")
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}
	f, _, err := r.FormFile("archive")
	if err != nil {
		return nil, fmt.Errorf("select a team/project transfer ZIP")
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, transfer.MaxBytes+1))
	if err != nil {
		return nil, err
	}
	return transfer.Decode(data)
}
func (h *SystemHandler) PreviewScope(w http.ResponseWriter, r *http.Request) {
	a, err := scopeUpload(w, r)
	if err != nil {
		http.Error(w, err.Error(), 422)
		return
	}
	counts := map[string]int{}
	for table, rows := range a.Tables {
		counts[table] = len(rows)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"kind": a.Kind, "name": transfer.Text(transfer.Scope(a), "name"), "abbreviation": transfer.Text(transfer.Scope(a), "abbreviation"), "teamName": transfer.Text(a.Tables["teams"][0], "name"), "teamAbbreviation": transfer.Text(a.Tables["teams"][0], "abbreviation"), "createdAt": a.CreatedAt, "counts": counts, "files": len(a.Files), "users": a.Users})
}
func (h *SystemHandler) ImportScope(w http.ResponseWriter, r *http.Request) {
	a, err := scopeUpload(w, r)
	if err != nil {
		http.Error(w, err.Error(), 422)
		return
	}
	var options transfer.Options
	if err = json.Unmarshal([]byte(r.FormValue("options")), &options); err != nil {
		http.Error(w, "Invalid import options", 400)
		return
	}
	repo, ok := h.systemService.(transfer.Repository)
	if !ok {
		http.Error(w, "Team/project transfer unavailable", 503)
		return
	}
	options.ActorID, _ = middleware.GetUserID(r.Context())
	result, err := repo.ImportScope(r.Context(), a, options, publishScopeFiles)
	if err != nil {
		http.Error(w, err.Error(), 422)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result)
}
func publishScopeFiles(files map[string][]byte) error {
	if err := os.MkdirAll("uploads", 0700); err != nil {
		return err
	}
	root, err := os.OpenRoot("uploads")
	if err != nil {
		return err
	}
	defer root.Close()
	for key, data := range files {
		if !transfer.ValidKey(key) {
			return fmt.Errorf("unsafe generated storage key")
		}
		if err = root.MkdirAll(path.Dir(key), 0700); err != nil {
			return err
		}
		f, err := root.OpenFile(key, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
		if err != nil {
			return err
		}
		_, err = f.Write(data)
		if err == nil {
			err = f.Sync()
		}
		closeErr := f.Close()
		if err != nil {
			return err
		}
		if closeErr != nil {
			return closeErr
		}
	}
	return nil
}
