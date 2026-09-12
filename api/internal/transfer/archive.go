// Package transfer defines portable, additive team/project archives. It never
// carries account credentials, permission grants, or installation configuration.
package transfer

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"path"
	"regexp"
	"sort"
	"strings"
	"time"
)

const Format = "kollab.scope.v1"
const MaxBytes = 256 << 20

type Row map[string]any
type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
	Member   bool   `json:"member"`
}
type Archive struct {
	Format    string            `json:"format"`
	Kind      string            `json:"kind"`
	CreatedAt time.Time         `json:"createdAt"`
	Tables    map[string][]Row  `json:"tables"`
	Users     []User            `json:"users"`
	Files     map[string][]byte `json:"-"`
}
type Options struct {
	ActorID          string            `json:"-"`
	Name             string            `json:"name"`
	Abbreviation     string            `json:"abbreviation"`
	TeamID           string            `json:"teamId"`
	TeamName         string            `json:"teamName"`
	TeamAbbreviation string            `json:"teamAbbreviation"`
	OwnerID          string            `json:"ownerId"`
	UserMap          map[string]string `json:"userMap"`
}
type Result struct {
	TeamID    string `json:"teamId"`
	ProjectID string `json:"projectId,omitempty"`
	Pages     int    `json:"pages"`
}

// Explicit columns prevent new schema fields (especially secrets) from silently
// becoming portable, and prevent untrusted archive rows setting local flags.
var Columns = map[string]string{
	"teams":                 "id name abbreviation description logo_url",
	"projects":              "id name team_id abbreviation description logo_url",
	"documents":             "id title content project_id team_id parent_id created_at updated_at created_by updated_by deleted_at slug classification inheritance_broken",
	"document_versions":     "id document_id content version_number created_by change_summary created_at",
	"comments":              "id document_id parent_id anchor_id content created_by created_name created_at updated_at",
	"attachments":           "id document_id filename mime_type file_size storage_key uploaded_by uploaded_at",
	"images":                "id filename mime_type original_width original_height created_at uploaded_by",
	"document_properties":   "document_id property_key property_value value_type updated_at",
	"document_reviews":      "document_id review_status next_review_at updated_by updated_at",
	"document_publications": "document_id version_id published_by published_at",
	"tasks":                 "id document_id content assignee due_date completed created_at updated_at",
	"tags":                  "id name description color created_at",
	"document_tags":         "document_id tag_id",
	"templates":             "id title description content scope template_type team_id user_id created_at",
	"library_images":        "id image_id display_name scope team_id project_id user_id size_bytes created_at",
}
var Order = []string{"teams", "projects", "documents", "document_versions", "comments", "attachments", "images", "document_properties", "document_reviews", "document_publications", "tasks", "tags", "document_tags", "templates", "library_images"}

func Text(r Row, key string) string { s, _ := r[key].(string); return s }
func Project(a *Archive) Row {
	if a.Kind == "project" && len(a.Tables["projects"]) == 1 {
		return a.Tables["projects"][0]
	}
	return nil
}
func Scope(a *Archive) Row {
	if p := Project(a); p != nil {
		return p
	}
	if len(a.Tables["teams"]) == 1 {
		return a.Tables["teams"][0]
	}
	return nil
}
func Clean(table string, r Row) Row {
	out := Row{}
	for _, k := range strings.Fields(Columns[table]) {
		if v, ok := r[k]; ok {
			out[k] = v
		}
	}
	return out
}

var media = regexp.MustCompile(`/api/images/([A-Za-z0-9_-]+)`)
var safeID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,255}$`)

func ValidKey(k string) bool {
	return k != "" && !strings.Contains(k, "\\") && !strings.HasPrefix(k, "/") && path.Clean(k) == k && k != ".." && !strings.HasPrefix(k, "../")
}
func ImageExtension(mime string) string {
	switch mime {
	case "image/png":
		return "png"
	case "image/gif":
		return "gif"
	case "image/webp":
		return "webp"
	case "image/avif":
		return "avif"
	case "image/svg+xml":
		return "svg"
	default:
		return "jpg"
	}
}

// FromSnapshot selects only the requested scope and its durable content records.
func FromSnapshot(snapshot map[string]any, kind, id string) (*Archive, error) {
	if kind != "team" && kind != "project" {
		return nil, fmt.Errorf("choose a team or project")
	}
	all := map[string][]Row{}
	for table := range Columns {
		raw, err := json.Marshal(snapshot[table])
		if err != nil {
			return nil, err
		}
		var rows []Row
		if err = json.Unmarshal(raw, &rows); err != nil {
			return nil, err
		}
		all[table] = rows
	}
	teamID := id
	if kind == "project" {
		teamID = ""
		for _, r := range all["projects"] {
			if Text(r, "id") == id {
				teamID = Text(r, "team_id")
			}
		}
	}
	a := &Archive{Format: Format, Kind: kind, CreatedAt: time.Now().UTC(), Tables: map[string][]Row{}, Users: []User{}, Files: map[string][]byte{}}
	add := func(t string, r Row) { a.Tables[t] = append(a.Tables[t], Clean(t, r)) }
	for _, r := range all["teams"] {
		if Text(r, "id") == teamID {
			add("teams", r)
		}
	}
	if len(a.Tables["teams"]) != 1 || strings.HasPrefix(teamID, "personal_") {
		return nil, fmt.Errorf("team or project not found, or is a personal space")
	}
	projects := map[string]bool{}
	docs := map[string]bool{}
	images := map[string]bool{}
	tags := map[string]bool{}
	users := map[string]bool{}
	members := map[string]bool{}
	for _, r := range all["projects"] {
		if Text(r, "team_id") == teamID && (kind == "team" || Text(r, "id") == id) {
			add("projects", r)
			projects[Text(r, "id")] = true
		}
	}
	for _, r := range all["documents"] {
		if Text(r, "team_id") == teamID && (kind == "team" || Text(r, "project_id") == id) {
			add("documents", r)
			docs[Text(r, "id")] = true
		}
	}
	for _, t := range []string{"document_versions", "comments", "attachments", "document_properties", "document_reviews", "document_publications", "tasks", "document_tags"} {
		for _, r := range all[t] {
			if docs[Text(r, "document_id")] {
				add(t, r)
				if t == "document_tags" {
					tags[Text(r, "tag_id")] = true
				}
			}
		}
	}
	for _, r := range all["tags"] {
		if tags[Text(r, "id")] {
			add("tags", r)
		}
	}
	if kind == "team" {
		for _, r := range all["templates"] {
			if Text(r, "team_id") == teamID && Text(r, "scope") == "team" {
				add("templates", r)
			}
		}
	}
	for _, r := range all["library_images"] {
		if (kind == "team" && Text(r, "scope") == "team" && Text(r, "team_id") == teamID) || (Text(r, "scope") == "project" && projects[Text(r, "project_id")]) {
			row := Clean("library_images", r)
			// Project image-library records may omit the denormalized team ID.
			row["team_id"] = teamID
			add("library_images", row)
			images[Text(r, "image_id")] = true
		}
	}
	for _, rows := range a.Tables {
		for _, r := range rows {
			for _, k := range []string{"content", "logo_url"} {
				if k == "content" {
					var content any
					if json.Unmarshal([]byte(Text(r, k)), &content) == nil {
						collectImageIDs(content, images)
					}
				}
				for _, m := range media.FindAllStringSubmatch(Text(r, k), -1) {
					images[m[1]] = true
				}
			}
		}
	}
	for _, r := range all["images"] {
		if images[Text(r, "id")] {
			add("images", r)
			delete(images, Text(r, "id"))
		}
	}
	if len(images) > 0 {
		return nil, fmt.Errorf("a referenced image is missing; repair it before export")
	}
	// A project's parent outside the package becomes a root page.
	for _, r := range a.Tables["documents"] {
		if !docs[Text(r, "parent_id")] {
			r["parent_id"] = nil
		}
	}
	raw, _ := json.Marshal(snapshot["team_members"])
	var membership []Row
	json.Unmarshal(raw, &membership)
	for _, r := range membership {
		if Text(r, "team_id") == teamID {
			users[Text(r, "user_id")] = true
			members[Text(r, "user_id")] = true
		}
	}
	for _, rows := range a.Tables {
		for _, r := range rows {
			for _, k := range []string{"created_by", "updated_by", "uploaded_by", "published_by", "user_id"} {
				if u := Text(r, k); u != "" {
					users[u] = true
				}
			}
		}
	}
	raw, _ = json.Marshal(snapshot["users"])
	var identities []Row
	json.Unmarshal(raw, &identities)
	for _, r := range identities {
		if users[Text(r, "id")] {
			a.Users = append(a.Users, User{Text(r, "id"), Text(r, "username"), Text(r, "display_name"), members[Text(r, "id")]})
		}
	}
	sort.Slice(a.Users, func(i, j int) bool { return a.Users[i].Username < a.Users[j].Username })
	return a, a.Validate(false)
}

func (a *Archive) Validate(files bool) error {
	if a.Format != Format || (a.Kind != "team" && a.Kind != "project") || len(a.Tables["teams"]) != 1 || (a.Kind == "project" && len(a.Tables["projects"]) != 1) {
		return fmt.Errorf("use a Kollab team/project transfer ZIP (v1); full-server and legacy backups are not supported here")
	}
	ids := map[string]map[string]bool{}
	total := 0
	for t, rows := range a.Tables {
		cols, ok := Columns[t]
		if !ok {
			return fmt.Errorf("unsupported archive table %s", t)
		}
		allowed := map[string]bool{}
		for _, c := range strings.Fields(cols) {
			allowed[c] = true
		}
		ids[t] = map[string]bool{}
		for _, r := range rows {
			total++
			for k := range r {
				if !allowed[k] {
					return fmt.Errorf("unsupported field %s.%s", t, k)
				}
			}
			if allowed["id"] {
				id := Text(r, "id")
				if !safeID.MatchString(id) || ids[t][id] {
					return fmt.Errorf("invalid or duplicate %s ID", t)
				}
				ids[t][id] = true
			}
		}
	}
	if total > 100000 {
		return fmt.Errorf("archive exceeds 100,000 records")
	}
	teamID := Text(a.Tables["teams"][0], "id")
	if strings.HasPrefix(teamID, "personal_") {
		return fmt.Errorf("personal spaces cannot be imported here")
	}
	for _, t := range []string{"projects", "documents", "templates", "library_images"} {
		for _, r := range a.Tables[t] {
			if Text(r, "team_id") != teamID {
				return fmt.Errorf("%s refers to a team outside the archive", t)
			}
			if p := Text(r, "project_id"); p != "" && !ids["projects"][p] {
				return fmt.Errorf("project outside archive")
			}
		}
	}
	for _, r := range a.Tables["documents"] {
		if a.Kind == "project" && Text(r, "project_id") != Text(Project(a), "id") {
			return fmt.Errorf("page outside selected project")
		}
	}
	for t, rows := range a.Tables {
		for _, r := range rows {
			for col, target := range map[string]string{"document_id": "documents", "version_id": "document_versions", "tag_id": "tags", "image_id": "images"} {
				if _, ok := r[col]; ok && !ids[target][Text(r, col)] {
					return fmt.Errorf("%s has a missing %s", t, col)
				}
			}
		}
	}
	for _, t := range []string{"documents", "comments"} {
		parents := map[string]string{}
		for _, r := range a.Tables[t] {
			id, p := Text(r, "id"), Text(r, "parent_id")
			if p != "" && !ids[t][p] {
				return fmt.Errorf("missing %s parent", t)
			}
			parents[id] = p
		}
		complete := map[string]bool{}
		for id := range parents {
			seen := map[string]bool{}
			for p := id; p != "" && !complete[p]; p = parents[p] {
				if seen[p] {
					return fmt.Errorf("cyclic %s hierarchy", t)
				}
				seen[p] = true
			}
			for p := range seen {
				complete[p] = true
			}
		}
	}

	byID := map[string]map[string]Row{}
	for table, rows := range a.Tables {
		byID[table] = map[string]Row{}
		for _, row := range rows {
			byID[table][Text(row, "id")] = row
		}
	}
	for _, row := range a.Tables["documents"] {
		if parent := Text(row, "parent_id"); parent != "" && Text(byID["documents"][parent], "project_id") != Text(row, "project_id") {
			return fmt.Errorf("page parent belongs to another space")
		}
	}
	for _, row := range a.Tables["comments"] {
		if parent := Text(row, "parent_id"); parent != "" && Text(byID["comments"][parent], "document_id") != Text(row, "document_id") {
			return fmt.Errorf("comment parent belongs to another page")
		}
	}
	for _, row := range a.Tables["document_publications"] {
		if Text(byID["document_versions"][Text(row, "version_id")], "document_id") != Text(row, "document_id") {
			return fmt.Errorf("published version belongs to another page")
		}
	}
	for _, row := range a.Tables["templates"] {
		if a.Kind != "team" || Text(row, "scope") != "team" {
			return fmt.Errorf("only team templates may be transferred")
		}
	}
	for _, row := range a.Tables["library_images"] {
		scope := Text(row, "scope")
		if (scope != "team" && scope != "project") || (a.Kind == "project" && scope != "project") {
			return fmt.Errorf("image library outside selected scope")
		}
	}
	userIDs := map[string]bool{}
	for _, u := range a.Users {
		if !safeID.MatchString(u.ID) || userIDs[u.ID] {
			return fmt.Errorf("invalid or duplicate source user")
		}
		userIDs[u.ID] = true
	}
	for _, r := range a.Tables["documents"] {
		var content map[string]any
		if json.Unmarshal([]byte(Text(r, "content")), &content) != nil || content["type"] != "doc" {
			return fmt.Errorf("invalid page content")
		}
	}
	if files {
		expected := map[string]bool{}
		for _, r := range a.Tables["attachments"] {
			k := Text(r, "storage_key")
			if !ValidKey(k) {
				return fmt.Errorf("unsafe attachment path")
			}
			expected[k] = true
		}
		for _, r := range a.Tables["images"] {
			prefix := Text(r, "id") + "_"
			ext := "." + ImageExtension(Text(r, "mime_type"))
			expected[prefix+"original"+ext] = true
			for _, size := range []string{"300", "600", "900", "1200"} {
				if _, ok := a.Files[prefix+size+ext]; ok {
					expected[prefix+size+ext] = true
				}
			}
		}
		for k := range expected {
			if _, ok := a.Files[k]; !ok {
				return fmt.Errorf("archive is missing file %s", k)
			}
		}
		for k := range a.Files {
			if !expected[k] {
				return fmt.Errorf("unexpected archive file %s", k)
			}
		}
	}
	return nil
}
func Decode(data []byte) (*Archive, error) {
	if len(data) > MaxBytes {
		return nil, fmt.Errorf("archive exceeds 256 MiB")
	}
	z, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("invalid ZIP")
	}
	a := &Archive{}
	files := map[string][]byte{}
	seen := map[string]bool{}
	var total uint64
	if len(z.File) > 100000 {
		return nil, fmt.Errorf("too many ZIP entries")
	}
	for _, f := range z.File {
		if !ValidKey(f.Name) || !f.Mode().IsRegular() || f.FileInfo().IsDir() || seen[f.Name] {
			return nil, fmt.Errorf("unsafe or duplicate ZIP entry")
		}
		seen[f.Name] = true
		total += f.UncompressedSize64
		if total > MaxBytes {
			return nil, fmt.Errorf("expanded archive exceeds 256 MiB")
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		b, err := io.ReadAll(io.LimitReader(rc, MaxBytes+1))
		rc.Close()
		if err != nil || len(b) > MaxBytes {
			return nil, fmt.Errorf("corrupt or oversized entry")
		}
		if f.Name == "scope.json" {
			d := json.NewDecoder(bytes.NewReader(b))
			d.DisallowUnknownFields()
			if err = d.Decode(a); err != nil {
				return nil, fmt.Errorf("invalid scope manifest: %w", err)
			}
		} else if strings.HasPrefix(f.Name, "files/") {
			files[strings.TrimPrefix(f.Name, "files/")] = b
		} else {
			return nil, fmt.Errorf("unexpected ZIP entry")
		}
	}
	a.Files = files
	return a, a.Validate(true)
}
func Encode(a *Archive) ([]byte, error) {
	if err := a.Validate(true); err != nil {
		return nil, err
	}
	var b bytes.Buffer
	z := zip.NewWriter(&b)
	raw, err := json.Marshal(a)
	if err != nil {
		return nil, err
	}
	entries := map[string][]byte{"scope.json": raw}
	for k, v := range a.Files {
		entries["files/"+k] = v
	}
	size := 0
	for k, v := range entries {
		size += len(v)
		if size > MaxBytes {
			return nil, fmt.Errorf("archive exceeds 256 MiB")
		}
		w, err := z.Create(k)
		if err != nil {
			return nil, err
		}
		if _, err = w.Write(v); err != nil {
			return nil, err
		}
	}
	if err = z.Close(); err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}

func collectImageIDs(v any, ids map[string]bool) {
	switch x := v.(type) {
	case map[string]any:
		for k, child := range x {
			if k == "imageId" {
				if id, ok := child.(string); ok && id != "" {
					ids[id] = true
				}
			}
			collectImageIDs(child, ids)
		}
	case []any:
		for _, child := range x {
			collectImageIDs(child, ids)
		}
	}
}
