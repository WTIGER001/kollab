package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"gitlab.com/gitlab-org/api/client-go"
)

func (h *IntegrationHandler) ProxyGitLabIssues(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	projectId := r.URL.Query().Get("projectId")
	labels := r.URL.Query().Get("labels")

	if id == "" || projectId == "" {
		http.Error(w, "Integration ID and projectId are required", http.StatusBadRequest)
		return
	}

	// Fetch integration to get the token
	integration, err := h.service.GetByID(r.Context(), id)
	if err != nil || integration == nil {
		http.Error(w, "Integration not found", http.StatusNotFound)
		return
	}

	if integration.Provider != "gitlab" {
		http.Error(w, "Integration is not a GitLab provider", http.StatusBadRequest)
		return
	}

	token := ""
	if integration.Credentials != nil {
		if t, ok := integration.Credentials["token"]; ok {
			token = t
		}
	}

	if token == "" {
		http.Error(w, "No token found for integration", http.StatusInternalServerError)
		return
	}

	baseURL := integration.URL
	if baseURL == "" {
		baseURL = "https://gitlab.com"
	}
	baseURL = strings.TrimSuffix(baseURL, "/")

	client, err := gitlab.NewClient(token, gitlab.WithBaseURL(baseURL))
	if err != nil {
		http.Error(w, "Failed to initialize GitLab client", http.StatusInternalServerError)
		return
	}

	var parsedLabels []string
	if labels != "" {
		parsedLabels = strings.Split(labels, ",")
		for i := range parsedLabels {
			parsedLabels[i] = strings.TrimSpace(parsedLabels[i])
		}
	}

	state := "opened"
	var gitlabIssues []*gitlab.Issue

	// Attempt to fetch as Project Issues first
	opt := &gitlab.ListProjectIssuesOptions{
		State: &state,
	}
	if len(parsedLabels) > 0 {
		lbls := gitlab.LabelOptions(parsedLabels)
		opt.Labels = &lbls
	}

	gitlabIssues, resp, err := client.Issues.ListProjectIssues(projectId, opt, gitlab.WithContext(r.Context()))

	// If 404 Not Found, fallback to Group Issues
	if err != nil && resp != nil && resp.StatusCode == http.StatusNotFound {
		groupOpt := &gitlab.ListGroupIssuesOptions{
			State: &state,
		}
		if len(parsedLabels) > 0 {
			lbls := gitlab.LabelOptions(parsedLabels)
			groupOpt.Labels = &lbls
		}
		gitlabIssues, resp, err = client.Issues.ListGroupIssues(projectId, groupOpt, gitlab.WithContext(r.Context()))
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch GitLab issues: %v", err), http.StatusBadGateway)
		return
	}

	// Map to our simplified issue format
	mappedIssues := make([]map[string]interface{}, 0)
	for _, issue := range gitlabIssues {
		key := fmt.Sprintf("%v", issue.IID)
		if issue.References != nil && issue.References.Short != "" {
			key = issue.References.Short
		}

		title := issue.Title
		status := "Open"
		if issue.State != "" {
			status = issue.State
		}

		assigneeName := "Unassigned"
		if issue.Assignee != nil && issue.Assignee.Name != "" {
			assigneeName = issue.Assignee.Name
		}

		priority := "None"
		for _, l := range issue.Labels {
			if strings.HasPrefix(l, "Priority::") {
				priority = strings.TrimPrefix(l, "Priority::")
				break
			}
		}

		mappedIssues = append(mappedIssues, map[string]interface{}{
			"key":      key,
			"title":    title,
			"status":   status,
			"assignee": assigneeName,
			"priority": priority,
		})
	}

	payload := map[string]interface{}{
		"source": "gitlab",
		"issues": mappedIssues,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payload)
}
