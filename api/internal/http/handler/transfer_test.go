package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"kollab/api/internal/domain"
	"kollab/api/internal/transfer"
)

// This wrapper supplies a bounded in-memory transfer repository to the existing
// dual-repository endpoint suite. PostgreSQL runs the real transactional import.
type scopeMockRepository struct{ domain.SystemRepository }

func (r *scopeMockRepository) ExportScope(ctx context.Context, kind, id string) (*transfer.Archive, error) {
	return endpointArchive(), nil
}
func (r *scopeMockRepository) ImportScope(ctx context.Context, a *transfer.Archive, o transfer.Options, publish func(map[string][]byte) error) (*transfer.Result, error) {
	p, err := transfer.BuildPlan(a, o)
	if err != nil {
		return nil, err
	}
	if err = publish(p.Files); err != nil {
		return nil, err
	}
	return &p.Result, nil
}
func endpointArchive() *transfer.Archive {
	return &transfer.Archive{Format: transfer.Format, Kind: "team", CreatedAt: time.Now(), Users: []transfer.User{}, Files: map[string][]byte{}, Tables: map[string][]transfer.Row{
		"teams":     {{"id": "remote-team", "name": "Remote team", "abbreviation": "remote"}},
		"documents": {{"id": "remote-doc", "team_id": "remote-team", "title": "Remote page", "content": `{"type":"doc","content":[]}`, "created_at": time.Now().UTC().Format(time.RFC3339), "updated_at": time.Now().UTC().Format(time.RFC3339)}},
	}}
}
func runScopeTransferEndpoints(t *testing.T, router http.Handler, token, ownerID string) {
	t.Helper()
	a := endpointArchive()
	data, err := transfer.Encode(a)
	if err != nil {
		t.Fatal(err)
	}
	request := func(endpoint, auth string, archive []byte, options transfer.Options) *httptest.ResponseRecorder {
		var b bytes.Buffer
		m := multipart.NewWriter(&b)
		f, _ := m.CreateFormFile("archive", "transfer.zip")
		f.Write(archive)
		raw, _ := json.Marshal(options)
		m.WriteField("options", string(raw))
		m.Close()
		req := httptest.NewRequest("POST", "/api/system/transfer/"+endpoint, &b)
		req.Header.Set("Content-Type", m.FormDataContentType())
		if auth != "" {
			req.Header.Set("Authorization", "Bearer "+auth)
		}
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		return w
	}
	options := transfer.Options{Name: "Endpoint restored team", Abbreviation: "endpoint-restored", OwnerID: ownerID}
	if w := request("preview", "", data, options); w.Code != 401 {
		t.Fatalf("anonymous preview: %d", w.Code)
	}
	if w := request("preview", token, []byte("bad"), options); w.Code != 422 {
		t.Fatalf("bad archive: %d", w.Code)
	}
	w := request("preview", token, data, options)
	if w.Code != 200 {
		t.Fatalf("preview: %d %s", w.Code, w.Body)
	}
	var preview map[string]any
	json.Unmarshal(w.Body.Bytes(), &preview)
	if preview["name"] != "Remote team" {
		t.Fatal("wrong preview")
	}
	w = request("import", token, data, options)
	if w.Code != 201 {
		t.Fatalf("import: %d %s", w.Code, w.Body)
	}
	var result transfer.Result
	json.Unmarshal(w.Body.Bytes(), &result)
	if result.TeamID == "" || result.TeamID == "remote-team" || result.Pages != 1 {
		t.Fatalf("invalid import result: %+v", result)
	}
	exportReq := httptest.NewRequest("GET", "/api/system/transfer/export?kind=team&id="+result.TeamID, nil)
	exportReq.Header.Set("Authorization", "Bearer "+token)
	exported := httptest.NewRecorder()
	router.ServeHTTP(exported, exportReq)
	if exported.Code != 200 {
		t.Fatalf("export: %d %s", exported.Code, exported.Body)
	}
	if _, err := transfer.Decode(exported.Body.Bytes()); err != nil {
		t.Fatalf("export ZIP invalid: %v", err)
	}
	bad := options
	bad.Abbreviation = "../bad"
	if w = request("import", token, data, bad); w.Code != 422 {
		t.Fatalf("unsafe destination accepted: %d", w.Code)
	}
}
