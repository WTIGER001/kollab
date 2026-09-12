package transfer

import (
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

type Plan struct {
	Tables  map[string][]Row
	Files   map[string][]byte
	Result  Result
	Members []string
	OwnerID string
}

var abbreviation = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`)

func ValidateOptions(a *Archive, o Options) error {
	if strings.TrimSpace(o.Name) == "" || len(o.Name) > 255 || !abbreviation.MatchString(o.Abbreviation) {
		return fmt.Errorf("enter a name and an abbreviation of 1–64 letters, numbers, underscores or hyphens")
	}
	if o.OwnerID == "" {
		return fmt.Errorf("choose a local owner")
	}
	if a.Kind == "team" && o.TeamID != "" {
		return fmt.Errorf("team archives must create a new team")
	}
	if a.Kind == "project" && o.TeamID == "" && (strings.TrimSpace(o.TeamName) == "" || len(o.TeamName) > 255 || !abbreviation.MatchString(o.TeamAbbreviation)) {
		return fmt.Errorf("enter the new parent team's name and abbreviation")
	}
	known := map[string]bool{}
	for _, u := range a.Users {
		known[u.ID] = true
	}
	for u := range o.UserMap {
		if !known[u] {
			return fmt.Errorf("unknown source user in mapping")
		}
	}
	return nil
}
func BuildPlan(a *Archive, o Options) (*Plan, error) {
	if err := a.Validate(true); err != nil {
		return nil, err
	}
	if err := ValidateOptions(a, o); err != nil {
		return nil, err
	}
	// Clone metadata: preview/export must never be modified by planning.
	raw, _ := json.Marshal(a)
	b := &Archive{}
	json.Unmarshal(raw, b)
	p := &Plan{Tables: b.Tables, Files: map[string][]byte{}, OwnerID: o.OwnerID}
	ids := map[string]map[string]string{}
	for t, rows := range b.Tables {
		ids[t] = map[string]string{}
		for _, r := range rows {
			if old := Text(r, "id"); old != "" {
				prefix := ""
				if t == "teams" {
					prefix = "team_"
				}
				if t == "projects" {
					prefix = "proj_"
				}
				ids[t][old] = prefix + uuid.NewString()
			}
		}
	}
	oldTeam := Text(b.Tables["teams"][0], "id")
	teamID := ids["teams"][oldTeam]
	if o.TeamID != "" {
		teamID = o.TeamID
		ids["teams"][oldTeam] = teamID
	}
	p.Result.TeamID = teamID
	oldTeamAbbr := Text(b.Tables["teams"][0], "abbreviation")
	newTeamAbbr := o.Abbreviation
	if b.Kind == "project" {
		newTeamAbbr = o.TeamAbbreviation
	}
	if o.TeamID != "" {
		newTeamAbbr = o.TeamID
	}
	projectAbbr := map[string]string{}
	for _, r := range b.Tables["projects"] {
		old := Text(r, "id")
		projectAbbr[Text(r, "abbreviation")] = ids["projects"][old]
		if b.Kind == "project" {
			r["name"] = strings.TrimSpace(o.Name)
			r["abbreviation"] = o.Abbreviation
			p.Result.ProjectID = ids["projects"][old]
		}
	}
	if b.Kind == "team" {
		b.Tables["teams"][0]["name"] = strings.TrimSpace(o.Name)
		b.Tables["teams"][0]["abbreviation"] = o.Abbreviation
	} else {
		b.Tables["teams"][0]["name"] = strings.TrimSpace(o.TeamName)
		b.Tables["teams"][0]["abbreviation"] = o.TeamAbbreviation
	}
	// Team/project landing documents intentionally share the container's ID.
	slugs := map[string]string{}
	for _, r := range b.Tables["documents"] {
		old := Text(r, "id")
		if v := ids["teams"][old]; v != "" {
			if o.TeamID != "" {
				return nil, fmt.Errorf("project archive cannot replace a team landing page")
			}
			ids["documents"][old] = v
		}
		if v := ids["projects"][old]; v != "" {
			ids["documents"][old] = v
		}
		if slug := Text(r, "slug"); slug != "" {
			slugs[slug] = ids["documents"][old]
		}
		r["slug"] = ids["documents"][old]
		r["inheritance_broken"] = false
	}
	mapUser := func(old string) string {
		if id := o.UserMap[old]; id != "" {
			return id
		}
		return o.OwnerID
	}
	members := map[string]bool{o.OwnerID: true}
	if o.TeamID == "" && o.ActorID != "" {
		members[o.ActorID] = true
	}
	for _, u := range b.Users {
		if u.Member && o.UserMap[u.ID] != "" {
			members[o.UserMap[u.ID]] = true
		}
	}
	for id := range members {
		p.Members = append(p.Members, id)
	}
	rewriteURL := func(value string) string {
		u, err := url.Parse(value)
		if err != nil {
			return value
		}
		parts := strings.Split(u.Path, "/")
		changed := false
		for i := 1; i < len(parts); i++ {
			var replacement string
			switch parts[i-1] {
			case "images":
				if i >= 2 && parts[i-2] == "api" {
					replacement = ids["images"][parts[i]]
				}
			case "attachments":
				if i >= 2 && parts[i-2] == "api" {
					replacement = ids["attachments"][parts[i]]
				}
			case "teams":
				if parts[i] == oldTeam || parts[i] == oldTeamAbbr {
					replacement = newTeamAbbr
					if replacement == "" {
						replacement = teamID
					}
				}
			case "p":
				replacement = ids["projects"][parts[i]]
				if replacement == "" {
					replacement = projectAbbr[parts[i]]
				}
			case "docs":
				replacement = ids["documents"][parts[i]]
				if replacement == "" {
					replacement = slugs[parts[i]]
				}
			}
			if replacement != "" {
				parts[i] = replacement
				changed = true
			}
		}
		if changed {
			u.Scheme = ""
			u.Host = ""
			u.User = nil
			u.Path = strings.Join(parts, "/")
			u.RawPath = ""
			q := u.Query()
			q.Del("authToken")
			q.Del("mediaToken")
			u.RawQuery = q.Encode()
			return u.String()
		}
		return value
	}
	var walk func(any, string) any
	walk = func(v any, key string) any {
		switch x := v.(type) {
		case map[string]any:
			for k, v := range x {
				x[k] = walk(v, k)
			}
			return x
		case []any:
			for i, v := range x {
				x[i] = walk(v, key)
			}
			return x
		case string:
			table := map[string]string{"documentId": "documents", "docId": "documents", "pageId": "documents", "targetId": "documents", "imageId": "images", "attachmentId": "attachments", "teamId": "teams", "projectId": "projects"}[key]
			if table != "" {
				if replacement := ids[table][x]; replacement != "" {
					return replacement
				}
			}
			if key == "href" || key == "src" || key == "url" || key == "logo_url" || key == "primaryCtaUrl" || key == "secondaryCtaUrl" || key == "backgroundImage" {
				return rewriteURL(x)
			}
			return x
		default:
			return v
		}
	}
	for t, rows := range b.Tables {
		for _, r := range rows {
			oldID := Text(r, "id")
			if oldID != "" {
				r["id"] = ids[t][oldID]
			}
			for col, target := range map[string]string{"team_id": "teams", "project_id": "projects", "document_id": "documents", "version_id": "document_versions", "image_id": "images", "tag_id": "tags"} {
				if old := Text(r, col); old != "" {
					r[col] = ids[target][old]
				}
			}
			if old := Text(r, "parent_id"); old != "" {
				r["parent_id"] = ids[t][old]
			}
			for _, col := range []string{"created_by", "updated_by", "uploaded_by", "published_by", "user_id"} {
				if _, exists := r[col]; exists {
					r[col] = mapUser(Text(r, col))
				}
			}
			if t == "comments" {
				r["created_name"] = "Imported author"
			}
			if s := Text(r, "content"); s != "" {
				var v any
				if json.Unmarshal([]byte(s), &v) == nil {
					v = walk(v, "")
					encoded, _ := json.Marshal(v)
					r["content"] = string(encoded)
				}
			}
			if s := Text(r, "logo_url"); s != "" {
				r["logo_url"] = rewriteURL(s)
			}
			if t == "attachments" {
				oldKey := Text(r, "storage_key")
				newKey := "attachments/" + Text(r, "id") + "_" + url.PathEscape(Text(r, "filename"))
				if len(newKey) > 255 {
					newKey = "attachments/" + Text(r, "id")
				}
				r["storage_key"] = newKey
				r["file_size"] = len(a.Files[oldKey])
				p.Files[newKey] = a.Files[oldKey]
			}
			if t == "images" {
				ext := "." + ImageExtension(Text(r, "mime_type"))
				for _, size := range []string{"original", "300", "600", "900", "1200"} {
					if data, ok := a.Files[oldID+"_"+size+ext]; ok {
						p.Files[Text(r, "id")+"_"+size+ext] = data
					}
				}
			}
		}
	}
	if o.TeamID != "" {
		p.Tables["teams"] = nil
	}
	p.Result.Pages = len(b.Tables["documents"])
	return p, nil
}
