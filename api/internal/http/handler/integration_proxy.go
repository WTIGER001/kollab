package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

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

	if !integrationAccess(w, r, string(integration.Scope), integration.EntityID, "read") {
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

	client, err := gitlab.NewClient(token, gitlab.WithBaseURL(baseURL), gitlab.WithHTTPClient(gitLabHTTPClient()))
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

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	gitlabIssues, err := fetchGitLabIssues(ctx, client, projectId, parsedLabels)
	if err != nil {
		http.Error(w, "GitLab could not return all matching issues. Check the connection or narrow the labels filter.", http.StatusBadGateway)
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

// A configured provider may be internal, but redirects must never forward its
// private token to a different origin.
func gitLabHTTPClient() *http.Client {
	return &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return fmt.Errorf("too many provider redirects")
		}
		original := via[0].URL
		if req.URL.Scheme != original.Scheme || req.URL.Host != original.Host {
			return fmt.Errorf("provider redirect changed origin")
		}
		return nil
	}}
}

func fetchGitLabIssues(ctx context.Context, client *gitlab.Client, project string, labels []string) ([]*gitlab.Issue, error) {
	state := "opened"
	lbls := gitlab.LabelOptions(labels)
	var issues []*gitlab.Issue
	group := false
	page := int64(1)
	for count := 0; count < 100; count++ {
		options := gitlab.ListOptions{Page: page, PerPage: 100}
		var batch []*gitlab.Issue
		var response *gitlab.Response
		var err error
		if !group {
			batch, response, err = client.Issues.ListProjectIssues(project, &gitlab.ListProjectIssuesOptions{ListOptions: options, State: &state, Labels: &lbls}, gitlab.WithContext(ctx))
			if err != nil && response != nil && response.StatusCode == http.StatusNotFound && page == 1 {
				group = true
			}
		}
		if group {
			batch, response, err = client.Issues.ListGroupIssues(project, &gitlab.ListGroupIssuesOptions{ListOptions: options, State: &state, Labels: &lbls}, gitlab.WithContext(ctx))
		}
		if err != nil {
			return nil, err
		}
		issues = append(issues, batch...)
		if response == nil || response.NextPage == 0 {
			return issues, nil
		}
		if response.NextPage <= page {
			return nil, fmt.Errorf("invalid provider pagination")
		}
		page = response.NextPage
	}
	return nil, fmt.Errorf("issue result exceeds 100 pages")
}
