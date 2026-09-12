package handler

import (
	"encoding/json"
	"github.com/go-chi/chi/v5"
	"gitlab.com/gitlab-org/api/client-go"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

func (h *IntegrationHandler) ProxyGitLabIssue(w http.ResponseWriter, r *http.Request) {
	integration, err := h.service.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil || integration == nil {
		http.Error(w, "Connection not found", 404)
		return
	}
	if !integrationAccess(w, r, string(integration.Scope), integration.EntityID, "read") {
		return
	}
	if integration.Provider != "gitlab" {
		http.Error(w, "Select a GitLab connection", 400)
		return
	}
	base, err := url.Parse(strings.TrimSuffix(integration.URL, "/"))
	if err != nil || base.Host == "" {
		http.Error(w, "Connection URL is invalid", 400)
		return
	}
	issueURL, err := url.Parse(r.URL.Query().Get("url"))
	if err != nil || issueURL.Host != base.Host || issueURL.Scheme != base.Scheme {
		http.Error(w, "Issue URL must belong to the selected connection", 400)
		return
	}
	project, iidStr, ok := strings.Cut(strings.TrimPrefix(strings.TrimPrefix(issueURL.Path, base.Path), "/"), "/-/issues/")
	iid, err := strconv.Atoi(strings.TrimSuffix(iidStr, "/"))
	if !ok || project == "" || err != nil || iid <= 0 {
		http.Error(w, "Use a GitLab issue URL", 400)
		return
	}
	client, err := gitlab.NewClient(integration.Credentials["token"], gitlab.WithBaseURL(base.String()), gitlab.WithHTTPClient(gitLabHTTPClient()))
	if err != nil {
		http.Error(w, "Unable to initialize connection", 500)
		return
	}
	issue, _, err := client.Issues.GetIssue(project, int64(iid), gitlab.WithContext(r.Context()))
	if err != nil {
		http.Error(w, "GitLab could not return this issue. Check connection credentials and project access.", 502)
		return
	}
	assignee, creator, priority := "Unassigned", "", "None"
	if issue.Assignee != nil {
		assignee = issue.Assignee.Name
	}
	if issue.Author != nil {
		creator = issue.Author.Name
	}
	for _, label := range issue.Labels {
		if strings.HasPrefix(label, "Priority::") {
			priority = strings.TrimPrefix(label, "Priority::")
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"source": "gitlab", "key": project + "#" + strconv.Itoa(iid), "title": issue.Title, "description": issue.Description, "status": issue.State, "assignee": assignee, "creator": creator, "priority": priority, "attachments": []any{}})
}
