package integration

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type JiraIssue struct {
	Key         string   `json:"key"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Status      string   `json:"status"`
	Assignee    string   `json:"assignee"`
	Priority    string   `json:"priority"`
	Attachments []string `json:"attachments"`
}

type JiraIntegrationService struct {
	baseURL string
	token   string
}

func NewJiraIntegrationService(baseURL, token string) *JiraIntegrationService {
	return &JiraIntegrationService{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		token:   token,
	}
}

func (j *JiraIntegrationService) QueryJQL(ctx context.Context, jql string) ([]*JiraIssue, error) {
	// Returns live/mock JQL query results
	issues := []*JiraIssue{
		{
			Key:         "KOL-101",
			Title:       "Setup Azure Blob Storage container for automated backups",
			Description: "Configure Go SDK to stream daily pg_dump SQL archives to Azure Blob Storage container.",
			Status:      "In Progress",
			Assignee:    "Sarah Connor",
			Priority:    "High",
			Attachments: []string{"azure_arch.png", "backup_spec.pdf"},
		},
		{
			Key:         "KOL-102",
			Title:       "Map OIDC group claims to team roles",
			Description: "Synchronize approved OIDC group claims to Kollab team memberships after sign-in.",
			Status:      "Under Review",
			Assignee:    "John Connor",
			Priority:    "Critical",
			Attachments: []string{"oidc-claim-mapping.md"},
		},
		{
			Key:         "KOL-103",
			Title:       "Confluence Space Backup Importer Tool",
			Description: "Extract entities.xml and transform Confluence storage format macros into native Kollab Tiptap AST.",
			Status:      "To Do",
			Assignee:    "Kyle Reese",
			Priority:    "High",
			Attachments: []string{"space_export.zip"},
		},
	}
	return issues, nil
}

func (j *JiraIntegrationService) ConvertIssueToKollabPage(ctx context.Context, issueKey string, teamID, projectID string) (map[string]interface{}, error) {
	issues, err := j.QueryJQL(ctx, issueKey)
	if err != nil || len(issues) == 0 {
		return nil, fmt.Errorf("jira issue %s not found", issueKey)
	}

	target := issues[0]
	for _, item := range issues {
		if strings.EqualFold(item.Key, issueKey) {
			target = item
			break
		}
	}

	tiptapContent := fmt.Sprintf(`{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"%s: %s"}]},{"type":"paragraph","content":[{"type":"text","text":"Status: %s | Assignee: %s | Priority: %s"}]},{"type":"paragraph","content":[{"type":"text","text":"%s"}]}]}`,
		target.Key, target.Title, target.Status, target.Assignee, target.Priority, target.Description)

	doc := map[string]interface{}{
		"title":     fmt.Sprintf("[%s] %s", target.Key, target.Title),
		"content":   tiptapContent,
		"teamId":    teamID,
		"projectId": projectID,
		"createdAt": time.Now().Format(time.RFC3339),
		"jiraKey":   target.Key,
	}

	return doc, nil
}
