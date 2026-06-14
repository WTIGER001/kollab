package document

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"arkollab/api/internal/domain"
)

type InMemoryDocumentRepository struct {
	mu        sync.RWMutex
	documents map[string]*domain.Document
	versions  map[string]*domain.DocumentVersion
}

func NewInMemoryDocumentRepository() *InMemoryDocumentRepository {
	repo := &InMemoryDocumentRepository{
		documents: make(map[string]*domain.Document),
		versions:  make(map[string]*domain.DocumentVersion),
	}
	repo.seed()
	return repo
}

func (r *InMemoryDocumentRepository) seed() {
	now := time.Now()

	// Seed Engineering Wiki
	r.documents["doc_welcome_eng"] = &domain.Document{
		ID:        "doc_welcome_eng",
		Title:     "Welcome to Engineering Wiki",
		Content:   `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Welcome to the Engineering Wiki!"}]},{"type":"paragraph","content":[{"type":"text","text":"This is the collaborative home for all our software design specifications, API endpoints, and architectures. Use the '/' command to insert templates, status indicator widgets, and column layouts."}]}]}`,
		ProjectID: "proj_wiki",
		ParentID:  nil,
		CreatedAt: now,
		UpdatedAt: now,
	}
	r.documents["doc_guides_eng"] = &domain.Document{
		ID:        "doc_guides_eng",
		Title:     "Developer Style Guides",
		Content:   `{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Coding Guidelines"}]},{"type":"paragraph","content":[{"type":"text","text":"Please follow clean architecture principles, write Go code that compiles cleanly, and ensure frontend layouts follow modern responsive design patterns."}]}]}`,
		ProjectID: "proj_wiki",
		ParentID:  nil,
		CreatedAt: now.Add(-time.Hour * 2),
		UpdatedAt: now,
	}

	// Seed Product Roadmap
	r.documents["doc_welcome_roadmap"] = &domain.Document{
		ID:        "doc_welcome_roadmap",
		Title:     "Product Roadmap Overview",
		Content:   `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Product Roadmap Q3/Q4"}]},{"type":"paragraph","content":[{"type":"text","text":"Below is our roadmap schedule mapping out critical features, database models, and target deployments."}]}]}`,
		ProjectID: "proj_roadmap",
		ParentID:  nil,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Seed Marketing Campaign
	r.documents["doc_welcome_mkt"] = &domain.Document{
		ID:        "doc_welcome_mkt",
		Title:     "Summer Launch 2026",
		Content:   `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Summer Launch Campaign Kickoff"}]},{"type":"paragraph","content":[{"type":"text","text":"Review our key assets, marketing target audiences, and press releases for the upcoming launch event."}]}]}`,
		ProjectID: "proj_campaign",
		ParentID:  nil,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func (r *InMemoryDocumentRepository) GetByID(ctx context.Context, id string) (*domain.Document, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	doc, exists := r.documents[id]
	if !exists {
		return nil, errors.New("document not found")
	}
	docCopy := *doc
	return &docCopy, nil
}

func (r *InMemoryDocumentRepository) GetByProjectID(ctx context.Context, projectId string) ([]*domain.Document, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.Document
	for _, doc := range r.documents {
		if doc.ProjectID == projectId {
			docCopy := *doc
			list = append(list, &docCopy)
		}
	}
	return list, nil
}

func (r *InMemoryDocumentRepository) Create(ctx context.Context, doc *domain.Document) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.documents[doc.ID]; exists {
		return errors.New("document already exists")
	}

	r.documents[doc.ID] = doc
	return nil
}

func (r *InMemoryDocumentRepository) Update(ctx context.Context, doc *domain.Document) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, exists := r.documents[doc.ID]
	if !exists {
		return errors.New("document not found")
	}

	existing.Title = doc.Title
	existing.Content = doc.Content
	existing.ParentID = doc.ParentID
	existing.UpdatedAt = time.Now()

	return nil
}

func (r *InMemoryDocumentRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.documents[id]; !exists {
		return errors.New("document not found")
	}

	delete(r.documents, id)
	return nil
}

func (r *InMemoryDocumentRepository) SaveVersion(ctx context.Context, version *domain.DocumentVersion) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.versions[version.ID] = version
	return nil
}

func (r *InMemoryDocumentRepository) GetVersions(ctx context.Context, docID string) ([]*domain.DocumentVersion, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.DocumentVersion
	for _, v := range r.versions {
		if v.DocumentID == docID {
			vCopy := *v
			list = append(list, &vCopy)
		}
	}

	sort.Slice(list, func(i, j int) bool {
		return list[i].VersionNumber > list[j].VersionNumber
	})

	return list, nil
}

func (r *InMemoryDocumentRepository) GetVersionByID(ctx context.Context, versionID string) (*domain.DocumentVersion, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	v, exists := r.versions[versionID]
	if !exists {
		return nil, errors.New("version not found")
	}
	vCopy := *v
	return &vCopy, nil
}

func (r *InMemoryDocumentRepository) GetLatestVersion(ctx context.Context, docID string) (*domain.DocumentVersion, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var latest *domain.DocumentVersion
	for _, v := range r.versions {
		if v.DocumentID == docID {
			if latest == nil || v.VersionNumber > latest.VersionNumber {
				latest = v
			}
		}
	}

	if latest == nil {
		return nil, nil
	}

	vCopy := *latest
	return &vCopy, nil
}

func (r *InMemoryDocumentRepository) UpdateEmbedding(ctx context.Context, docID string, embedding []float32) error {
	return nil
}

func (r *InMemoryDocumentRepository) Search(ctx context.Context, query string, projectId string, embedding []float32) ([]*domain.Document, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.Document
	pattern := strings.ToLower(query)
	for _, doc := range r.documents {
		if doc.ProjectID == projectId {
			if pattern == "" || strings.Contains(strings.ToLower(doc.Title), pattern) || strings.Contains(strings.ToLower(doc.Content), pattern) {
				docCopy := *doc
				list = append(list, &docCopy)
			}
		}
	}
	return list, nil
}
