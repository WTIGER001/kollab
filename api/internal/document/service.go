package document

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"arkollab/api/internal/ai"
	"arkollab/api/internal/domain"
)

type DocumentService struct {
	repo     domain.DocumentRepository
	aiClient *ai.OllamaClient
}

func NewDocumentService(repo domain.DocumentRepository) *DocumentService {
	return &DocumentService{
		repo:     repo,
		aiClient: ai.NewOllamaClient(),
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

func (s *DocumentService) CreateDocument(ctx context.Context, title string, projectId string, parentId *string) (*domain.Document, error) {
	if title == "" {
		return nil, errors.New("title is required")
	}
	if projectId == "" {
		return nil, errors.New("projectId is required")
	}

	doc := &domain.Document{
		ID:        newUUID(),
		Title:     title,
		Content:   `{"type":"doc","content":[{"type":"paragraph"}]}`, // Default blank content
		ProjectID: projectId,
		ParentID:  parentId,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, doc); err != nil {
		return nil, err
	}
	return doc, nil
}

func (s *DocumentService) UpdateDocument(ctx context.Context, id string, title string, content string, userID string) (*domain.Document, error) {
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

	// 2. Perform the update
	doc.Title = title
	doc.Content = content
	doc.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, doc); err != nil {
		return nil, err
	}

	// 3. Trigger background vector indexing
	s.indexDocument(id, content)

	return doc, nil
}

func (s *DocumentService) DeleteDocument(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *DocumentService) GetDocumentVersions(ctx context.Context, docID string) ([]*domain.DocumentVersion, error) {
	return s.repo.GetVersions(ctx, docID)
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

	// Re-index restored content
	s.indexDocument(docID, doc.Content)

	return doc, nil
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
		return s.repo.GetByProjectID(ctx, projectId)
	}

	embedding, err := s.aiClient.GenerateEmbedding(ctx, query)
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

		embedding, err := s.aiClient.GenerateEmbedding(ctx, plainText)
		if err != nil {
			log.Printf("Background AI indexing failed for document %s: %v", docID, err)
			return
		}

		if err := s.repo.UpdateEmbedding(ctx, docID, embedding); err != nil {
			log.Printf("Failed to update database embedding for document %s: %v", docID, err)
		}
	}()
}

func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
