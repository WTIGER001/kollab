package handler

import (
	"archive/zip"
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"kollab/api/internal/domain"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const maxArchiveBytes int64 = 1 << 30

// restoreArchive validates and stages every file before touching live data. The
// old upload tree remains available until the database transaction commits.
func (h *SystemHandler) restoreArchive(w http.ResponseWriter, r *http.Request, syncImport bool) {
	field := "backup"
	jsonName := "database_seed.json"
	if syncImport {
		field = "sync"
		jsonName = "sync_operations.json"
	}
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		http.Error(w, "Invalid archive upload", http.StatusBadRequest)
		return
	}
	defer r.MultipartForm.RemoveAll()
	file, _, err := r.FormFile(field)
	if err != nil {
		http.Error(w, "Archive file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()
	tmp, err := os.CreateTemp("", "kollab-archive-*.zip")
	if err != nil {
		http.Error(w, "Unable to stage archive", 500)
		return
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()
	count, err := io.Copy(tmp, io.LimitReader(file, maxArchiveBytes+1))
	if err != nil || count > maxArchiveBytes {
		http.Error(w, "Archive exceeds size limit", http.StatusRequestEntityTooLarge)
		return
	}
	archive, err := zip.OpenReader(tmp.Name())
	if err != nil {
		http.Error(w, "Invalid ZIP archive", 400)
		return
	}
	defer archive.Close()
	if err := os.MkdirAll("uploads", 0700); err != nil {
		http.Error(w, "Unable to access uploads", 500)
		return
	}
	stage, err := os.MkdirTemp("uploads", ".kollab-restore-")
	if err != nil {
		http.Error(w, "Unable to stage files", 500)
		return
	}
	preserveStage := false
	defer func() {
		if !preserveStage {
			_ = os.RemoveAll(stage)
		}
	}()
	stageRoot, err := os.OpenRoot(stage)
	if err != nil {
		http.Error(w, "Unable to stage files", 500)
		return
	}
	defer stageRoot.Close()
	seen := map[string]bool{}
	var payload, signature []byte
	var expanded uint64
	for _, entry := range archive.File {
		name := entry.Name
		if name == "" || strings.Contains(name, "\\") || strings.HasPrefix(name, "/") || path.Clean(name) != strings.TrimSuffix(name, "/") || strings.Contains(name, "../") || seen[name] || entry.Mode()&os.ModeSymlink != 0 {
			http.Error(w, "Unsafe archive path", 400)
			return
		}
		for _, component := range strings.Split(name, "/") {
			if strings.HasPrefix(component, ".kollab-restore-") || (syncImport && component == ".kollab-sync-conflicts") {
				http.Error(w, "Archive contains reserved recovery paths", 400)
				return
			}
		}
		seen[name] = true
		if entry.FileInfo().IsDir() {
			continue
		}
		if entry.UncompressedSize64 > uint64(maxArchiveBytes)-expanded {
			http.Error(w, "Expanded archive exceeds size limit", 413)
			return
		}
		expanded += entry.UncompressedSize64
		if name != jsonName && name != "signature.txt" && !strings.HasPrefix(name, "uploads/") {
			http.Error(w, "Unexpected archive entry", 400)
			return
		}
		source, err := entry.Open()
		if err != nil {
			http.Error(w, "Corrupt archive", 400)
			return
		}
		if name == jsonName || name == "signature.txt" {
			limit := maxArchiveBytes
			if name == "signature.txt" {
				limit = 256
			}
			data, readErr := io.ReadAll(io.LimitReader(source, limit+1))
			source.Close()
			if readErr != nil || int64(len(data)) > limit {
				http.Error(w, "Invalid archive metadata", 400)
				return
			}
			if name == jsonName {
				payload = data
			} else {
				signature = data
			}
			continue
		}
		if err = stageRoot.MkdirAll(filepath.Dir(name), 0700); err != nil {
			source.Close()
			http.Error(w, "Unable to stage files", 500)
			return
		}
		target, err := stageRoot.OpenFile(name, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if err != nil {
			source.Close()
			http.Error(w, "Unable to stage files", 500)
			return
		}
		_, copyErr := io.Copy(target, io.LimitReader(source, int64(entry.UncompressedSize64)+1))
		closeErr := target.Close()
		source.Close()
		if copyErr != nil || closeErr != nil {
			http.Error(w, "Corrupt archive content", 400)
			return
		}
	}
	if len(payload) == 0 {
		http.Error(w, "Required database metadata is missing", 400)
		return
	}
	var data map[string]interface{}
	var ops []map[string]interface{}
	resolutions := map[string]string{}
	if value := r.FormValue("resolutions"); value != "" {
		if len(value) > 128*1024 || json.Unmarshal([]byte(value), &resolutions) != nil {
			http.Error(w, "Invalid conflict resolutions", 400)
			return
		}
	}
	if syncImport {
		key := os.Getenv("SYNC_SIGNING_KEY")
		if len(key) < 32 {
			http.Error(w, "Configure SYNC_SIGNING_KEY (at least 32 bytes) before importing sync packages", http.StatusServiceUnavailable)
			return
		}
		expected, err := archiveSignature(archive.Reader, key, jsonName)
		supplied, decodeErr := hex.DecodeString(strings.TrimSpace(string(signature)))
		if err != nil || decodeErr != nil || !hmac.Equal(expected, supplied) {
			http.Error(w, "Sync package signature is invalid", 400)
			return
		}
		var envelope struct {
			Format     string                   `json:"format"`
			Operations []map[string]interface{} `json:"operations"`
		}
		if json.Unmarshal(payload, &envelope) != nil || envelope.Format != "kollab.sync.v3" {
			http.Error(w, "Invalid sync operations", 400)
			return
		}
		ops = envelope.Operations
		for _, op := range ops {
			if op == nil {
				http.Error(w, "Invalid synchronization record", 400)
				return
			}
			op["resolutions"] = resolutions
			delete(op, "resolution")
			delete(op, "conflict_id")
		}
	} else if json.Unmarshal(payload, &data) != nil {
		http.Error(w, "Invalid database snapshot", 400)
		return
	}
	// Merge files only after reviewing same-path changes; retain the losing bytes.
	if syncImport {
		err = filepath.WalkDir("uploads", func(p string, d os.DirEntry, err error) error {
			if os.IsNotExist(err) {
				return nil
			}
			if err != nil {
				return err
			}
			if d.Type()&os.ModeSymlink != 0 {
				return fmt.Errorf("upload tree contains symlink")
			}
			if p == stage {
				return filepath.SkipDir
			}
			if d.IsDir() {
				return nil
			}
			if seen[filepath.ToSlash(p)] {
				incomingHash, hashErr := hashArchiveFile(filepath.Join(stage, p))
				if hashErr != nil {
					return hashErr
				}
				localHash, hashErr := hashArchiveFile(p)
				if hashErr != nil {
					return hashErr
				}
				if incomingHash == localHash {
					return nil
				}
				sum := sha256.Sum256([]byte(p + localHash + incomingHash))
				id := hex.EncodeToString(sum[:])
				switch resolutions[id] {
				case "use-incoming":
					if err := preserveSyncFile(stageRoot, p, p, id, localHash); err != nil {
						return err
					}
					return nil
				case "keep-local":
					if err := preserveSyncFile(stageRoot, filepath.Join(stage, p), p, id, incomingHash); err != nil {
						return err
					}
				default:
					return &domain.SyncConflictError{Conflict: domain.SyncConflict{ID: id, Table: "uploaded file", Key: p, Local: map[string]string{"sha256": localHash}, Incoming: map[string]string{"sha256": incomingHash}}}
				}
			}
			if err := stageRoot.MkdirAll(filepath.Dir(p), 0700); err != nil {
				return err
			}
			src, err := os.Open(p)
			if err != nil {
				return err
			}
			defer src.Close()
			dst, err := stageRoot.OpenFile(p, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0600)
			if err != nil {
				return err
			}
			_, err = io.Copy(dst, src)
			closeErr := dst.Close()
			if err != nil {
				return err
			}
			return closeErr
		})
		if err != nil {
			var conflict *domain.SyncConflictError
			if errors.As(err, &conflict) {
				writeSyncConflict(w, conflict)
				return
			}
			http.Error(w, "Unable to stage existing uploads", 500)
			return
		}
	}
	if err = stageRoot.MkdirAll("uploads", 0700); err != nil {
		http.Error(w, "Unable to stage uploads", 500)
		return
	}
	if h.hub != nil {
		h.hub.Reset()
	}
	old := filepath.Join(stage, "previous-uploads")
	if err = os.Mkdir(old, 0700); err != nil {
		http.Error(w, "Unable to preserve uploads", 500)
		return
	}
	var preserved, installed []string
	rollback := func() error {
		for i := len(installed) - 1; i >= 0; i-- {
			if err := os.Rename(filepath.Join("uploads", installed[i]), filepath.Join(stage, "uploads", installed[i])); err != nil {
				return err
			}
		}
		for i := len(preserved) - 1; i >= 0; i-- {
			if err := os.Rename(filepath.Join(old, preserved[i]), filepath.Join("uploads", preserved[i])); err != nil {
				return err
			}
		}
		return nil
	}
	fail := func(message string, status int) {
		if rollbackErr := rollback(); rollbackErr != nil {
			preserveStage = true
			log.Printf("Archive rollback requires recovery from %s: %v", stage, rollbackErr)
			http.Error(w, "Restore failed and recovery files were preserved. An administrator must inspect the server recovery log before retrying.", 500)
			return
		}
		http.Error(w, message, status)
	}
	entries, err := os.ReadDir("uploads")
	if err != nil {
		http.Error(w, "Unable to inspect uploads", 500)
		return
	}
	for _, entry := range entries {
		if entry.Name() == filepath.Base(stage) {
			continue
		}
		if strings.HasPrefix(entry.Name(), ".kollab-restore-") {
			http.Error(w, "An earlier restore requires administrator recovery", 409)
			return
		}
	}
	for _, entry := range entries {
		if entry.Name() == filepath.Base(stage) {
			continue
		}
		if err = os.Rename(filepath.Join("uploads", entry.Name()), filepath.Join(old, entry.Name())); err != nil {
			fail("Unable to preserve existing uploads", 500)
			return
		}
		preserved = append(preserved, entry.Name())
	}
	entries, err = os.ReadDir(filepath.Join(stage, "uploads"))
	if err != nil {
		fail("Unable to inspect staged uploads", 500)
		return
	}
	for _, entry := range entries {
		if err = os.Rename(filepath.Join(stage, "uploads", entry.Name()), filepath.Join("uploads", entry.Name())); err != nil {
			fail("Unable to install uploads", 500)
			return
		}
		installed = append(installed, entry.Name())
	}
	if syncImport {
		err = h.systemService.ApplySyncOperations(r.Context(), ops)
	} else {
		err = h.systemService.RestoreBackup(r.Context(), data)
	}
	if err != nil {
		var conflict *domain.SyncConflictError
		if errors.As(err, &conflict) {
			if rollbackErr := rollback(); rollbackErr != nil {
				preserveStage = true
				log.Printf("Archive rollback requires recovery from %s: %v", stage, rollbackErr)
				http.Error(w, "Recovery files preserved; administrator recovery required", 500)
				return
			}
			writeSyncConflict(w, conflict)
			return
		}
		fail("Database archive could not be applied; existing data was preserved: "+err.Error(), 400)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"status": "success", "message": "Archive applied successfully", "importedCount": len(ops)})
}

// archiveSignature signs the exact ordered payload and attachment bytes, with
// length-delimited entry names, so replacing files invalidates the signature.
func archiveSignature(archive zip.Reader, key, jsonName string) ([]byte, error) {
	mac := hmac.New(sha256.New, []byte(key))
	for _, entry := range archive.File {
		if entry.Name == "signature.txt" || entry.FileInfo().IsDir() {
			continue
		}
		if entry.Name != jsonName && !strings.HasPrefix(entry.Name, "uploads/") {
			return nil, fmt.Errorf("unexpected signed entry")
		}
		fmt.Fprintf(mac, "%d:%s:%d:", len(entry.Name), entry.Name, entry.UncompressedSize64)
		f, err := entry.Open()
		if err != nil {
			return nil, err
		}
		_, err = io.Copy(mac, f)
		f.Close()
		if err != nil {
			return nil, err
		}
	}
	return mac.Sum(nil), nil
}

func (h *SystemHandler) exportArchive(w http.ResponseWriter, r *http.Request, syncExport bool) {
	jsonName := "database_seed.json"
	filename := "kollab_backup.zip"
	var payload []byte
	var err error
	key := ""
	if syncExport {
		key = os.Getenv("SYNC_SIGNING_KEY")
		if len(key) < 32 {
			http.Error(w, "Configure SYNC_SIGNING_KEY (at least 32 bytes) before exporting sync packages", http.StatusServiceUnavailable)
			return
		}
		since, parseErr := strconv.Atoi(r.URL.Query().Get("since_id"))
		if r.URL.Query().Get("since_id") == "" {
			since = 0
			parseErr = nil
		}
		if parseErr != nil || since < 0 {
			http.Error(w, "Invalid sync cursor", 400)
			return
		}
		ops, getErr := h.systemService.GetSyncOperations(r.Context(), since)
		if getErr != nil {
			http.Error(w, "Unable to export operations", 500)
			return
		}
		payload, err = json.Marshal(map[string]any{"format": "kollab.sync.v3", "operations": ops})
		jsonName = "sync_operations.json"
		filename = "kollab_sync.zip"
	} else {
		data, getErr := h.systemService.ExportBackup(r.Context())
		if getErr != nil {
			http.Error(w, "Unable to export database", 500)
			return
		}
		payload, err = json.Marshal(data)
	}
	if err != nil {
		http.Error(w, "Unable to encode archive", 500)
		return
	}
	tmp, err := os.CreateTemp("", "kollab-export-*.zip")
	if err != nil {
		http.Error(w, "Unable to stage archive", 500)
		return
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()
	writer := zip.NewWriter(tmp)
	mac := hmac.New(sha256.New, []byte(key))
	add := func(name string, size int64, src io.Reader) error {
		entry, err := writer.Create(name)
		if err != nil {
			return err
		}
		fmt.Fprintf(mac, "%d:%s:%d:", len(name), name, size)
		copied, err := io.Copy(io.MultiWriter(entry, mac), src)
		if err == nil && copied != size {
			return fmt.Errorf("file changed during backup")
		}
		return err
	}
	if err = add(jsonName, int64(len(payload)), bytes.NewReader(payload)); err == nil {
		// Include all referenced uploads in sync packages; modification timestamps
		// cannot reliably identify imported or restored attachments.
		err = filepath.WalkDir("uploads", func(p string, d os.DirEntry, walkErr error) error {
			if os.IsNotExist(walkErr) && p == "uploads" {
				return nil
			}
			if walkErr != nil {
				return walkErr
			}
			if strings.HasPrefix(d.Name(), ".kollab-restore-") {
				return fmt.Errorf("unfinished restore requires administrator recovery")
			}
			if syncExport && d.IsDir() && d.Name() == ".kollab-sync-conflicts" {
				return filepath.SkipDir
			}
			if d.Type()&os.ModeSymlink != 0 {
				return fmt.Errorf("upload tree contains symlink")
			}
			if d.IsDir() {
				return nil
			}
			source, err := os.Open(p)
			if err != nil {
				return err
			}
			defer source.Close()
			info, err := source.Stat()
			if err != nil {
				return err
			}
			return add(filepath.ToSlash(p), info.Size(), source)
		})
	}
	if err == nil && syncExport {
		entry, createErr := writer.Create("signature.txt")
		err = createErr
		if err == nil {
			_, err = io.WriteString(entry, hex.EncodeToString(mac.Sum(nil)))
		}
	}
	closeErr := writer.Close()
	if err != nil || closeErr != nil {
		http.Error(w, "Archive could not be completed", 500)
		return
	}
	if _, err = tmp.Seek(0, io.SeekStart); err != nil {
		http.Error(w, "Unable to read archive", 500)
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.Header().Set("Cache-Control", "no-store")
	http.ServeContent(w, r, filename, time.Now(), tmp)
}

func preserveSyncFile(root *os.Root, source, original, conflictID, hash string) error {
	dir := filepath.Join("uploads", ".kollab-sync-conflicts", conflictID)
	if err := root.MkdirAll(dir, 0700); err != nil {
		return err
	}
	src, err := os.Open(source)
	if err != nil {
		return err
	}
	defer src.Close()
	dst, err := root.OpenFile(filepath.Join(dir, hash), os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	_, err = io.Copy(dst, src)
	closeErr := dst.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	meta, err := root.OpenFile(filepath.Join(dir, "original-path.txt"), os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	_, err = io.WriteString(meta, original)
	closeErr = meta.Close()
	if err != nil {
		return err
	}
	return closeErr
}

func hashArchiveFile(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()
	hash := sha256.New()
	if _, err = io.Copy(hash, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}
func writeSyncConflict(w http.ResponseWriter, conflict *domain.SyncConflictError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusConflict)
	_ = json.NewEncoder(w).Encode(map[string]any{"message": conflict.Error(), "conflict": conflict.Conflict})
}
