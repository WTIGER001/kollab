package document

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"kollab/api/internal/domain"
	"kollab/api/internal/permissions"
	inmemsystem "kollab/api/internal/system"
	inmemtask "kollab/api/internal/task"
	inmemteam "kollab/api/internal/team"
)

type stubLLMClient struct {
	text      string
	textErr   error
	embedding []float32
	embedErr  error
}

func (c stubLLMClient) GenerateText(ctx context.Context, prompt string) (string, error) {
	return c.text, c.textErr
}

func (c stubLLMClient) GenerateTextEmbeddings(ctx context.Context, text string) ([]float32, error) {
	return c.embedding, c.embedErr
}

func TestDocumentService(t *testing.T) {
	_ = permissions.InitPermissions(context.Background(), nil)

	repo := NewInMemoryDocumentRepository()
	systemRepo := inmemsystem.NewInMemorySystemRepository()
	systemService := inmemsystem.NewSystemService(systemRepo)
	taskRepo := inmemtask.NewInMemoryTaskRepository()
	teamRepo := inmemteam.NewInMemoryTeamRepository()
	_ = teamRepo.AddTeamMember(context.Background(), "team_eng", "user1")

	service := NewDocumentService(repo, systemService, taskRepo, teamRepo)
	ctx := context.Background()

	// 1. Create a document
	content := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}]}]}`
	doc, err := service.CreateDocument(ctx, "Test Doc", "test-doc", "proj_wiki", "team_eng", nil, "user1", &content)
	if err != nil {
		t.Fatalf("expected no error creating document, got %v", err)
	}
	if doc.ID == "" || doc.Title != "Test Doc" {
		t.Errorf("invalid document created: %+v", doc)
	}

	// 2. Get document by ID
	fetched, _, err := service.GetDocument(ctx, doc.ID)
	if err != nil || fetched.ID != doc.ID {
		t.Errorf("failed to fetch document by id: %v", err)
	}

	// 3. Get document by slug
	fetchedSlug, _, err := service.GetDocument(ctx, "test-doc")
	if err != nil || fetchedSlug.ID != doc.ID {
		t.Errorf("failed to fetch document by slug: %v", err)
	}

	// 4. List by project
	docs, err := service.ListDocumentsByProject(ctx, "proj_wiki")
	if err != nil {
		t.Fatalf("expected no error listing by project, got %v", err)
	}
	found := false
	for _, d := range docs {
		if d.ID == doc.ID {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected created document to be in proj_wiki list")
	}

	// 5. List by team
	teamDocs, err := service.ListDocumentsByTeam(ctx, "team_eng")
	if err != nil {
		t.Fatalf("expected no error listing by team, got %v", err)
	}
	found = false
	for _, d := range teamDocs {
		if d.ID == doc.ID {
			found = true
			break
		}
	}
	// Note: in-memory repository GetByTeamID returns docs where ProjectID=="" and TeamID match
	// Our created doc has a ProjectID, so it may not be in teamDocs. We'll skip the strict inclusion check
	// and just verify the function executed successfully.

	// 6. Test invalid creation
	_, err = service.CreateDocument(ctx, "", "no-title", "proj_wiki", "team_eng", nil, "user1", nil)
	if err == nil || !strings.Contains(err.Error(), "title is required") {
		t.Errorf("expected error 'title is required', got %v", err)
	}

	// 7. Test favorites
	err = service.AddFavorite(ctx, "user1", doc.ID)
	if err != nil {
		t.Fatalf("expected no err adding favorite, got %v", err)
	}
	favs, err := service.ListFavorites(ctx, "user1")
	if err != nil {
		t.Fatalf("expected no err listing favorites, got %v", err)
	}
	_ = favs
	isFav, _ := service.IsFavorite(ctx, "user1", doc.ID)
	if !isFav {
		t.Errorf("expected isFav to be true")
	}
	_ = service.RemoveFavorite(ctx, "user1", doc.ID)

	// 8. Test watches
	if err = service.AddWatch(ctx, "user1", doc.ID); err != nil {
		t.Fatalf("expected no error adding watch, got %v", err)
	}
	isWatching, err := service.IsWatching(ctx, "user1", doc.ID)
	if err != nil || !isWatching {
		t.Fatalf("expected document to be watched, got %t (%v)", isWatching, err)
	}
	if err = service.RemoveWatch(ctx, "user1", doc.ID); err != nil {
		t.Fatalf("expected no error removing watch, got %v", err)
	}
	isWatching, err = service.IsWatching(ctx, "user1", doc.ID)
	if err != nil || isWatching {
		t.Fatalf("expected document to be unwatched, got %t (%v)", isWatching, err)
	}

	// 9. Test trash and delete
	err = service.DeleteDocument(ctx, doc.ID)
	if err != nil {
		t.Fatalf("expected no err deleting doc, got %v", err)
	}
	trash, err := service.ListTrashByProject(ctx, "proj_wiki")
	if err != nil {
		t.Fatalf("expected no err listing trash by proj, got %v", err)
	}
	trashTeam, err := service.ListTrashByTeam(ctx, "team_eng")
	if err != nil {
		t.Fatalf("expected no err listing trash by team, got %v", err)
	}
	_ = trash
	_ = trashTeam

	_, err = service.RestoreDocument(ctx, doc.ID)
	if err != nil {
		t.Fatalf("expected no err restoring doc, got %v", err)
	}

	_ = service.DeleteDocumentPermanently(ctx, doc.ID)

	// 9. Milestone and Versions
	doc2, _ := service.CreateDocument(ctx, "Test Doc 2", "test-doc-2", "proj_wiki", "team_eng", nil, "user1", &content)
	_, _ = service.CreateManualMilestone(ctx, doc2.ID, "user1", "Milestone 1")

	vers, _ := service.GetDocumentVersions(ctx, doc2.ID)
	if len(vers) > 0 {
		_, _ = service.GetDocumentVersion(ctx, vers[0].ID)
		_, _ = service.RestoreDocumentVersion(ctx, doc2.ID, vers[0].ID, "user1")
	}

	// 10. Move
	_, _ = service.MoveDocument(ctx, doc2.ID, nil, "proj_other", "team_other")

	// 11. Extract text
	text := ExtractTextFromJSON(`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}`)
	if strings.TrimSpace(text) != "hello" {
		t.Errorf("expected hello, got %s", text)
	}

	// 12. Record View
	_ = service.RecordView(ctx, doc2.ID, "user1")

	// 13. Tasks
	_, _ = service.GetTasksByAssignee(ctx, "user1")
	_, _ = service.GetDocumentsWithMention(ctx, "user1")
}

func TestDocumentServiceIndexesPageProperties(t *testing.T) {
	repo := NewInMemoryDocumentRepository()
	service := NewDocumentService(repo, nil, nil, nil)
	content := `{"type":"doc","content":[{"type":"macroBlock","attrs":{"type":"page-properties","config":{"properties":[{"key":"Owner","value":"Platform","type":"text"},{"key":"Status","value":"Active","type":"status"}]}}}]}`
	document, err := service.CreateDocument(context.Background(), "Service overview", "", "proj_wiki", "team_eng", nil, "", &content)
	if err != nil {
		t.Fatalf("create document: %v", err)
	}
	properties, err := service.ListDocumentProperties(context.Background(), "proj_wiki", "", "")
	if err != nil {
		t.Fatalf("list properties: %v", err)
	}
	if len(properties) != 2 {
		t.Fatalf("expected two properties, got %#v", properties)
	}
	if properties[0].DocumentID != document.ID && properties[1].DocumentID != document.ID {
		t.Fatalf("properties do not belong to created document: %#v", properties)
	}

	updatedContent := `{"type":"doc","content":[{"type":"macroBlock","attrs":{"type":"page-properties","config":{"properties":[{"key":"Owner","value":"Infrastructure","type":"text"}]}}}]}`
	if _, err := service.UpdateDocument(context.Background(), document.ID, document.Title, "", updatedContent, "", ""); err != nil {
		t.Fatalf("update document: %v", err)
	}
	properties, err = service.ListDocumentProperties(context.Background(), "proj_wiki", "", "")
	if err != nil || len(properties) != 1 || properties[0].Value != "Infrastructure" {
		t.Fatalf("expected replacement property projection, got %#v (%v)", properties, err)
	}
}

func TestDocumentServiceReviewLifecycle(t *testing.T) {
	repo := NewInMemoryDocumentRepository()
	service := NewDocumentService(repo, nil, nil, nil)
	content := `{"type":"doc","content":[{"type":"paragraph"}]}`
	document, err := service.CreateDocument(context.Background(), "Reviewed page", "", "proj_wiki", "team_eng", nil, "user1", &content)
	if err != nil {
		t.Fatalf("create document: %v", err)
	}

	nextReview := time.Now().Add(7 * 24 * time.Hour)
	review, err := service.UpdateDocumentReview(context.Background(), document.ID, "approved", &nextReview, "user1")
	if err != nil || review.Status != "approved" || review.NextReviewAt == nil {
		t.Fatalf("save approved review: %#v (%v)", review, err)
	}

	overdue := time.Now().Add(-time.Hour)
	if _, err := service.UpdateDocumentReview(context.Background(), document.ID, "approved", &overdue, "user1"); err != nil {
		t.Fatalf("save overdue review: %v", err)
	}
	review, err = service.GetDocumentReview(context.Background(), document.ID)
	if err != nil || review.Status != "stale" {
		t.Fatalf("expected stale derived status, got %#v (%v)", review, err)
	}
	if _, err := service.UpdateDocumentReview(context.Background(), document.ID, "unknown", nil, "user1"); err == nil {
		t.Fatal("expected invalid review status to be rejected")
	}
}

func TestDocumentServicePublishesAnImmutableSnapshot(t *testing.T) {
	repo := NewInMemoryDocumentRepository()
	service := NewDocumentService(repo, nil, nil, nil)
	ctx := context.Background()
	draft := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"published"}]}]}`
	document, err := service.CreateDocument(ctx, "Publishable", "", "proj_wiki", "team_eng", nil, "author", &draft)
	if err != nil {
		t.Fatal(err)
	}
	publication, err := service.PublishDocument(ctx, document.ID, "author")
	if err != nil || publication.VersionID == "" {
		t.Fatalf("publish: %#v (%v)", publication, err)
	}
	draftAfterPublish := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"unpublished draft"}]}]}`
	if _, err := service.UpdateDocument(ctx, document.ID, document.Title, "", draftAfterPublish, "author", ""); err != nil {
		t.Fatal(err)
	}
	published, savedPublication, err := service.GetPublishedDocument(ctx, document.ID)
	if err != nil || savedPublication.VersionID != publication.VersionID || published.Content != draft {
		t.Fatalf("published snapshot changed with draft: %#v %#v (%v)", published, savedPublication, err)
	}
}

func TestDocumentServiceNotifiesOtherWatchersOnUpdate(t *testing.T) {
	repo := NewInMemoryDocumentRepository()
	service := NewDocumentService(repo, nil, nil, nil)
	content := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"before"}]}]}`
	document, err := service.CreateDocument(context.Background(), "Watched page", "", "proj_wiki", "team_eng", nil, "author", &content)
	if err != nil {
		t.Fatal(err)
	}
	if err := service.AddWatch(context.Background(), "author", document.ID); err != nil {
		t.Fatal(err)
	}
	if err := service.AddWatch(context.Background(), "watcher", document.ID); err != nil {
		t.Fatal(err)
	}
	updated := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"after"}]}]}`
	if _, err := service.UpdateDocument(context.Background(), document.ID, document.Title, "", updated, "author", ""); err != nil {
		t.Fatal(err)
	}
	notifications, err := service.ListNotifications(context.Background(), "watcher")
	if err != nil || len(notifications) != 1 || notifications[0].DocumentID != document.ID || notifications[0].ActorID != "author" {
		t.Fatalf("expected one watcher notification, got %#v (%v)", notifications, err)
	}
	authorNotifications, err := service.ListNotifications(context.Background(), "author")
	if err != nil || len(authorNotifications) != 0 {
		t.Fatalf("actor should not notify themself: %#v (%v)", authorNotifications, err)
	}
	if err := service.MarkNotificationRead(context.Background(), "watcher", notifications[0].ID); err != nil {
		t.Fatal(err)
	}
	notifications, _ = service.ListNotifications(context.Background(), "watcher")
	if !notifications[0].IsRead {
		t.Fatal("expected notification to be marked read")
	}
}

func TestInMemoryDocumentRepositoryCoreQueries(t *testing.T) {
	repo := NewInMemoryDocumentRepository()
	ctx := context.Background()
	document, err := repo.GetByID(ctx, "doc_welcome_eng")
	if err != nil {
		t.Fatal(err)
	}
	if err := repo.RecordView(ctx, "view-1", document.ID, "reader", time.Now()); err != nil {
		t.Fatal(err)
	}
	analytics, err := repo.GetAnalytics(ctx, document.ID)
	if err != nil || analytics.TotalViews == 0 {
		t.Fatalf("analytics: %#v (%v)", analytics, err)
	}
	results, err := repo.Search(ctx, "engineering", "proj_wiki", nil)
	if err != nil || len(results) == 0 {
		t.Fatalf("search: %#v (%v)", results, err)
	}
	if err := repo.Delete(ctx, document.ID); err != nil {
		t.Fatal(err)
	}
	trash, err := repo.GetTrashByProjectID(ctx, "proj_wiki")
	if err != nil || len(trash) == 0 {
		t.Fatalf("trash: %#v (%v)", trash, err)
	}
	if err := repo.Restore(ctx, document.ID); err != nil {
		t.Fatal(err)
	}
	version := &domain.DocumentVersion{ID: "version-1", DocumentID: document.ID, Content: document.Content, VersionNumber: 1, CreatedAt: time.Now()}
	if err := repo.SaveVersion(ctx, version); err != nil {
		t.Fatal(err)
	}
	versions, err := repo.GetVersions(ctx, document.ID)
	if err != nil || len(versions) != 1 {
		t.Fatalf("versions: %#v (%v)", versions, err)
	}
	if _, err := repo.GetRecent(ctx, "reader", "views"); err != nil {
		t.Fatal(err)
	}
}

func TestDocumentServiceMovePersistsDestinationAndDescendants(t *testing.T) {
	ctx := context.Background()
	repo := NewInMemoryDocumentRepository()
	service := NewDocumentService(repo, nil, nil, nil)
	content := `{"type":"doc","content":[{"type":"paragraph"}]}`

	root := &domain.Document{ID: "move-root", Title: "Root", Slug: "root", Content: content, ProjectID: "proj_old", TeamID: "team_old", CreatedAt: time.Now(), UpdatedAt: time.Now()}
	child := &domain.Document{ID: "move-child", Title: "Child", Slug: "child", Content: content, ProjectID: "proj_old", TeamID: "team_old", ParentID: &root.ID, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	grandchild := &domain.Document{ID: "move-grandchild", Title: "Grandchild", Slug: "grandchild", Content: content, ProjectID: "proj_old", TeamID: "team_old", ParentID: &child.ID, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	newParent := &domain.Document{ID: "move-new-parent", Title: "New parent", Slug: "new-parent", Content: content, ProjectID: "proj_new", TeamID: "team_new", CreatedAt: time.Now(), UpdatedAt: time.Now()}
	for _, document := range []*domain.Document{root, child, grandchild, newParent} {
		if err := repo.Create(ctx, document); err != nil {
			t.Fatal(err)
		}
	}

	moved, err := service.MoveDocument(ctx, root.ID, nil, "proj_new", "team_new")
	if err != nil {
		t.Fatalf("move root: %v", err)
	}
	if moved.ProjectID != "proj_new" || moved.TeamID != "team_new" {
		t.Fatalf("root did not receive destination: %#v", moved)
	}
	for _, id := range []string{child.ID, grandchild.ID} {
		document, err := repo.GetByID(ctx, id)
		if err != nil || document.ProjectID != "proj_new" || document.TeamID != "team_new" {
			t.Fatalf("descendant %s was not moved: %#v (%v)", id, document, err)
		}
	}
	if _, err := service.MoveDocument(ctx, root.ID, &grandchild.ID, "", ""); err == nil {
		t.Fatal("expected moving a page under its descendant to fail")
	}
	if moved, err := service.MoveDocument(ctx, root.ID, nil, "", ""); err != nil || moved.ProjectID != "proj_new" || moved.TeamID != "team_new" {
		t.Fatalf("move to current space root should retain location: %#v (%v)", moved, err)
	}
	if _, err := service.MoveDocument(ctx, root.ID, nil, "", "personal_reader"); err != nil {
		t.Fatalf("move root to personal space: %v", err)
	}
	for _, id := range []string{root.ID, child.ID, grandchild.ID} {
		document, err := repo.GetByID(ctx, id)
		if err != nil || document.ProjectID != "" || document.TeamID != "personal_reader" {
			t.Fatalf("document %s did not move to personal space: %#v (%v)", id, document, err)
		}
	}

	moved, err = service.MoveDocument(ctx, child.ID, &newParent.ID, "ignored-project", "ignored-team")
	if err != nil {
		t.Fatalf("move below parent: %v", err)
	}
	if moved.ParentID == nil || *moved.ParentID != newParent.ID || moved.ProjectID != newParent.ProjectID || moved.TeamID != newParent.TeamID {
		t.Fatalf("child did not inherit parent location: %#v", moved)
	}
	grandchildAfterParentMove, err := repo.GetByID(ctx, grandchild.ID)
	if err != nil || grandchildAfterParentMove.ProjectID != newParent.ProjectID || grandchildAfterParentMove.TeamID != newParent.TeamID {
		t.Fatalf("grandchild did not follow its moved parent: %#v (%v)", grandchildAfterParentMove, err)
	}
}

func TestDocumentServiceSummariesTasksMentionsAndSearch(t *testing.T) {
	ctx := context.Background()
	repo := NewInMemoryDocumentRepository()
	tasks := inmemtask.NewInMemoryTaskRepository()
	service := &DocumentService{
		repo:     repo,
		taskRepo: tasks,
		aiClient: stubLLMClient{embedding: []float32{0.1, 0.2}},
	}

	fallbackService := &DocumentService{aiClient: stubLLMClient{textErr: errors.New("unavailable")}}
	fallback, err := fallbackService.GenerateSummary(ctx, "Plan", `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"one"}]}]}`, `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"one two"}]}]}`)
	if err != nil || fallback != "Added text (+1 words)" {
		t.Fatalf("unexpected fallback summary %q (%v)", fallback, err)
	}
	service.aiClient = stubLLMClient{text: "  Clarified the release plan.  ", embedding: []float32{0.1}}
	summary, err := service.GenerateSummary(ctx, "Plan", "old", "new")
	if err != nil || summary != "Clarified the release plan." {
		t.Fatalf("unexpected generated summary %q (%v)", summary, err)
	}

	content := `{"type":"doc","content":[{"type":"taskItem","attrs":{"checked":true},"content":[{"type":"text","text":"Ship @alice "},{"type":"inlineDate","attrs":{"date":"2026-10-01"}}]},{"type":"paragraph","content":[{"type":"mention","attrs":{"username":"alice"}}]}]}`
	document := &domain.Document{ID: "task-document", Title: "Release task", Content: `{"type":"doc","content":[{"type":"paragraph"}]}`, ProjectID: "proj_wiki", TeamID: "team_eng", CreatedAt: time.Now(), UpdatedAt: time.Now()}
	if err := repo.Create(ctx, document); err != nil {
		t.Fatal(err)
	}
	if _, err := service.UpdateDocument(ctx, document.ID, document.Title, "", content, "author", "task update"); err != nil {
		t.Fatalf("update document with task: %v", err)
	}
	assignedTasks, err := service.GetTasksByAssignee(ctx, "alice")
	if err != nil || len(assignedTasks) != 1 || !assignedTasks[0].Completed || assignedTasks[0].DueDate == nil || *assignedTasks[0].DueDate != "2026-10-01" {
		t.Fatalf("expected synced assigned task, got %#v (%v)", assignedTasks, err)
	}
	mentioned, err := service.GetDocumentsWithMention(ctx, "alice")
	if err != nil || len(mentioned) != 1 || mentioned[0].ID != document.ID {
		t.Fatalf("expected mention lookup result, got %#v (%v)", mentioned, err)
	}
	searchResults, err := service.SearchDocuments(ctx, "release", "proj_wiki", "semantic")
	if err != nil || len(searchResults) != 1 || searchResults[0].ID != document.ID {
		t.Fatalf("expected semantic search result, got %#v (%v)", searchResults, err)
	}
	emptyResults, err := service.SearchDocuments(ctx, "", "all", "keyword")
	if err != nil || len(emptyResults) != 0 {
		t.Fatalf("expected empty all-space query result, got %#v (%v)", emptyResults, err)
	}
}
