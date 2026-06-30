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

type InMemoryView struct {
	ID         string
	DocumentID string
	UserID     string
	ViewedAt   time.Time
}

type InMemoryFavorite struct {
	UserID     string
	DocumentID string
	CreatedAt  time.Time
}

type InMemoryDocumentRepository struct {
	mu        sync.RWMutex
	documents map[string]*domain.Document
	versions  map[string]*domain.DocumentVersion
	views     []InMemoryView
	favorites []InMemoryFavorite
}

func NewInMemoryDocumentRepository() *InMemoryDocumentRepository {
	repo := &InMemoryDocumentRepository{
		documents: make(map[string]*domain.Document),
		versions:  make(map[string]*domain.DocumentVersion),
		views:     make([]InMemoryView, 0),
		favorites: make([]InMemoryFavorite, 0),
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
		TeamID:    "team_eng",
		ParentID:  nil,
		CreatedAt: now,
		UpdatedAt: now,
	}
	r.documents["doc_guides_eng"] = &domain.Document{
		ID:        "doc_guides_eng",
		Title:     "Developer Style Guides",
		Content:   `{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Coding Guidelines"}]},{"type":"paragraph","content":[{"type":"text","text":"Please follow clean architecture principles, write Go code that compiles cleanly, and ensure frontend layouts follow modern responsive design patterns."}]}]}`,
		ProjectID: "proj_wiki",
		TeamID:    "team_eng",
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
		TeamID:    "team_eng",
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
		TeamID:    "team_mkt",
		ParentID:  nil,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func (r *InMemoryDocumentRepository) GetByID(ctx context.Context, id string) (*domain.Document, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	doc, exists := r.documents[id]
	if !exists {
		// Auto-generate root pages for team or project on-demand
		if strings.HasPrefix(id, "team_") || id == "team-1" || id == "team_eng" || id == "team_mkt" || id == "team_arkloud" {
			title := "Team Space Home"
			if id == "team-1" {
				title = "Mock Workspace"
			} else if id == "team_eng" {
				title = "Engineering Workspace"
			} else if id == "team_mkt" {
				title = "Marketing Workspace"
			} else if id == "team_arkloud" {
				title = "Arkloud Workspace"
			}
			newDoc := &domain.Document{
				ID:        id,
				Title:     title,
				Content:   `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"` + title + `"}]}]}`,
				ProjectID: "",
				TeamID:    id,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			r.documents[id] = newDoc
			docCopy := *newDoc
			return &docCopy, nil
		}
		
		if strings.HasPrefix(id, "proj_") || id == "proj-1" || id == "proj_wiki" || id == "proj_roadmap" || id == "proj_campaign" || id == "proj_arkollab_test" {
			title := "Project Space Home"
			if id == "proj-1" {
				title = "Design Project"
			} else if id == "proj_wiki" {
				title = "Engineering Wiki"
			} else if id == "proj_roadmap" {
				title = "Product Roadmap"
			} else if id == "proj_campaign" {
				title = "Summer Launch 2026"
			} else if id == "proj_arkollab_test" {
				title = "Arkollab Test"
			}
			newDoc := &domain.Document{
				ID:        id,
				Title:     title,
				Content:   `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"` + title + `"}]}]}`,
				ProjectID: id,
				TeamID:    "",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			if id == "proj_wiki" || id == "proj_roadmap" {
				newDoc.TeamID = "team_eng"
			} else if id == "proj_campaign" {
				newDoc.TeamID = "team_mkt"
			} else if id == "proj_arkollab_test" {
				newDoc.TeamID = "team_arkloud"
			} else if id == "proj-1" {
				newDoc.TeamID = "team-1"
			}
			r.documents[id] = newDoc
			docCopy := *newDoc
			return &docCopy, nil
		}

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
		if doc.ProjectID == projectId && doc.DeletedAt == nil {
			docCopy := *doc
			list = append(list, &docCopy)
		}
	}
	return list, nil
}

func (r *InMemoryDocumentRepository) GetByTeamID(ctx context.Context, teamId string) ([]*domain.Document, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.Document
	for _, doc := range r.documents {
		if doc.TeamID == teamId && doc.ProjectID == "" && doc.DeletedAt == nil {
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

	if doc.TeamID == "" && doc.ProjectID != "" {
		if doc.ProjectID == "proj_wiki" || doc.ProjectID == "proj_roadmap" {
			doc.TeamID = "team_eng"
		} else if doc.ProjectID == "proj_campaign" {
			doc.TeamID = "team_mkt"
		} else if doc.ProjectID == "proj_arkollab_test" {
			doc.TeamID = "team_arkloud"
		} else if doc.ProjectID == "proj-1" {
			doc.TeamID = "team-1"
		}
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
	existing.DeletedAt = doc.DeletedAt
	existing.UpdatedAt = time.Now()

	return nil
}

func (r *InMemoryDocumentRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.documents[id]; !exists {
		return errors.New("document not found")
	}

	now := time.Now()
	deletedIDs := make(map[string]bool)

	var markDeleted func(string)
	markDeleted = func(parentID string) {
		if doc, ok := r.documents[parentID]; ok {
			doc.DeletedAt = &now
			deletedIDs[parentID] = true
		}
		for _, doc := range r.documents {
			if doc.ParentID != nil && *doc.ParentID == parentID {
				markDeleted(doc.ID)
			}
		}
	}
	markDeleted(id)

	// Clean up favorites
	newFavs := make([]InMemoryFavorite, 0)
	for _, fav := range r.favorites {
		if !deletedIDs[fav.DocumentID] {
			newFavs = append(newFavs, fav)
		}
	}
	r.favorites = newFavs

	return nil
}

func (r *InMemoryDocumentRepository) GetTrashByProjectID(ctx context.Context, projectId string) ([]*domain.Document, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.Document
	for _, doc := range r.documents {
		if doc.ProjectID == projectId && doc.DeletedAt != nil {
			docCopy := *doc
			list = append(list, &docCopy)
		}
	}
	return list, nil
}

func (r *InMemoryDocumentRepository) GetTrashByTeamID(ctx context.Context, teamId string) ([]*domain.Document, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.Document
	for _, doc := range r.documents {
		if doc.TeamID == teamId && doc.ProjectID == "" && doc.DeletedAt != nil {
			docCopy := *doc
			list = append(list, &docCopy)
		}
	}
	return list, nil
}

func (r *InMemoryDocumentRepository) Restore(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	doc, exists := r.documents[id]
	if !exists {
		return errors.New("document not found")
	}
	doc.DeletedAt = nil
	doc.UpdatedAt = time.Now()
	return nil
}

func (r *InMemoryDocumentRepository) DeletePermanently(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.documents[id]; !exists {
		return errors.New("document not found")
	}

	deletedIDs := make(map[string]bool)

	var deleteRec func(string)
	deleteRec = func(parentID string) {
		delete(r.documents, parentID)
		deletedIDs[parentID] = true
		for _, doc := range r.documents {
			if doc.ParentID != nil && *doc.ParentID == parentID {
				deleteRec(doc.ID)
			}
		}
	}
	deleteRec(id)

	// Clean up favorites
	newFavs := make([]InMemoryFavorite, 0)
	for _, fav := range r.favorites {
		if !deletedIDs[fav.DocumentID] {
			newFavs = append(newFavs, fav)
		}
	}
	r.favorites = newFavs

	return nil
}

func (r *InMemoryDocumentRepository) SaveVersion(ctx context.Context, version *domain.DocumentVersion) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.versions[version.ID] = version
	return nil
}

func (r *InMemoryDocumentRepository) UpdateVersion(ctx context.Context, version *domain.DocumentVersion) error {
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
	isAll := projectId == "" || projectId == "all" || projectId == "*"
	isTeam := !isAll && (strings.HasPrefix(projectId, "team_") || strings.HasPrefix(projectId, "team-"))
	for _, doc := range r.documents {
		matchScope := false
		if isAll {
			matchScope = true
		} else if isTeam {
			matchScope = doc.TeamID == projectId
		} else {
			matchScope = doc.ProjectID == projectId
		}
		if matchScope && doc.DeletedAt == nil {
			if pattern == "" || strings.Contains(strings.ToLower(doc.Title), pattern) || strings.Contains(strings.ToLower(doc.Content), pattern) {
				docCopy := *doc
				list = append(list, &docCopy)
			}
		}
	}
	return list, nil
}

func (r *InMemoryDocumentRepository) RecordView(ctx context.Context, id string, documentID string, userID string, viewedAt time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.views = append(r.views, InMemoryView{
		ID:         id,
		DocumentID: documentID,
		UserID:     userID,
		ViewedAt:   viewedAt,
	})
	return nil
}

func (r *InMemoryDocumentRepository) GetAnalytics(ctx context.Context, documentID string) (*domain.DocumentAnalytics, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	now := time.Now()
	todayMidnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	history := make([]domain.AnalyticsDataPoint, 7)
	for i := 0; i < 7; i++ {
		d := todayMidnight.AddDate(0, 0, -6+i)
		history[i] = domain.AnalyticsDataPoint{
			Date:           d.Format("2006-01-02"),
			Views:          0,
			UniqueVisitors: 0,
		}
	}

	viewsThisWeek := 0
	viewsPrevWeek := 0
	uniqueVisitorsThisWeek := make(map[string]bool)

	for _, v := range r.views {
		if v.DocumentID != documentID {
			continue
		}
		
		diff := now.Sub(v.ViewedAt)
		if diff >= 0 && diff <= 7*24*time.Hour {
			viewsThisWeek++
			uniqueVisitorsThisWeek[v.UserID] = true
			
			for i := 0; i < 7; i++ {
				vDay := v.ViewedAt.Format("2006-01-02")
				if vDay == history[i].Date {
					history[i].Views++
				}
			}
		} else if diff > 7*24*time.Hour && diff <= 14*24*time.Hour {
			viewsPrevWeek++
		}
	}

	for i := 0; i < 7; i++ {
		dayUsers := make(map[string]bool)
		for _, v := range r.views {
			if v.DocumentID == documentID && v.ViewedAt.Format("2006-01-02") == history[i].Date {
				dayUsers[v.UserID] = true
			}
		}
		history[i].UniqueVisitors = len(dayUsers)
	}

	var trendPercentage float64
	if viewsPrevWeek == 0 {
		if viewsThisWeek > 0 {
			trendPercentage = 100.0
		} else {
			trendPercentage = 0.0
		}
	} else {
		trendPercentage = float64(viewsThisWeek-viewsPrevWeek) / float64(viewsPrevWeek) * 100.0
	}

	return &domain.DocumentAnalytics{
		TotalViews:      viewsThisWeek,
		TotalVisitors:   len(uniqueVisitorsThisWeek),
		TrendPercentage: trendPercentage,
		History:         history,
	}, nil
}

func (r *InMemoryDocumentRepository) AddFavorite(ctx context.Context, userID string, documentID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, fav := range r.favorites {
		if fav.UserID == userID && fav.DocumentID == documentID {
			return nil
		}
	}

	r.favorites = append(r.favorites, InMemoryFavorite{
		UserID:     userID,
		DocumentID: documentID,
		CreatedAt:  time.Now(),
	})
	return nil
}

func (r *InMemoryDocumentRepository) RemoveFavorite(ctx context.Context, userID string, documentID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	newFavs := make([]InMemoryFavorite, 0)
	for _, fav := range r.favorites {
		if fav.UserID == userID && fav.DocumentID == documentID {
			continue
		}
		newFavs = append(newFavs, fav)
	}
	r.favorites = newFavs
	return nil
}

func (r *InMemoryDocumentRepository) IsFavorite(ctx context.Context, userID string, documentID string) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, fav := range r.favorites {
		if fav.UserID == userID && fav.DocumentID == documentID {
			return true, nil
		}
	}
	return false, nil
}

func (r *InMemoryDocumentRepository) GetFavorites(ctx context.Context, userID string) ([]*domain.Favorite, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]*domain.Favorite, 0)
	for _, fav := range r.favorites {
		if fav.UserID != userID {
			continue
		}

		doc, exists := r.documents[fav.DocumentID]
		if !exists {
			continue
		}

		spaceType := "personal"
		spaceName := "Personal Space"
		if doc.ProjectID != "" {
			spaceType = "project"
			spaceName = doc.ProjectID
		} else if doc.TeamID != "" && !strings.HasPrefix(doc.TeamID, "personal_") {
			spaceType = "team"
			spaceName = doc.TeamID
		}

		// Find last accessed date
		var lastAccessed time.Time
		for _, v := range r.views {
			if v.DocumentID == fav.DocumentID && v.UserID == userID {
				if v.ViewedAt.After(lastAccessed) {
					lastAccessed = v.ViewedAt
				}
			}
		}
		if lastAccessed.IsZero() {
			lastAccessed = doc.UpdatedAt
		}

		list = append(list, &domain.Favorite{
			UserID:         userID,
			DocumentID:     fav.DocumentID,
			Title:          doc.Title,
			SpaceType:      spaceType,
			SpaceName:      spaceName,
			TeamID:         doc.TeamID,
			ProjectID:      doc.ProjectID,
			LastAccessedAt: lastAccessed,
			CreatedAt:      fav.CreatedAt,
		})
	}
	return list, nil
}

func (r *InMemoryDocumentRepository) GetRecent(ctx context.Context, userID string, filterType string) ([]*domain.Document, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	type docWithTime struct {
		doc *domain.Document
		t   time.Time
	}
	var docsWithTime []docWithTime

	for _, doc := range r.documents {
		var hasView bool
		var lastView time.Time
		for _, v := range r.views {
			if v.DocumentID == doc.ID && v.UserID == userID {
				hasView = true
				if v.ViewedAt.After(lastView) {
					lastView = v.ViewedAt
				}
			}
		}

		var hasEdit bool
		var lastEdit time.Time
		if doc.CreatedByID == userID || doc.UpdatedByID == userID {
			hasEdit = true
			lastEdit = doc.UpdatedAt
		}

		if filterType == "views" {
			if hasView {
				docsWithTime = append(docsWithTime, docWithTime{doc: doc, t: lastView})
			}
		} else if filterType == "edits" {
			if hasEdit {
				docsWithTime = append(docsWithTime, docWithTime{doc: doc, t: lastEdit})
			}
		} else {
			// "both"
			if hasView || hasEdit {
				maxT := lastEdit
				if lastView.After(maxT) {
					maxT = lastView
				}
				docsWithTime = append(docsWithTime, docWithTime{doc: doc, t: maxT})
			}
		}
	}

	sort.Slice(docsWithTime, func(i, j int) bool {
		return docsWithTime[i].t.After(docsWithTime[j].t)
	})

	var list []*domain.Document
	for idx, item := range docsWithTime {
		if idx >= 50 {
			break
		}
		docCopy := *item.doc
		list = append(list, &docCopy)
	}

	return list, nil
}

func (r *InMemoryDocumentRepository) GetDocumentsWithMention(ctx context.Context, username string) ([]*domain.Document, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.Document
	mentionMarker := `"type":"mention"`
	usernameMarker := `"username":"` + username + `"`

	for _, doc := range r.documents {
		if doc.DeletedAt == nil &&
			strings.Contains(doc.Content, mentionMarker) &&
			strings.Contains(doc.Content, usernameMarker) {
			docCopy := *doc
			list = append(list, &docCopy)
		}
	}

	sort.Slice(list, func(i, j int) bool {
		return list[i].UpdatedAt.After(list[j].UpdatedAt)
	})

	return list, nil
}


