package transfer

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func fixture() *Archive {
	now := time.Now().UTC().Format(time.RFC3339)
	return &Archive{Format: Format, Kind: "team", CreatedAt: time.Now(), Users: []User{{"source-user", "source", "Source author", true}}, Files: map[string][]byte{"attachments/file_note.txt": []byte("hello"), "image_original.png": []byte("image")}, Tables: map[string][]Row{
		"teams":    {{"id": "old-team", "name": "Source team", "abbreviation": "source"}},
		"projects": {{"id": "old-project", "team_id": "old-team", "name": "Project", "abbreviation": "project"}},
		"documents": {{"id": "page", "slug": "old-slug", "team_id": "old-team", "project_id": "old-project", "title": "Root", "content": `{"type":"doc","content":[{"type":"customImage","attrs":{"imageId":"image","src":"https://source.test/api/images/image/O?authToken=secret"}},{"type":"macroBlock","attrs":{"config":{"pageId":"child","attachmentId":"file"}}},{"type":"paragraph","content":[{"type":"text","text":"page is ordinary text","marks":[{"type":"link","attrs":{"href":"https://source.test/teams/source/p/project/docs/old-child#anchor"}}]}]}]}`, "created_at": now, "updated_at": now, "created_by": "source-user", "updated_by": "source-user"},
			{"id": "child", "slug": "old-child", "team_id": "old-team", "project_id": "old-project", "parent_id": "page", "title": "Child", "content": `{"type":"doc","content":[]}`, "created_at": now, "updated_at": now}},
		"attachments": {{"id": "file", "document_id": "page", "filename": "note.txt", "storage_key": "attachments/file_note.txt", "mime_type": "text/plain", "file_size": 5, "uploaded_by": "source-user", "uploaded_at": now}},
		"images":      {{"id": "image", "filename": "image.png", "mime_type": "image/png", "uploaded_by": "source-user", "created_at": now}},
	}}
}
func TestArchiveRoundTripAndPlan(t *testing.T) {
	a := fixture()
	data, err := Encode(a)
	if err != nil {
		t.Fatal(err)
	}
	a, err = Decode(data)
	if err != nil {
		t.Fatal(err)
	}
	p, err := BuildPlan(a, Options{Name: "Restored", Abbreviation: "restored", OwnerID: "local-owner", UserMap: map[string]string{"source-user": "local-author"}})
	if err != nil {
		t.Fatal(err)
	}
	root, child := p.Tables["documents"][0], p.Tables["documents"][1]
	if Text(root, "id") == "page" || Text(child, "parent_id") != Text(root, "id") {
		t.Fatal("IDs/tree not remapped")
	}
	if Text(root, "created_by") != "local-author" {
		t.Fatal("author mapping lost")
	}
	content := Text(root, "content")
	for _, old := range []string{"https://source.test", "authToken", "old-child", "old-slug", `"pageId":"child"`, `"attachmentId":"file"`} {
		if strings.Contains(content, old) {
			t.Fatalf("stale link: %s in %s", old, content)
		}
	}
	if !strings.Contains(content, "page is ordinary text") {
		t.Fatal("free text changed")
	}
	if Text(root, "team_id") != p.Result.TeamID || p.Result.Pages != 2 || len(p.Members) != 2 {
		t.Fatalf("bad plan: %+v", p)
	}
	att := p.Tables["attachments"][0]
	if string(p.Files[Text(att, "storage_key")]) != "hello" {
		t.Fatal("file not copied")
	}
	if len(p.Files) != 2 {
		t.Fatal("image not copied")
	}
	if Text(a.Tables["documents"][0], "id") != "page" {
		t.Fatal("planning modified source")
	}
}
func TestProjectDestination(t *testing.T) {
	a := fixture()
	a.Kind = "project"
	o := Options{Name: "New project", Abbreviation: "new", TeamID: "local-team", OwnerID: "owner"}
	p, err := BuildPlan(a, o)
	if err != nil {
		t.Fatal(err)
	}
	if len(p.Tables["teams"]) != 0 || p.Result.TeamID != "local-team" || p.Result.ProjectID == "" {
		t.Fatal("existing team destination failed")
	}
	if Text(p.Tables["projects"][0], "name") != "New project" {
		t.Fatal("rename lost")
	}
	o.TeamID = ""
	o.TeamName = "New team"
	o.TeamAbbreviation = "new-team"
	p, err = BuildPlan(a, o)
	if err != nil {
		t.Fatal(err)
	}
	if len(p.Tables["teams"]) != 1 || Text(p.Tables["teams"][0], "name") != "New team" {
		t.Fatal("new parent missing")
	}
}

func TestHeroLinksFollowImportedPagesAndImages(t *testing.T) {
	a := fixture()
	a.Tables["documents"][0]["content"] = `{"type":"doc","content":[{"type":"macroBlock","attrs":{"type":"hero","config":{"primaryCtaUrl":"/teams/old-team/p/old-project/docs/child","secondaryCtaUrl":"https://example.com/help","backgroundImage":"/api/images/image/O"}}}]}`
	p, err := BuildPlan(a, Options{Name: "Imported", Abbreviation: "imported", OwnerID: "owner"})
	if err != nil {
		t.Fatal(err)
	}
	content := Text(p.Tables["documents"][0], "content")
	want := "/teams/imported/p/" + Text(p.Tables["projects"][0], "id") + "/docs/" + Text(p.Tables["documents"][1], "id")
	if !strings.Contains(content, want) || !strings.Contains(content, "/api/images/"+Text(p.Tables["images"][0], "id")+"/O") {
		t.Fatal("hero retained source resource links", content)
	}
	if !strings.Contains(content, "https://example.com/help") {
		t.Fatal("external hero link changed")
	}
}
func TestRejectMalformedArchive(t *testing.T) {
	cases := map[string]func(*Archive){
		"format": func(a *Archive) { a.Format = "legacy" }, "scope": func(a *Archive) { a.Kind = "system" }, "arbitrary table": func(a *Archive) { a.Tables["users"] = []Row{{"id": "evil"}} }, "arbitrary column": func(a *Archive) { a.Tables["documents"][0]["embedding"] = "bad" }, "duplicate id": func(a *Archive) { a.Tables["documents"][1]["id"] = "page" }, "missing team": func(a *Archive) { a.Tables["teams"] = nil }, "external team": func(a *Archive) { a.Tables["documents"][0]["team_id"] = "elsewhere" }, "external project": func(a *Archive) { a.Tables["documents"][0]["project_id"] = "elsewhere" }, "cycle": func(a *Archive) { a.Tables["documents"][0]["parent_id"] = "child" }, "missing parent": func(a *Archive) { a.Tables["documents"][0]["parent_id"] = "missing" }, "missing file": func(a *Archive) { delete(a.Files, "attachments/file_note.txt") }, "unexpected file": func(a *Archive) { a.Files["secrets"] = []byte("no") }, "unsafe storage key": func(a *Archive) { a.Tables["attachments"][0]["storage_key"] = "../secret" }, "invalid JSON": func(a *Archive) { a.Tables["documents"][0]["content"] = "bad" }, "missing document": func(a *Archive) { a.Tables["attachments"][0]["document_id"] = "missing" },
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			a := fixture()
			change(a)
			if a.Validate(true) == nil {
				t.Fatal("bad archive accepted")
			}
		})
	}
	for _, entries := range [][]string{{"../scope.json"}, {"scope.json", "scope.json"}, {"database_seed.json"}, {"files/../../secret"}} {
		var b bytes.Buffer
		z := zip.NewWriter(&b)
		for _, name := range entries {
			w, _ := z.Create(name)
			w.Write([]byte("{}"))
		}
		z.Close()
		if _, err := Decode(b.Bytes()); err == nil {
			t.Fatalf("unsafe ZIP accepted: %v", entries)
		}
	}
	if _, err := Decode([]byte("bad")); err == nil {
		t.Fatal("not a ZIP")
	}
}
func TestExportFiltersSnapshot(t *testing.T) {
	a := fixture()
	snapshot := map[string]any{}
	for k, v := range a.Tables {
		snapshot[k] = v
	}
	snapshot["users"] = []Row{{"id": "source-user", "username": "source", "display_name": "Author", "password_hash": "SECRET"}, {"id": "unrelated", "username": "private"}}
	snapshot["team_members"] = []Row{{"team_id": "old-team", "user_id": "source-user"}}
	snapshot["documents"] = append(a.Tables["documents"], Row{"id": "other", "team_id": "other-team"})
	snapshot["integrations"] = []Row{{"credentials": "SECRET"}}
	out, err := FromSnapshot(snapshot, "team", "old-team")
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(out)
	if strings.Contains(string(raw), "SECRET") || len(out.Tables["documents"]) != 2 || len(out.Users) != 1 {
		t.Fatal("unrelated content/credentials exported")
	}
	if _, err := FromSnapshot(snapshot, "project", "old-project"); err != nil {
		t.Fatal(err)
	}
	if _, err := FromSnapshot(snapshot, "team", "missing"); err == nil {
		t.Fatal("missing team accepted")
	}
	if _, err := FromSnapshot(snapshot, "bad", "old-team"); err == nil {
		t.Fatal("invalid scope accepted")
	}
}
func TestInvalidDestination(t *testing.T) {
	for _, o := range []Options{{}, {Name: "New", Abbreviation: "../bad", OwnerID: "owner"}, {Name: "New", Abbreviation: "new", OwnerID: "owner", TeamID: "existing"}, {Name: "New", Abbreviation: "new", OwnerID: "owner", UserMap: map[string]string{"unknown": "user"}}} {
		if _, err := BuildPlan(fixture(), o); err == nil {
			t.Fatalf("invalid options accepted: %+v", o)
		}
	}
}

func TestProjectLibraryWithOmittedTeam(t *testing.T) {
	a := fixture()
	snapshot := map[string]any{}
	for k, v := range a.Tables {
		snapshot[k] = v
	}
	snapshot["library_images"] = []Row{{"id": "library", "image_id": "image", "scope": "project", "project_id": "old-project", "team_id": nil}}
	for _, kind := range []string{"team", "project"} {
		id := "old-team"
		if kind == "project" {
			id = "old-project"
		}
		exported, err := FromSnapshot(snapshot, kind, id)
		if err != nil {
			t.Fatal(err)
		}
		if len(exported.Tables["library_images"]) != 1 || Text(exported.Tables["library_images"][0], "team_id") != "old-team" {
			t.Fatal("project image library was lost")
		}
	}
}
