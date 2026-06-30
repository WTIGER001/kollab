package document

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"arkollab/api/internal/ai"
	"arkollab/api/internal/domain"
	"arkollab/api/internal/permissions"
	goperm "github.com/wtiger001/go-permissions"
)

type DocumentService struct {
	repo          domain.DocumentRepository
	systemService domain.SystemService
	taskRepo      domain.TaskRepository
	aiClient      domain.LLMClient
}

func NewDocumentService(repo domain.DocumentRepository, systemService domain.SystemService, taskRepo domain.TaskRepository) *DocumentService {
	return &DocumentService{
		repo:          repo,
		systemService: systemService,
		taskRepo:      taskRepo,
		aiClient:      ai.NewLLMClient(),
	}
}

func (s *DocumentService) GetDocument(ctx context.Context, id string) (*domain.Document, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *DocumentService) ListDocumentsByProject(ctx context.Context, projectId string) ([]*domain.Document, error) {
	if projectId == "" {
		return nil, errors.New("projectId is required")
	}
	return s.repo.GetByProjectID(ctx, projectId)
}

func (s *DocumentService) ListDocumentsByTeam(ctx context.Context, teamId string) ([]*domain.Document, error) {
	if teamId == "" {
		return nil, errors.New("teamId is required")
	}
	return s.repo.GetByTeamID(ctx, teamId)
}

func (s *DocumentService) CreateDocument(ctx context.Context, title string, projectId string, teamId string, parentId *string, userID string) (*domain.Document, error) {
	if title == "" {
		return nil, errors.New("title is required")
	}
	if teamId == "" && projectId == "" {
		return nil, errors.New("either teamId or projectId is required")
	}

	doc := &domain.Document{
		ID:          newUUID(),
		Title:       title,
		Content:     `{"type":"doc","content":[{"type":"paragraph"}]}`, // Default blank content
		ProjectID:   projectId,
		TeamID:      teamId,
		ParentID:    parentId,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CreatedByID: userID,
		UpdatedByID: userID,
	}

	if err := s.repo.Create(ctx, doc); err != nil {
		return nil, err
	}
	if userID != "" && permissions.DocumentPermissions != nil {
		_ = permissions.DocumentPermissions.GrantRole(ctx, "role.wiki.document.owner", goperm.PrincipalUser, userID, doc.ID)
	}
	if s.systemService != nil {
		_ = s.systemService.RecordAuditLog(ctx, doc.ID, userID, "edit")
	}
	return s.repo.GetByID(ctx, doc.ID)
}

func (s *DocumentService) UpdateDocument(ctx context.Context, id string, title string, content string, userID string, changeSummary string) (*domain.Document, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 1. Version Snapshotting Check
	// Fetch the latest version snapshot of the document
	latest, err := s.repo.GetLatestVersion(ctx, id)
	if err != nil {
		return nil, err
	}

	// We snapshot the PREVIOUS state of the document so we capture the history before this save.
	versionNum := 1
	if latest != nil {
		versionNum = latest.VersionNumber + 1
	}

	var createdBy *string
	if userID != "" {
		createdBy = &userID
	}

	if changeSummary != "" {
		// If the latest is an Auto-saved snapshot, update it in-place instead of creating a new version
		if latest != nil && latest.ChangeSummary != nil && *latest.ChangeSummary == "Auto-saved snapshot" {
			latest.Content = content
			latest.CreatedAt = time.Now()
			latest.CreatedBy = createdBy
			latest.ChangeSummary = &changeSummary
			if err := s.repo.UpdateVersion(ctx, latest); err != nil {
				return nil, err
			}
		} else {
			// Force save a snapshot of the *new* content (checkpoint)
			version := &domain.DocumentVersion{
				ID:            newUUID(),
				DocumentID:    id,
				Content:       content,
				VersionNumber: versionNum,
				CreatedBy:     createdBy,
				ChangeSummary: &changeSummary,
				CreatedAt:     time.Now(),
			}
			if err := s.repo.SaveVersion(ctx, version); err != nil {
				return nil, err
			}
		}
	} else {
		needSnapshot := false
		if latest == nil {
			needSnapshot = true
		} else {
			timeDiff := time.Since(latest.CreatedAt)
			authorDiff := latest.CreatedBy == nil || *latest.CreatedBy != userID
			if timeDiff > 5*time.Minute || authorDiff {
				needSnapshot = true
			}
		}

		if needSnapshot {
			summary := "Auto-saved snapshot"
			// If the latest version is already an "Auto-saved snapshot", update it in-place
			if latest != nil && latest.ChangeSummary != nil && *latest.ChangeSummary == "Auto-saved snapshot" {
				latest.Content = doc.Content // Save the PREVIOUS content
				latest.CreatedAt = time.Now()
				latest.CreatedBy = createdBy
				if err := s.repo.UpdateVersion(ctx, latest); err != nil {
					return nil, err
				}
			} else {
				version := &domain.DocumentVersion{
					ID:            newUUID(),
					DocumentID:    id,
					Content:       doc.Content, // Save the PREVIOUS content
					VersionNumber: versionNum,
					CreatedBy:     createdBy,
					ChangeSummary: &summary,
					CreatedAt:     time.Now(),
				}
				if err := s.repo.SaveVersion(ctx, version); err != nil {
					return nil, err
				}
			}
		}
	}

	// 2. Perform the update
	doc.Title = title
	doc.Content = content
	doc.UpdatedAt = time.Now()
	doc.UpdatedByID = userID

	if err := s.repo.Update(ctx, doc); err != nil {
		return nil, err
	}

	if s.systemService != nil {
		_ = s.systemService.RecordAuditLog(ctx, id, userID, "edit")
	}

	// Sync tasks
	s.syncTasks(ctx, id, content)

	// 3. Trigger background vector indexing
	s.indexDocument(id, content)

	return s.repo.GetByID(ctx, id)
}

func (s *DocumentService) DeleteDocument(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *DocumentService) ListTrashByProject(ctx context.Context, projectId string) ([]*domain.Document, error) {
	if projectId == "" {
		return nil, errors.New("projectId is required")
	}
	return s.repo.GetTrashByProjectID(ctx, projectId)
}

func (s *DocumentService) ListTrashByTeam(ctx context.Context, teamId string) ([]*domain.Document, error) {
	if teamId == "" {
		return nil, errors.New("teamId is required")
	}
	return s.repo.GetTrashByTeamID(ctx, teamId)
}

func (s *DocumentService) RestoreDocument(ctx context.Context, id string) (*domain.Document, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check if parent is soft-deleted; if so, orphan this page to the root
	if doc.ParentID != nil {
		parent, err := s.repo.GetByID(ctx, *doc.ParentID)
		if err != nil || parent.DeletedAt != nil {
			doc.ParentID = nil
			if err := s.repo.Update(ctx, doc); err != nil {
				return nil, err
			}
		}
	}

	if err := s.repo.Restore(ctx, id); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, id)
}

func (s *DocumentService) DeleteDocumentPermanently(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("document id is required")
	}
	return s.repo.DeletePermanently(ctx, id)
}

func (s *DocumentService) GetDocumentVersions(ctx context.Context, docID string) ([]*domain.DocumentVersion, error) {
	doc, err := s.repo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}

	versions, err := s.repo.GetVersions(ctx, docID)
	if err != nil {
		return nil, err
	}

	var latestContent string
	if len(versions) > 0 {
		latestContent = versions[0].Content
	} else {
		latestContent = `{"type":"doc","content":[{"type":"paragraph"}]}`
	}

	if doc.Content != latestContent {
		summary := "Unsaved Live Changes"
		liveVersion := &domain.DocumentVersion{
			ID:            "live-changes-virtual-id",
			DocumentID:    docID,
			Content:       doc.Content,
			VersionNumber: -1,
			ChangeSummary: &summary,
			CreatedAt:     doc.UpdatedAt,
		}
		versions = append([]*domain.DocumentVersion{liveVersion}, versions...)
	}

	return versions, nil
}

func (s *DocumentService) GetDocumentVersion(ctx context.Context, versionID string) (*domain.DocumentVersion, error) {
	return s.repo.GetVersionByID(ctx, versionID)
}

func (s *DocumentService) RestoreDocumentVersion(ctx context.Context, docID string, versionID string, userID string) (*domain.Document, error) {
	version, err := s.repo.GetVersionByID(ctx, versionID)
	if err != nil {
		return nil, err
	}

	doc, err := s.repo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}

	// Before restoring, create a snapshot of the CURRENT state so no work is lost
	latest, err := s.repo.GetLatestVersion(ctx, docID)
	if err != nil {
		return nil, err
	}
	versionNum := 1
	if latest != nil {
		versionNum = latest.VersionNumber + 1
	}
	
	var createdBy *string
	if userID != "" {
		createdBy = &userID
	}
	
	snapshotSummary := "Snapshot before restore"
	currentSnapshot := &domain.DocumentVersion{
		ID:            newUUID(),
		DocumentID:    docID,
		Content:       doc.Content,
		VersionNumber: versionNum,
		CreatedBy:     createdBy,
		ChangeSummary: &snapshotSummary,
		CreatedAt:     time.Now(),
	}
	if err := s.repo.SaveVersion(ctx, currentSnapshot); err != nil {
		return nil, err
	}

	// Restore doc content
	doc.Content = version.Content
	doc.UpdatedAt = time.Now()
	if err := s.repo.Update(ctx, doc); err != nil {
		return nil, err
	}

	// Sync tasks
	s.syncTasks(ctx, docID, doc.Content)

	// Re-index restored content
	s.indexDocument(docID, doc.Content)

	return doc, nil
}

func (s *DocumentService) MoveDocument(ctx context.Context, id string, parentID *string, projectID string, teamID string) (*domain.Document, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Store original team ID before moving to propagate space updates to descendants
	oldTeamID := doc.TeamID

	// 1. Cycle detection and parent resolution
	if parentID != nil {
		if *parentID == id {
			return nil, errors.New("cannot move a page inside itself")
		}

		// Traverse up target parent hierarchy to find if we encounter this document's ID
		currParentID := parentID
		for currParentID != nil {
			parentDoc, err := s.repo.GetByID(ctx, *currParentID)
			if err != nil {
				return nil, fmt.Errorf("failed to fetch parent document: %v", err)
			}
			if parentDoc.ID == id {
				return nil, errors.New("cannot move a page inside one of its sub-pages")
			}
			currParentID = parentDoc.ParentID
		}

		// Inherit spaces from parent
		parentDoc, err := s.repo.GetByID(ctx, *parentID)
		if err != nil {
			return nil, err
		}
		doc.ParentID = parentID
		doc.ProjectID = parentDoc.ProjectID
		doc.TeamID = parentDoc.TeamID
	} else {
		// Moving to root level of space
		doc.ParentID = nil
		if projectID != "" {
			doc.ProjectID = projectID
		}
		if teamID != "" {
			doc.TeamID = teamID
		}
	}

	doc.UpdatedAt = time.Now()

	// 2. Perform document update
	if err := s.repo.Update(ctx, doc); err != nil {
		return nil, err
	}

	// 3. Propagate space changes recursively to all descendants
	if err := s.propagateSpaceChange(ctx, doc.ID, oldTeamID, doc.ProjectID, doc.TeamID); err != nil {
		log.Printf("Warning: failed to propagate space updates to descendants of %s: %v", doc.ID, err)
	}

	return doc, nil
}

func (s *DocumentService) propagateSpaceChange(ctx context.Context, parentID string, oldTeamID string, newProjectID string, newTeamID string) error {
	var allDocs []*domain.Document
	var err error
	if oldTeamID != "" {
		allDocs, err = s.repo.GetByTeamID(ctx, oldTeamID)
	}
	if err != nil {
		return err
	}

	for _, d := range allDocs {
		if d.ParentID != nil && *d.ParentID == parentID {
			d.ProjectID = newProjectID
			d.TeamID = newTeamID
			d.UpdatedAt = time.Now()
			if err := s.repo.Update(ctx, d); err != nil {
				return err
			}
			if err := s.propagateSpaceChange(ctx, d.ID, oldTeamID, newProjectID, newTeamID); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *DocumentService) CreateManualMilestone(ctx context.Context, docID string, summary string, userID string) (*domain.DocumentVersion, error) {
	doc, err := s.repo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}

	latest, err := s.repo.GetLatestVersion(ctx, docID)
	if err != nil {
		return nil, err
	}
	versionNum := 1
	if latest != nil {
		versionNum = latest.VersionNumber + 1
	}

	var createdBy *string
	if userID != "" {
		createdBy = &userID
	}

	changeSummary := summary
	if changeSummary == "" {
		changeSummary = "Named milestone"
	}

	// If the latest version in the database is an "Auto-saved snapshot",
	// update it in-place instead of creating a new version.
	if latest != nil && latest.ChangeSummary != nil && *latest.ChangeSummary == "Auto-saved snapshot" {
		latest.Content = doc.Content
		latest.CreatedAt = time.Now()
		latest.CreatedBy = createdBy
		latest.ChangeSummary = &changeSummary
		if err := s.repo.UpdateVersion(ctx, latest); err != nil {
			return nil, err
		}
		return latest, nil
	}

	version := &domain.DocumentVersion{
		ID:            newUUID(),
		DocumentID:    docID,
		Content:       doc.Content,
		VersionNumber: versionNum,
		CreatedBy:     createdBy,
		ChangeSummary: &changeSummary,
		CreatedAt:     time.Now(),
	}

	if err := s.repo.SaveVersion(ctx, version); err != nil {
		return nil, err
	}

	return version, nil
}

func (s *DocumentService) SearchDocuments(ctx context.Context, query string, projectId string) ([]*domain.Document, error) {
	if query == "" {
		if strings.HasPrefix(projectId, "team_") || strings.HasPrefix(projectId, "team-") {
			return s.repo.GetByTeamID(ctx, projectId)
		}
		return s.repo.GetByProjectID(ctx, projectId)
	}

	embedding, err := s.aiClient.GenerateTextEmbeddings(ctx, query)
	if err != nil {
		log.Printf("Search query embedding generation failed, falling back to database keyword search: %v", err)
		embedding = nil
	}

	return s.repo.Search(ctx, query, projectId, embedding)
}

// Helper methods
type tiptapNode struct {
	Type    string       `json:"type"`
	Text    string       `json:"text,omitempty"`
	Content []tiptapNode `json:"content,omitempty"`
}

func extractText(node tiptapNode) string {
	if node.Text != "" {
		return node.Text
	}
	var res []string
	for _, child := range node.Content {
		t := extractText(child)
		if t != "" {
			res = append(res, t)
		}
	}
	return strings.Join(res, " ")
}

func ExtractTextFromJSON(contentJSON string) string {
	if contentJSON == "" {
		return ""
	}
	var root tiptapNode
	if err := json.Unmarshal([]byte(contentJSON), &root); err != nil {
		return contentJSON
	}
	return extractText(root)
}

func (s *DocumentService) indexDocument(docID string, content string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		plainText := ExtractTextFromJSON(content)
		if plainText == "" {
			return
		}

		embedding, err := s.aiClient.GenerateTextEmbeddings(ctx, plainText)
		if err != nil {
			log.Printf("Background AI indexing failed for document %s: %v", docID, err)
			return
		}

		if err := s.repo.UpdateEmbedding(ctx, docID, embedding); err != nil {
			log.Printf("Failed to update database embedding for document %s: %v", docID, err)
		}
	}()
}

func (s *DocumentService) RecordView(ctx context.Context, documentID string, userID string) error {
	if documentID == "" || userID == "" {
		return errors.New("document ID and user ID are required to record view")
	}
	id := newUUID()
	err := s.repo.RecordView(ctx, id, documentID, userID, time.Now())
	if err != nil {
		return err
	}
	if s.systemService != nil {
		_ = s.systemService.RecordAuditLog(ctx, documentID, userID, "view")
	}
	return nil
}

func (s *DocumentService) GetAnalytics(ctx context.Context, documentID string) (*domain.DocumentAnalytics, error) {
	if documentID == "" {
		return nil, errors.New("document ID is required")
	}
	return s.repo.GetAnalytics(ctx, documentID)
}

func (s *DocumentService) GenerateSummary(ctx context.Context, title string, oldContent string, newContent string) (string, error) {
	oldText := ExtractTextFromJSON(oldContent)
	newText := ExtractTextFromJSON(newContent)

	prompt := fmt.Sprintf(
		"Analyze the following changes made to the document titled \"%s\".\n\n"+
		"Original Text:\n\"\"\"\n%s\n\"\"\"\n\n"+
		"New Text:\n\"\"\"\n%s\n\"\"\"\n\n"+
		"Write a concise, active-voice summary of the changes in a single sentence (maximum 15 words). Do not include any prefix or explanations, just output the summary directly.",
		title, oldText, newText,
	)

	summary, err := s.aiClient.GenerateText(ctx, prompt)
	if err != nil {
		log.Printf("AI summary generation failed: %v, falling back to word count comparison", err)
		// Fallback to word-count comparison
		oldWords := len(strings.Fields(oldText))
		newWords := len(strings.Fields(newText))
		diff := newWords - oldWords
		if diff > 0 {
			return fmt.Sprintf("Added text (+%d words)", diff), nil
		} else if diff < 0 {
			return fmt.Sprintf("Removed text (%d words)", diff), nil
		}
		return "Modified content", nil
	}

	return strings.TrimSpace(summary), nil
}

func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func (s *DocumentService) AddFavorite(ctx context.Context, userID string, documentID string) error {
	if userID == "" || documentID == "" {
		return errors.New("userID and documentID are required")
	}
	return s.repo.AddFavorite(ctx, userID, documentID)
}

func (s *DocumentService) RemoveFavorite(ctx context.Context, userID string, documentID string) error {
	if userID == "" || documentID == "" {
		return errors.New("userID and documentID are required")
	}
	return s.repo.RemoveFavorite(ctx, userID, documentID)
}

func (s *DocumentService) ListFavorites(ctx context.Context, userID string) ([]*domain.Favorite, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	return s.repo.GetFavorites(ctx, userID)
}

func (s *DocumentService) IsFavorite(ctx context.Context, userID string, documentID string) (bool, error) {
	if userID == "" || documentID == "" {
		return false, errors.New("userID and documentID are required")
	}
	return s.repo.IsFavorite(ctx, userID, documentID)
}

func (s *DocumentService) ListRecentDocuments(ctx context.Context, userID string, filterType string) ([]*domain.Document, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	return s.repo.GetRecent(ctx, userID, filterType)
}

type prosemirrorNode struct {
	Type    string             `json:"type"`
	Attrs   map[string]any     `json:"attrs,omitempty"`
	Content []*prosemirrorNode `json:"content,omitempty"`
	Text    string             `json:"text,omitempty"`
}

func (s *DocumentService) syncTasks(ctx context.Context, docID string, contentJSON string) {
	if s.taskRepo == nil {
		return
	}
	if contentJSON == "" {
		_ = s.taskRepo.SyncDocumentTasks(ctx, docID, nil)
		return
	}

	var root prosemirrorNode
	if err := json.Unmarshal([]byte(contentJSON), &root); err != nil {
		log.Printf("Error unmarshaling document content JSON for task sync: %v", err)
		return
	}

	var taskNodes []*prosemirrorNode
	findTaskNodes(&root, &taskNodes)

	var tasks []*domain.Task
	now := time.Now()
	assigneeRegex := regexp.MustCompile(`@([a-zA-Z0-9_.-]+)`)

	for _, node := range taskNodes {
		var textBuilder strings.Builder
		var dueDate *string

		// Recursively extract text and due date
		extractTaskTextAndDate(node, &textBuilder, &dueDate)

		fullText := textBuilder.String()
		matches := assigneeRegex.FindStringSubmatch(fullText)
		if len(matches) > 1 {
			assignee := matches[1]

			completed := false
			if node.Attrs != nil {
				if checked, ok := node.Attrs["checked"].(bool); ok {
					completed = checked
				}
			}

			content := strings.TrimSpace(fullText)

			tasks = append(tasks, &domain.Task{
				ID:         newUUID(),
				DocumentID: docID,
				Content:    content,
				Assignee:   assignee,
				DueDate:    dueDate,
				Completed:  completed,
				CreatedAt:  now,
				UpdatedAt:  now,
			})
		}
	}

	if err := s.taskRepo.SyncDocumentTasks(ctx, docID, tasks); err != nil {
		log.Printf("Error syncing tasks for document %s: %v", docID, err)
	}
}

func findTaskNodes(node *prosemirrorNode, taskNodes *[]*prosemirrorNode) {
	if node == nil {
		return
	}
	if node.Type == "taskItem" {
		*taskNodes = append(*taskNodes, node)
	}
	for _, child := range node.Content {
		findTaskNodes(child, taskNodes)
	}
}

func extractTaskTextAndDate(node *prosemirrorNode, textBuilder *strings.Builder, dueDate **string) {
	if node == nil {
		return
	}
	if node.Type == "text" {
		textBuilder.WriteString(node.Text)
	} else if node.Type == "inlineDate" {
		if node.Attrs != nil {
			if dateVal, ok := node.Attrs["date"].(string); ok {
				*dueDate = &dateVal
			}
		}
	}
	for _, child := range node.Content {
		extractTaskTextAndDate(child, textBuilder, dueDate)
	}
}

func (s *DocumentService) GetTasksByAssignee(ctx context.Context, username string) ([]*domain.Task, error) {
	if s.taskRepo == nil {
		return nil, errors.New("task repository is not configured")
	}
	return s.taskRepo.GetTasksByAssignee(ctx, username)
}

func (s *DocumentService) GetDocumentsWithMention(ctx context.Context, username string) ([]*domain.Document, error) {
	return s.repo.GetDocumentsWithMention(ctx, username)
}



