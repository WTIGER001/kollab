package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	inmemdoc "arkollab/api/internal/document"
	inmemcomment "arkollab/api/internal/comment"
	inmemtask "arkollab/api/internal/task"
	inmemtag "arkollab/api/internal/tag"
	"arkollab/api/internal/domain"
	apihttp "arkollab/api/internal/http"
	"arkollab/api/internal/http/handler"
	imgservice "arkollab/api/internal/image"
	pgrepo "arkollab/api/internal/postgres"
	"arkollab/api/internal/storage"
	inmemsystem "arkollab/api/internal/system"
	inmemteam "arkollab/api/internal/team"
	themepkg "arkollab/api/internal/theme"
	inmemuser "arkollab/api/internal/user"
	inmematt "arkollab/api/internal/attachment"
	"arkollab/api/internal/ws"
)

func TestInMemoryAuthAndProtectedEndpoints(t *testing.T) {
	t.Setenv("GEMINI_KEY", "mock-key")
	jwtSecret := "test-secret-key-inmem"

	// InMemory Repositories
	userRepo := inmemuser.NewInMemoryUserRepository()
	teamRepo := inmemteam.NewInMemoryTeamRepository()
	docRepo := inmemdoc.NewInMemoryDocumentRepository()
	imageRepo := imgservice.NewInMemoryImageRepository()
	themeRepo := themepkg.NewInMemoryThemeRepository()
	systemRepo := inmemsystem.NewInMemorySystemRepository()
	commentRepo := inmemcomment.NewInMemoryCommentRepository()
	attachmentRepo := inmematt.NewInMemoryAttachmentRepository()
	taskRepo := inmemtask.NewInMemoryTaskRepository()

	tmpDir, err := os.MkdirTemp("", "arkollab-image-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	storageProvider, err := storage.NewLocalStorage(tmpDir)
	if err != nil {
		t.Fatalf("failed to create local storage: %v", err)
	}

	runIntegrationTests(t, userRepo, teamRepo, docRepo, imageRepo, themeRepo, systemRepo, commentRepo, attachmentRepo, taskRepo, storageProvider, jwtSecret)
}

func TestPostgresAuthAndProtectedEndpoints(t *testing.T) {
	t.Setenv("GEMINI_KEY", "mock-key")
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx := context.Background()
	jwtSecret := "test-secret-key-postgres"

	// Start PostgreSQL container via testcontainers-go
	pgContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("pgvector/pgvector:pg16"),
		postgres.WithDatabase("arkollab_test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2),
		),
	)
	if err != nil {
		t.Fatalf("failed to start postgres testcontainer: %v", err)
	}
	defer func() {
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Errorf("failed to terminate container: %v", err)
		}
	}()

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %v", err)
	}

	db, err := pgxpool.New(ctx, connStr)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	// Initialize schema & seed database
	if err := pgrepo.InitSchema(ctx, db); err != nil {
		t.Fatalf("failed to initialize schema: %v", err)
	}
	if err := pgrepo.InitSeeds(ctx, db); err != nil {
		t.Fatalf("failed to seed database: %v", err)
	}

	// Postgres Repositories
	userRepo := pgrepo.NewPostgresUserRepository(db)
	teamRepo := pgrepo.NewPostgresTeamRepository(db)
	docRepo := pgrepo.NewPostgresDocumentRepository(db)
	imageRepo := pgrepo.NewPostgresImageRepository(db)
	themeRepo := pgrepo.NewPostgresThemeRepository(db)
	systemRepo := pgrepo.NewPostgresSystemRepository(db)
	commentRepo := pgrepo.NewPostgresCommentRepository(db)
	attachmentRepo := pgrepo.NewPostgresAttachmentRepository(db)
	taskRepo := pgrepo.NewPostgresTaskRepository(db)

	tmpDir, err := os.MkdirTemp("", "arkollab-postgres-image-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	storageProvider, err := storage.NewLocalStorage(tmpDir)
	if err != nil {
		t.Fatalf("failed to create local storage: %v", err)
	}
	runIntegrationTests(t, userRepo, teamRepo, docRepo, imageRepo, themeRepo, systemRepo, commentRepo, attachmentRepo, taskRepo, storageProvider, jwtSecret)
}

type mockSystemRepo struct {
	pingErr error
}

func (m *mockSystemRepo) GetSettings(ctx context.Context) (*domain.SystemSettings, error) {
	return nil, nil
}
func (m *mockSystemRepo) UpdateSettings(ctx context.Context, settings *domain.SystemSettings) error {
	return nil
}
func (m *mockSystemRepo) RecordAuditLog(ctx context.Context, log *domain.AuditLog) error {
	return nil
}
func (m *mockSystemRepo) GetAuditLogsForPage(ctx context.Context, docID string) ([]*domain.AuditLog, error) {
	return nil, nil
}
func (m *mockSystemRepo) EnsurePartitions(ctx context.Context) error {
	return nil
}
func (m *mockSystemRepo) PrunePartitions(ctx context.Context) error {
	return nil
}
func (m *mockSystemRepo) PruneTrash(ctx context.Context) error {
	return nil
}
func (m *mockSystemRepo) Ping(ctx context.Context) error {
	return m.pingErr
}

type mockLLMClient struct {
	generateTextVal string
	generateTextErr error
}

func (m *mockLLMClient) GenerateText(ctx context.Context, prompt string) (string, error) {
	return m.generateTextVal, m.generateTextErr
}

func (m *mockLLMClient) GenerateTextEmbeddings(ctx context.Context, text string) ([]float32, error) {
	return []float32{0.1, 0.2, 0.3}, nil
}

func TestSystemHealthHandler(t *testing.T) {
	t.Setenv("GEMINI_KEY", "mock-gemini-key")

	// 1. Success case with Gemini
	repoSuccess := &mockSystemRepo{pingErr: nil}
	serviceSuccess := inmemsystem.NewSystemService(repoSuccess)
	hSuccess := handler.NewSystemHandler(serviceSuccess)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	hSuccess.Health(w, req)

	if w.Code != 300 {
		t.Errorf("expected status 300, got %d", w.Code)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode health response: %v", err)
	}
	if payload["status"] != "ok" {
		t.Errorf("expected status 'ok', got %v", payload["status"])
	}
	checks := payload["checks"].(map[string]interface{})
	if checks["database"] != "up" {
		t.Errorf("expected checks.database 'up', got %v", checks["database"])
	}
	if checks["ai"] != "Gemini" {
		t.Errorf("expected checks.ai 'Gemini', got %v", checks["ai"])
	}

	// 1b. Test with OpenAI
	t.Setenv("GEMINI_KEY", "")
	t.Setenv("OPENAI_KEY", "mock-openai-key")
	wOpenAI := httptest.NewRecorder()
	hSuccess.Health(wOpenAI, req)
	if wOpenAI.Code != 300 {
		t.Errorf("expected status 300 for OpenAI, got %d", wOpenAI.Code)
	}
	var payloadOpenAI map[string]interface{}
	_ = json.Unmarshal(wOpenAI.Body.Bytes(), &payloadOpenAI)
	checksOpenAI := payloadOpenAI["checks"].(map[string]interface{})
	if checksOpenAI["ai"] != "OpenAI" {
		t.Errorf("expected checks.ai 'OpenAI', got %v", checksOpenAI["ai"])
	}

	// 1c. Test with MISSING (error case)
	t.Setenv("OPENAI_KEY", "")
	wMissing := httptest.NewRecorder()
	hSuccess.Health(wMissing, req)
	if wMissing.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500 for missing AI, got %d", wMissing.Code)
	}
	var payloadMissing map[string]interface{}
	_ = json.Unmarshal(wMissing.Body.Bytes(), &payloadMissing)
	if payloadMissing["status"] != "error" {
		t.Errorf("expected status 'error', got %v", payloadMissing["status"])
	}
	checksMissing := payloadMissing["checks"].(map[string]interface{})
	if checksMissing["ai"] != "MISSING" {
		t.Errorf("expected checks.ai 'MISSING', got %v", checksMissing["ai"])
	}

	// 2. Database Failure case
	t.Setenv("GEMINI_KEY", "mock-gemini-key") // restore key so we only test db failure
	repoFailure := &mockSystemRepo{pingErr: fmt.Errorf("db connection refused")}
	serviceFailure := inmemsystem.NewSystemService(repoFailure)
	hFailure := handler.NewSystemHandler(serviceFailure)

	reqFail := httptest.NewRequest("GET", "/health", nil)
	wFail := httptest.NewRecorder()
	hFailure.Health(wFail, reqFail)

	if wFail.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", wFail.Code)
	}

	var payloadFail map[string]interface{}
	if err := json.Unmarshal(wFail.Body.Bytes(), &payloadFail); err != nil {
		t.Fatalf("failed to decode health response: %v", err)
	}
	if payloadFail["status"] != "error" {
		t.Errorf("expected status 'error', got %v", payloadFail["status"])
	}
	checksFail := payloadFail["checks"].(map[string]interface{})
	if !strings.Contains(checksFail["database"].(string), "down: db connection refused") {
		t.Errorf("expected checks.database to contain 'down: db connection refused', got %v", checksFail["database"])
	}
}

func runIntegrationTests(t *testing.T, userRepo domain.UserRepository, teamRepo domain.TeamRepository, docRepo domain.DocumentRepository, imageRepo domain.ImageRepository, themeRepo domain.ThemeRepository, systemRepo domain.SystemRepository, commentRepo domain.CommentRepository, attachmentRepo domain.AttachmentRepository, taskRepo domain.TaskRepository, storageProvider domain.FileStorage, jwtSecret string) {
	// Services
	authService := inmemuser.NewAuthService(userRepo, jwtSecret)
	teamService := inmemteam.NewTeamService(teamRepo)
	systemService := inmemsystem.NewSystemService(systemRepo)
	_ = systemService.EnsurePartitions(context.Background())
	docService := inmemdoc.NewDocumentService(docRepo, systemService, taskRepo)
	imageService := imgservice.NewImageService(imageRepo, storageProvider)
	themeService := themepkg.NewThemeService(themeRepo)
	attachmentService := inmematt.NewAttachmentService(attachmentRepo, storageProvider)

	// WebSocket Hub
	wsHub := ws.NewHub(docService)
	go wsHub.Run()

	// Handlers
	mockOidcConfig := map[string]string{
		"authority":   "https://mock-authority.logto.app/oidc",
		"clientId":    "mock-client-id",
		"redirectUri": "http://localhost:5173",
	}
	userH := handler.NewUserHandler(authService, themeService, systemService, mockOidcConfig)
	teamH := handler.NewTeamHandler(teamService)
	docH := handler.NewDocumentHandler(docService, wsHub)
	imgH := handler.NewImageHandler(imageService)
	themeH := handler.NewThemeHandler(themeService)
	wsH := handler.NewWSHandler([]byte(jwtSecret), nil, wsHub)
	systemH := handler.NewSystemHandler(systemService)
	commentService := inmemcomment.NewCommentService(commentRepo)
	commentH := handler.NewCommentHandler(commentService, userRepo)
	attachmentH := handler.NewAttachmentHandler(attachmentService)

	aiClient := &mockLLMClient{generateTextVal: "Mock AI generated response"}
	aiH := handler.NewAIHandler(systemService, aiClient)

	tagRepo := inmemtag.NewInMemoryTagRepository()
	tagService := inmemtag.NewTagService(tagRepo)
	tagH := handler.NewTagHandler(tagService)

	// Router
	router := apihttp.NewRouter([]byte(jwtSecret), nil, userRepo, userH, teamH, docH, imgH, themeH, wsH, systemH, commentH, attachmentH, aiH, tagH)

	// Helper to send requests
	sendReq := func(method, path string, body []byte, token string) (*httptest.ResponseRecorder, int) {
		req := httptest.NewRequest(method, path, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		return w, w.Code
	}

	// 1. Test register user
	regPayload := `{"username": "testuser", "password": "password123"}`
	_, code := sendReq("POST", "/api/auth/register", []byte(regPayload), "")
	if code != http.StatusCreated {
		t.Fatalf("expected register code 201, got %d", code)
	}

	// 1b. Test GET /api/auth/config (unprotected config endpoint)
	wConfig, codeConfig := sendReq("GET", "/api/auth/config", nil, "")
	if codeConfig != http.StatusOK {
		t.Fatalf("expected config endpoint code 200, got %d", codeConfig)
	}
	var resConfig map[string]interface{}
	if err := json.Unmarshal(wConfig.Body.Bytes(), &resConfig); err != nil {
		t.Fatalf("failed to decode config response: %v", err)
	}
	if resConfig["authority"] != "https://mock-authority.logto.app/oidc" || resConfig["clientId"] != "mock-client-id" {
		t.Errorf("unexpected OIDC config returned: %+v", resConfig)
	}

	// 2. Test login user (valid)
	loginPayload := `{"username": "testuser", "password": "password123"}`
	w, code := sendReq("POST", "/api/auth/login", []byte(loginPayload), "")
	if code != http.StatusOK {
		t.Fatalf("expected login code 200, got %d", code)
	}

	var loginRes map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &loginRes); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}

	token := loginRes["token"]
	if token == "" {
		t.Fatal("expected JWT token in response, got empty")
	}

	// 3. Test login user (invalid credentials)
	badLoginPayload := `{"username": "testuser", "password": "wrongpassword"}`
	_, code = sendReq("POST", "/api/auth/login", []byte(badLoginPayload), "")
	if code != http.StatusUnauthorized {
		t.Fatalf("expected code 401 for bad login, got %d", code)
	}

	// 4. Test accessing protected endpoint without token
	_, code = sendReq("GET", "/api/teams", nil, "")
	if code != http.StatusUnauthorized {
		t.Fatalf("expected code 401 for unauthorized access, got %d", code)
	}

	// 5. Test accessing GET /api/teams with token
	w, code = sendReq("GET", "/api/teams", nil, token)
	if code != http.StatusOK {
		t.Fatalf("expected code 200 for teams, got %d", code)
	}
	var teams []*domain.Team
	if err := json.Unmarshal(w.Body.Bytes(), &teams); err != nil {
		t.Fatalf("failed to parse teams: %v", err)
	}
	if len(teams) != 4 {
		t.Errorf("expected 4 teams, got %d", len(teams))
	}

	// 6. Test GET /api/projects with token
	w, code = sendReq("GET", "/api/projects?teamId=team_eng", nil, token)
	if code != http.StatusOK {
		t.Fatalf("expected code 200 for projects, got %d", code)
	}
	var projects []*domain.Project
	if err := json.Unmarshal(w.Body.Bytes(), &projects); err != nil {
		t.Fatalf("failed to parse projects: %v", err)
	}
	if len(projects) != 2 {
		t.Errorf("expected 2 projects, got %d", len(projects))
	}

	// 7. Test GET /api/documents without projectId (should fail with 400 Bad Request)
	_, code = sendReq("GET", "/api/documents", nil, token)
	if code != http.StatusBadRequest {
		t.Fatalf("expected code 400 when omitting projectId, got %d", code)
	}

	// 8. Test GET /api/documents with projectId
	w, code = sendReq("GET", "/api/documents?projectId=proj_wiki", nil, token)
	if code != http.StatusOK {
		t.Fatalf("expected code 200 for document list, got %d", code)
	}
	var docs []*domain.Document
	if err := json.Unmarshal(w.Body.Bytes(), &docs); err != nil {
		t.Fatalf("failed to parse documents: %v", err)
	}
	if len(docs) != 2 {
		t.Errorf("expected 2 documents for proj_wiki, got %d", len(docs))
	}

	// 8b. Test GET /api/documents with teamId (should not return project documents)
	// First fetch team_eng home page to seed it in InMemory repo
	_, code = sendReq("GET", "/api/documents/team_eng", nil, token)
	if code != http.StatusOK {
		t.Fatalf("expected code 200 for team_eng, got %d", code)
	}

	w, code = sendReq("GET", "/api/documents?teamId=team_eng", nil, token)
	if code != http.StatusOK {
		t.Fatalf("expected code 200 for team document list, got %d", code)
	}
	var teamDocs []*domain.Document
	if err := json.Unmarshal(w.Body.Bytes(), &teamDocs); err != nil {
		t.Fatalf("failed to parse team documents: %v", err)
	}
	if len(teamDocs) != 1 {
		t.Errorf("expected 1 document for team_eng, got %d", len(teamDocs))
	}

	// 9. Test POST /api/documents (Create Document)
	createPayload := `{"title": "New Specifications", "projectId": "proj_wiki"}`
	w, code = sendReq("POST", "/api/documents", []byte(createPayload), token)
	if code != http.StatusCreated {
		t.Fatalf("expected code 201 for doc creation, got %d", code)
	}
	var newDoc domain.Document
	if err := json.Unmarshal(w.Body.Bytes(), &newDoc); err != nil {
		t.Fatalf("failed to parse new document: %v", err)
	}
	if newDoc.Title != "New Specifications" || newDoc.ProjectID != "proj_wiki" {
		t.Errorf("unexpected document contents: %+v", newDoc)
	}

	// 10. Test PUT /api/documents/{id} (Update Document)
	updatePayload := `{"title": "Updated Specs", "content": "{\"type\":\"doc\",\"content\":[]}"}`
	w, code = sendReq("PUT", "/api/documents/"+newDoc.ID, []byte(updatePayload), token)
	if code != http.StatusOK {
		t.Fatalf("expected code 200 for update, got %d", code)
	}
	var updatedDoc domain.Document
	if err := json.Unmarshal(w.Body.Bytes(), &updatedDoc); err != nil {
		t.Fatalf("failed to parse updated document: %v", err)
	}
	if updatedDoc.Title != "Updated Specs" || updatedDoc.Content != `{"type":"doc","content":[]}` {
		t.Errorf("unexpected document update: %+v", updatedDoc)
	}

	// 11. Test DELETE /api/documents/{id}
	_, code = sendReq("DELETE", "/api/documents/"+newDoc.ID, nil, token)
	if code != http.StatusNoContent {
		t.Fatalf("expected code 204 for delete, got %d", code)
	}

	// 11b. Test PUT /api/documents/{id}/move (Move Page / Re-parenting & Cycle Safety)
	// Create two new documents
	wA, codeA := sendReq("POST", "/api/documents", []byte(`{"title": "Doc A", "projectId": "proj_wiki"}`), token)
	if codeA != http.StatusCreated {
		t.Fatalf("expected code 201 for doc A creation, got %d", codeA)
	}
	var docA domain.Document
	_ = json.Unmarshal(wA.Body.Bytes(), &docA)

	wB, codeB := sendReq("POST", "/api/documents", []byte(`{"title": "Doc B", "projectId": "proj_wiki"}`), token)
	if codeB != http.StatusCreated {
		t.Fatalf("expected code 201 for doc B creation, got %d", codeB)
	}
	var docB domain.Document
	_ = json.Unmarshal(wB.Body.Bytes(), &docB)

	// Move B under A
	movePayload := fmt.Sprintf(`{"parentId": "%s"}`, docA.ID)
	wMove1, codeMove1 := sendReq("PUT", fmt.Sprintf("/api/documents/%s/move", docB.ID), []byte(movePayload), token)
	if codeMove1 != http.StatusOK {
		t.Fatalf("expected code 200 for moving B under A, got %d. Body: %s", codeMove1, wMove1.Body.String())
	}
	var movedB domain.Document
	_ = json.Unmarshal(wMove1.Body.Bytes(), &movedB)
	if movedB.ParentID == nil || *movedB.ParentID != docA.ID {
		t.Errorf("expected B parent to be %s, got %v", docA.ID, movedB.ParentID)
	}

	// Try to move A under B (Cycle!)
	cyclePayload := fmt.Sprintf(`{"parentId": "%s"}`, docB.ID)
	_, codeCycle := sendReq("PUT", fmt.Sprintf("/api/documents/%s/move", docA.ID), []byte(cyclePayload), token)
	if codeCycle != http.StatusBadRequest {
		t.Errorf("expected code 400 (Bad Request) for cycle move A under B, got %d", codeCycle)
	}

	// Move B back to root (parentId = null)
	rootMovePayload := `{"parentId": null}`
	wMoveRoot, codeMoveRoot := sendReq("PUT", fmt.Sprintf("/api/documents/%s/move", docB.ID), []byte(rootMovePayload), token)
	if codeMoveRoot != http.StatusOK {
		t.Fatalf("expected code 200 for moving B to root, got %d", codeMoveRoot)
	}
	var movedBRoot domain.Document
	_ = json.Unmarshal(wMoveRoot.Body.Bytes(), &movedBRoot)
	if movedBRoot.ParentID != nil {
		t.Errorf("expected B parent to be nil, got %v", movedBRoot.ParentID)
	}

	// 11c. Test GET /api/documents/recent (Recent Documents)
	wRecent, codeRecent := sendReq("GET", "/api/documents/recent?type=both", nil, token)
	if codeRecent != http.StatusOK {
		t.Fatalf("expected code 200 for recent documents, got %d", codeRecent)
	}
	var recentDocs []*domain.Document
	if err := json.Unmarshal(wRecent.Body.Bytes(), &recentDocs); err != nil {
		t.Fatalf("failed to parse recent documents: %v", err)
	}
	hasA, hasB := false, false
	for _, rd := range recentDocs {
		if rd.ID == docA.ID {
			hasA = true
		}
		if rd.ID == docB.ID {
			hasB = true
		}
	}
	if !hasA || !hasB {
		t.Errorf("expected recent documents list to contain Doc A and Doc B, got: %+v", recentDocs)
	}

	// Clean up docs (using permanent delete to keep clean state)
	_, _ = sendReq("DELETE", "/api/documents/"+docA.ID+"?permanent=true", nil, token)
	_, _ = sendReq("DELETE", "/api/documents/"+docB.ID+"?permanent=true", nil, token)

	// 11d. Test Soft Delete, Trash listing, Restoration, and Permanent Deletion
	// Create two docs: Parent and Child
	wP, _ := sendReq("POST", "/api/documents", []byte(`{"title": "Trash Parent", "projectId": "proj_wiki"}`), token)
	var trashParent domain.Document
	_ = json.Unmarshal(wP.Body.Bytes(), &trashParent)

	wChild, _ := sendReq("POST", "/api/documents", []byte(fmt.Sprintf(`{"title": "Trash Child", "projectId": "proj_wiki", "parentId": "%s"}`, trashParent.ID)), token)
	var trashChild domain.Document
	_ = json.Unmarshal(wChild.Body.Bytes(), &trashChild)

	// Verify both exist in normal list
	wNormal, _ := sendReq("GET", "/api/documents?projectId=proj_wiki", nil, token)
	var normalDocs []*domain.Document
	_ = json.Unmarshal(wNormal.Body.Bytes(), &normalDocs)
	foundParent, foundChild := false, false
	for _, nd := range normalDocs {
		if nd.ID == trashParent.ID { foundParent = true }
		if nd.ID == trashChild.ID { foundChild = true }
	}
	if !foundParent || !foundChild {
		t.Errorf("expected both parent and child in normal doc list, got parent=%t, child=%t", foundParent, foundChild)
	}

	// Soft delete trashParent (should recursively soft-delete child too)
	_, codeDel := sendReq("DELETE", "/api/documents/"+trashParent.ID, nil, token)
	if codeDel != http.StatusNoContent {
		t.Errorf("expected 204 for soft delete, got %d", codeDel)
	}

	// Verify both are excluded from normal list
	wNormal2, _ := sendReq("GET", "/api/documents?projectId=proj_wiki", nil, token)
	var normalDocs2 []*domain.Document
	_ = json.Unmarshal(wNormal2.Body.Bytes(), &normalDocs2)
	for _, nd := range normalDocs2 {
		if nd.ID == trashParent.ID {
			t.Errorf("expected soft-deleted parent to be filtered out of normal list")
		}
		if nd.ID == trashChild.ID {
			t.Errorf("expected recursively soft-deleted child to be filtered out of normal list")
		}
	}

	// List trash: should contain both
	wTrash, codeTrash := sendReq("GET", "/api/documents/trash?projectId=proj_wiki", nil, token)
	if codeTrash != http.StatusOK {
		t.Fatalf("expected 200 for trash list, got %d", codeTrash)
	}
	var trashDocs []*domain.Document
	_ = json.Unmarshal(wTrash.Body.Bytes(), &trashDocs)
	foundParentTrash, foundChildTrash := false, false
	for _, td := range trashDocs {
		if td.ID == trashParent.ID { foundParentTrash = true }
		if td.ID == trashChild.ID { foundChildTrash = true }
	}
	if !foundParentTrash || !foundChildTrash {
		t.Errorf("expected parent and child in trash list, got parent=%t, child=%t", foundParentTrash, foundChildTrash)
	}

	// Restore parent
	wRest, codeRest := sendReq("POST", "/api/documents/"+trashParent.ID+"/restore", nil, token)
	if codeRest != http.StatusOK {
		t.Fatalf("expected 200 for restore parent, got %d", codeRest)
	}
	var restParent domain.Document
	_ = json.Unmarshal(wRest.Body.Bytes(), &restParent)
	if restParent.DeletedAt != nil {
		t.Errorf("expected restored parent to have deletedAt nil")
	}

	// Verify parent is back in normal list, but child remains in trash
	wNormal3, _ := sendReq("GET", "/api/documents?projectId=proj_wiki", nil, token)
	var normalDocs3 []*domain.Document
	_ = json.Unmarshal(wNormal3.Body.Bytes(), &normalDocs3)
	foundParent3, foundChild3 := false, false
	for _, nd := range normalDocs3 {
		if nd.ID == trashParent.ID { foundParent3 = true }
		if nd.ID == trashChild.ID { foundChild3 = true }
	}
	if !foundParent3 || foundChild3 {
		t.Errorf("expected parent restored and child still in trash, got parent=%t, child=%t", foundParent3, foundChild3)
	}

	// Restore child: since its parent is active, it should restore under its parent
	wRestChild, codeRestChild := sendReq("POST", "/api/documents/"+trashChild.ID+"/restore", nil, token)
	if codeRestChild != http.StatusOK {
		t.Fatalf("expected 200 for child restore, got %d", codeRestChild)
	}
	var restChild domain.Document
	_ = json.Unmarshal(wRestChild.Body.Bytes(), &restChild)
	if restChild.ParentID == nil || *restChild.ParentID != trashParent.ID {
		t.Errorf("expected restored child to retain parent ID, got %v", restChild.ParentID)
	}

	// Soft-delete parent again
	_, _ = sendReq("DELETE", "/api/documents/"+trashParent.ID, nil, token)

	// Restore child while parent is still in trash (should orphan child to root)
	wRestChildOrphan, codeRestChildOrphan := sendReq("POST", "/api/documents/"+trashChild.ID+"/restore", nil, token)
	if codeRestChildOrphan != http.StatusOK {
		t.Fatalf("expected 200 for child restore, got %d", codeRestChildOrphan)
	}
	var restChildOrphan domain.Document
	_ = json.Unmarshal(wRestChildOrphan.Body.Bytes(), &restChildOrphan)
	if restChildOrphan.ParentID != nil {
		t.Errorf("expected restored child to be orphaned (parent is deleted), got parent ID %v", restChildOrphan.ParentID)
	}

	// Permanent Delete parent and child
	_, codePermParent := sendReq("DELETE", "/api/documents/"+trashParent.ID+"?permanent=true", nil, token)
	if codePermParent != http.StatusNoContent {
		t.Errorf("expected 204 for permanent delete parent, got %d", codePermParent)
	}
	_, codePermChild := sendReq("DELETE", "/api/documents/"+restChildOrphan.ID+"?permanent=true", nil, token)
	if codePermChild != http.StatusNoContent {
		t.Errorf("expected 204 for permanent delete child, got %d", codePermChild)
	}

	// 12. Test GET /api/teams/{teamId}/users
	w, code = sendReq("GET", "/api/teams/team_eng/users", nil, token)
	if code != http.StatusOK {
		t.Fatalf("expected code 200 for team users, got %d", code)
	}
	var teamUsers []*domain.User
	if err := json.Unmarshal(w.Body.Bytes(), &teamUsers); err != nil {
		t.Fatalf("failed to parse team users: %v", err)
	}
	if len(teamUsers) != 1 {
		t.Errorf("expected 1 user in team_eng, got %d", len(teamUsers))
	} else {
		if teamUsers[0].ID != "mock-user-id" || teamUsers[0].Username != "mock-user" {
			t.Errorf("unexpected user in team_eng: %+v", teamUsers[0])
		}
	}

	// 13. Test Image Upload, serving and fallbacks
	// Create a 400x400 RGBA image
	imgRect := image.Rect(0, 0, 400, 400)
	rgba := image.NewRGBA(imgRect)
	var imgBuf bytes.Buffer
	if err := png.Encode(&imgBuf, rgba); err != nil {
		t.Fatalf("failed to encode PNG: %v", err)
	}
	pngData := imgBuf.Bytes()

	// Helper to send multipart form-data image upload
	sendImageUpload := func(filename, mimeType string, imgBytes []byte, authToken string) (*httptest.ResponseRecorder, int) {
		var reqBuf bytes.Buffer
		mw := multipart.NewWriter(&reqBuf)

		h := make(textproto.MIMEHeader)
		h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="image"; filename="%s"`, filename))
		h.Set("Content-Type", mimeType)

		part, err := mw.CreatePart(h)
		if err != nil {
			t.Fatalf("failed to create multipart field: %v", err)
		}
		if _, err := part.Write(imgBytes); err != nil {
			t.Fatalf("failed to write imgBytes: %v", err)
		}
		_ = mw.Close()

		req := httptest.NewRequest("POST", "/api/images", &reqBuf)
		req.Header.Set("Content-Type", mw.FormDataContentType())
		if authToken != "" {
			req.Header.Set("Authorization", "Bearer "+authToken)
		}

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		return w, w.Code
	}

	// Test upload without authorization (should fail 401)
	_, uploadCodeNoAuth := sendImageUpload("test.png", "image/png", pngData, "")
	if uploadCodeNoAuth != http.StatusUnauthorized {
		t.Errorf("expected upload code without auth to be 401, got %d", uploadCodeNoAuth)
	}

	// Test upload with authorization (should succeed 201)
	wUpload, uploadCode := sendImageUpload("test.png", "image/png", pngData, token)
	if uploadCode != http.StatusCreated {
		t.Fatalf("expected successful upload code 201, got %d", uploadCode)
	}

	var uploadRes domain.ImageMetadata
	if err := json.Unmarshal(wUpload.Body.Bytes(), &uploadRes); err != nil {
		t.Fatalf("failed to parse upload response: %v", err)
	}

	if uploadRes.Filename != "test.png" || uploadRes.MimeType != "image/png" {
		t.Errorf("unexpected uploaded image metadata: %+v", uploadRes)
	}
	if uploadRes.OriginalWidth != 400 || uploadRes.OriginalHeight != 400 {
		t.Errorf("unexpected dimensions: %dx%d", uploadRes.OriginalWidth, uploadRes.OriginalHeight)
	}

	// Test retrieve image: size "1" (300px width should be generated)
	// Note: retrieve image GET /api/images/{id}/{size} is a public route (no token)
	wGet1, get1Code := sendReq("GET", "/api/images/"+uploadRes.ID+"/1", nil, "")
	if get1Code != http.StatusOK {
		t.Fatalf("expected 200 OK retrieving resized width, got %d", get1Code)
	}
	if wGet1.Header().Get("Content-Type") != "image/png" {
		t.Errorf("expected Content-Type 'image/png', got %s", wGet1.Header().Get("Content-Type"))
	}
	img1, _, err := image.Decode(bytes.NewReader(wGet1.Body.Bytes()))
	if err != nil {
		t.Fatalf("failed to decode retrieved size 1 image: %v", err)
	}
	if img1.Bounds().Dx() != 300 {
		t.Errorf("expected resized image width to be 300, got %d", img1.Bounds().Dx())
	}

	// Test retrieve image: size "2" (600px width is larger than original 400px, so it falls back to original 400px)
	wGet2, get2Code := sendReq("GET", "/api/images/"+uploadRes.ID+"/2", nil, "")
	if get2Code != http.StatusOK {
		t.Fatalf("expected 200 OK retrieving non-existent size 2 (fallback), got %d", get2Code)
	}
	img2, _, err := image.Decode(bytes.NewReader(wGet2.Body.Bytes()))
	if err != nil {
		t.Fatalf("failed to decode retrieved size 2 image: %v", err)
	}
	if img2.Bounds().Dx() != 400 {
		t.Errorf("expected fallback image width to be original (400), got %d", img2.Bounds().Dx())
	}

	// Test delete image (protected, without token -> 401)
	_, deleteCodeNoAuth := sendReq("DELETE", "/api/images/"+uploadRes.ID, nil, "")
	if deleteCodeNoAuth != http.StatusUnauthorized {
		t.Errorf("expected delete code without auth to be 401, got %d", deleteCodeNoAuth)
	}

	// Test delete image (protected, with token -> 204)
	_, deleteCode := sendReq("DELETE", "/api/images/"+uploadRes.ID, nil, token)
	if deleteCode != http.StatusNoContent {
		t.Fatalf("expected successful delete code 204, got %d", deleteCode)
	}

	// Test retrieve after deletion (should fail 404)
	_, getAfterDeleteCode := sendReq("GET", "/api/images/"+uploadRes.ID+"/1", nil, "")
	if getAfterDeleteCode != http.StatusNotFound {
		t.Errorf("expected 404 for deleted image retrieve, got %d", getAfterDeleteCode)
	}

	// 13b. Test Search Documents
	wSearch, searchCode := sendReq("GET", "/api/search?q=Coding&projectId=proj_wiki", nil, token)
	if searchCode != http.StatusOK {
		t.Fatalf("expected search code 200, got %d", searchCode)
	}
	var searchResults []*domain.Document
	if err := json.Unmarshal(wSearch.Body.Bytes(), &searchResults); err != nil {
		t.Fatalf("failed to decode search results: %v", err)
	}
	if len(searchResults) != 1 || searchResults[0].ID != "doc_guides_eng" {
		t.Errorf("unexpected search results: %+v", searchResults)
	}

	// 13c. Test Document Versioning
	// Create a document first to test versioning on it
	createVersionDocPayload := `{"title": "Version Test Doc", "projectId": "proj_wiki"}`
	wVDoc, vdCode := sendReq("POST", "/api/documents", []byte(createVersionDocPayload), token)
	if vdCode != http.StatusCreated {
		t.Fatalf("expected create doc code 201, got %d", vdCode)
	}
	var vDoc domain.Document
	_ = json.Unmarshal(wVDoc.Body.Bytes(), &vDoc)

	// Fetch versions initially (should be empty)
	wVListEmpty, vListEmptyCode := sendReq("GET", "/api/documents/"+vDoc.ID+"/versions", nil, token)
	if vListEmptyCode != http.StatusOK {
		t.Fatalf("expected get versions code 200, got %d", vListEmptyCode)
	}
	var vListEmpty []*domain.DocumentVersion
	_ = json.Unmarshal(wVListEmpty.Body.Bytes(), &vListEmpty)
	if len(vListEmpty) != 0 {
		t.Errorf("expected 0 versions initially, got %d", len(vListEmpty))
	}

	// Update document (this should trigger an auto-save snapshot because it's the first edit)
	updateVPayload := `{"title": "Version Test Doc v2", "content": "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"First update\"}]}]}"}`
	_, updateVCode := sendReq("PUT", "/api/documents/"+vDoc.ID, []byte(updateVPayload), token)
	if updateVCode != http.StatusOK {
		t.Fatalf("expected update doc code 200, got %d", updateVCode)
	}

	// Fetch versions again (should have 1 virtual live changes version and 1 auto-saved database snapshot)
	wVListAfterUpdate, vListAfterUpdateCode := sendReq("GET", "/api/documents/"+vDoc.ID+"/versions", nil, token)
	if vListAfterUpdateCode != http.StatusOK {
		t.Fatalf("expected get versions code 200, got %d", vListAfterUpdateCode)
	}
	var vListAfterUpdate []*domain.DocumentVersion
	_ = json.Unmarshal(wVListAfterUpdate.Body.Bytes(), &vListAfterUpdate)
	if len(vListAfterUpdate) != 2 {
		t.Errorf("expected 2 versions (1 virtual, 1 database), got %d", len(vListAfterUpdate))
	} else {
		if vListAfterUpdate[0].VersionNumber != -1 || *vListAfterUpdate[0].ChangeSummary != "Unsaved Live Changes" {
			t.Errorf("expected virtual live changes version, got: %+v", vListAfterUpdate[0])
		}
		if vListAfterUpdate[1].VersionNumber != 1 || !strings.Contains(vListAfterUpdate[1].Content, `{"type":"doc","content":[{"type":"paragraph"}]}`) {
			t.Errorf("unexpected auto-saved version contents: %+v", vListAfterUpdate[1])
		}
	}

	// Create a manual named milestone
	milestonePayload := `{"summary": "Specification Milestone 1"}`
	wMilestone, milestoneCode := sendReq("POST", "/api/documents/"+vDoc.ID+"/versions", []byte(milestonePayload), token)
	if milestoneCode != http.StatusCreated {
		t.Fatalf("expected milestone code 201, got %d. Body: %s", milestoneCode, wMilestone.Body.String())
	}
	var milestone domain.DocumentVersion
	if err := json.Unmarshal(wMilestone.Body.Bytes(), &milestone); err != nil {
		t.Fatalf("failed to decode milestone response: %v", err)
	}
	if *milestone.ChangeSummary != "Specification Milestone 1" || milestone.VersionNumber != 1 {
		t.Errorf("unexpected milestone contents: %+v", milestone)
	}

	// Verify versions count is now 1 (merged auto-save snapshot, no unsaved live changes)
	wVList2, vList2Code := sendReq("GET", "/api/documents/"+vDoc.ID+"/versions", nil, token)
	var vList2 []*domain.DocumentVersion
	_ = json.Unmarshal(wVList2.Body.Bytes(), &vList2)
	if vList2Code != http.StatusOK || len(vList2) != 1 {
		t.Fatalf("expected 1 version in list, got code %d, count %d", vList2Code, len(vList2))
	}

	// Fetch specific version by ID
	wVGet, vGetCode := sendReq("GET", "/api/documents/"+vDoc.ID+"/versions/"+milestone.ID, nil, token)
	if vGetCode != http.StatusOK {
		t.Fatalf("expected get specific version code 200, got %d", vGetCode)
	}
	var specificV domain.DocumentVersion
	_ = json.Unmarshal(wVGet.Body.Bytes(), &specificV)
	if specificV.ID != milestone.ID {
		t.Errorf("expected fetched version ID to match, got %s vs %s", specificV.ID, milestone.ID)
	}

	// Restore document to version 1 (which has the updated content)
	wRestore, restoreCode := sendReq("POST", "/api/documents/"+vDoc.ID+"/versions/"+milestone.ID+"/restore", nil, token)
	if restoreCode != http.StatusOK {
		t.Fatalf("expected restore code 200, got %d. Body: %s", restoreCode, wRestore.Body.String())
	}
	var restoredDoc domain.Document
	_ = json.Unmarshal(wRestore.Body.Bytes(), &restoredDoc)
	if !strings.Contains(restoredDoc.Content, `First update`) {
		t.Errorf("expected restored content to contain 'First update', got %s", restoredDoc.Content)
	}

	// 14. Test Themes & User Preferences
	// A. Public OIDC config should include the active theme
	wConf, codeConf := sendReq("GET", "/api/auth/config", nil, "")
	if codeConf != http.StatusOK {
		t.Fatalf("expected config code 200, got %d", codeConf)
	}
	var confRes map[string]interface{}
	if err := json.Unmarshal(wConf.Body.Bytes(), &confRes); err != nil {
		t.Fatalf("failed to decode config response: %v", err)
	}
	themeVal, themeExists := confRes["theme"]
	if !themeExists || themeVal == nil {
		t.Error("expected config response to contain default active theme, got nil")
	}

	// B. Update workspace theme (protected, without token -> 401)
	themePayload := `{"name":"Brand Custom Theme","logoUrl":"http://brand.com/logo.png","lightMode":{"primary":"#000000","secondary":"#111111","background":"#222222","paper":"#333333","textPrimary":"#444444","textSecondary":"#555555","border":"#666666","accent":"#777777"},"darkMode":{"primary":"#000000","secondary":"#111111","background":"#222222","paper":"#333333","textPrimary":"#444444","textSecondary":"#555555","border":"#666666","accent":"#777777"}}`
	_, code = sendReq("PUT", "/api/theme", []byte(themePayload), "")
	if code != http.StatusUnauthorized {
		t.Errorf("expected put theme unauthorized code 401, got %d", code)
	}

	// C. Update workspace theme (protected, with token -> 200)
	wThemePut, code := sendReq("PUT", "/api/theme", []byte(themePayload), token)
	if code != http.StatusOK {
		t.Fatalf("expected put theme code 200, got %d. Body: %s", code, wThemePut.Body.String())
	}
	var putThemeRes domain.WorkspaceTheme
	if err := json.Unmarshal(wThemePut.Body.Bytes(), &putThemeRes); err != nil {
		t.Fatalf("failed to parse updated theme: %v", err)
	}
	if putThemeRes.Name != "Brand Custom Theme" || putThemeRes.LogoURL != "http://brand.com/logo.png" || putThemeRes.LightMode.Primary != "#000000" {
		t.Errorf("unexpected theme updates: %+v", putThemeRes)
	}

	// D. Public OIDC config should now return the updated theme settings
	wConfUpdated, codeConf := sendReq("GET", "/api/auth/config", nil, "")
	if codeConf != http.StatusOK {
		t.Fatalf("expected config code 200, got %d", codeConf)
	}
	var confResUpdated map[string]interface{}
	_ = json.Unmarshal(wConfUpdated.Body.Bytes(), &confResUpdated)
	themeValUpdated := confResUpdated["theme"].(map[string]interface{})
	if themeValUpdated["name"] != "Brand Custom Theme" || themeValUpdated["logoUrl"] != "http://brand.com/logo.png" {
		t.Errorf("expected config response to contain updated theme values, got: %+v", themeValUpdated)
	}

	// E. GET User Preferences (protected, without token -> 401)
	_, code = sendReq("GET", "/api/users/preferences", nil, "")
	if code != http.StatusUnauthorized {
		t.Errorf("expected user preferences code 401 without auth, got %d", code)
	}

	// F. GET User Preferences (protected, with token -> 200, returns default dark)
	wPref, code := sendReq("GET", "/api/users/preferences", nil, token)
	if code != http.StatusOK {
		t.Fatalf("expected user preferences code 200, got %d", code)
	}
	var prefRes domain.UserPreference
	if err := json.Unmarshal(wPref.Body.Bytes(), &prefRes); err != nil {
		t.Fatalf("failed to decode user preference: %v", err)
	}
	if prefRes.ThemeMode != "dark" {
		t.Errorf("expected default theme mode 'dark', got '%s'", prefRes.ThemeMode)
	}

	// G. PUT User Preferences (protected, without token -> 401)
	prefPayload := `{"themeMode":"light"}`
	_, code = sendReq("PUT", "/api/users/preferences", []byte(prefPayload), "")
	if code != http.StatusUnauthorized {
		t.Errorf("expected put user preferences code 401 without auth, got %d", code)
	}

	// H. PUT User Preferences (protected, with token -> 200, updates to light)
	wPrefPut, code := sendReq("PUT", "/api/users/preferences", []byte(prefPayload), token)
	if code != http.StatusOK {
		t.Fatalf("expected put user preferences code 200, got %d. Body: %s", code, wPrefPut.Body.String())
	}
	var prefPutRes domain.UserPreference
	_ = json.Unmarshal(wPrefPut.Body.Bytes(), &prefPutRes)
	if prefPutRes.ThemeMode != "light" {
		t.Errorf("expected updated theme mode to be 'light', got '%s'", prefPutRes.ThemeMode)
	}

	// I. Verify user privacy boundary checks:
	// Register and login second user
	regPayload2 := `{"username": "otheruser", "password": "password123"}`
	_, code = sendReq("POST", "/api/auth/register", []byte(regPayload2), "")
	if code != http.StatusCreated {
		t.Fatalf("expected registration of user 2 to succeed, got %d", code)
	}

	loginPayload2 := `{"username": "otheruser", "password": "password123"}`
	wLogin2, code := sendReq("POST", "/api/auth/login", []byte(loginPayload2), "")
	if code != http.StatusOK {
		t.Fatalf("expected login of user 2 to succeed, got %d", code)
	}
	var loginRes2 map[string]string
	_ = json.Unmarshal(wLogin2.Body.Bytes(), &loginRes2)
	token2 := loginRes2["token"]

	// User 2 GET preferences should return default "dark", completely unaffected by User 1's "light" preference
	wPrefUser2, code := sendReq("GET", "/api/users/preferences", nil, token2)
	if code != http.StatusOK {
		t.Fatalf("expected user 2 preferences code 200, got %d", code)
	}
	var prefResUser2 domain.UserPreference
	_ = json.Unmarshal(wPrefUser2.Body.Bytes(), &prefResUser2)
	if prefResUser2.ThemeMode != "dark" {
		t.Errorf("expected user 2 preference to remain 'dark', got '%s'", prefResUser2.ThemeMode)
	}

	// User 2 updates preference to "light"
	_, _ = sendReq("PUT", "/api/users/preferences", []byte(`{"themeMode":"light"}`), token2)

	// User 2 updates preference to "dark" again
	_, _ = sendReq("PUT", "/api/users/preferences", []byte(`{"themeMode":"dark"}`), token2)

	// User 1 GET preferences should still return "light", verifying isolation
	wPrefUser1Again, _ := sendReq("GET", "/api/users/preferences", nil, token)
	var prefResUser1Again domain.UserPreference
	_ = json.Unmarshal(wPrefUser1Again.Body.Bytes(), &prefResUser1Again)
	if prefResUser1Again.ThemeMode != "light" {
		t.Errorf("expected user 1 preference to remain isolated as 'light', got '%s'", prefResUser1Again.ThemeMode)
	}

	// J. Test WebSocket Connection Handshake and Presence Routing
	ts := httptest.NewServer(router)
	defer ts.Close()

	// wsURL must map to the test server's dynamic URL path
	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http") + "/api/ws?token=" + token + "&docId=proj_wiki"
	dialer := websocket.Dialer{}
	wsConn, resp, err := dialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to dial WebSocket presence endpoint: %v, resp: %+v", err, resp)
	}
	defer wsConn.Close()

	var presenceMsg ws.WSMessage
	foundPresence := false

	for i := 0; i < 5; i++ {
		_, pMsg, err := wsConn.ReadMessage()
		if err != nil {
			t.Fatalf("failed to read message from WebSocket: %v", err)
		}

		lines := strings.Split(string(pMsg), "\n")
		for _, line := range lines {
			if strings.TrimSpace(line) == "" {
				continue
			}
			var msg ws.WSMessage
			if err := json.Unmarshal([]byte(line), &msg); err == nil {
				if msg.Type == "presence" {
					presenceMsg = msg
					foundPresence = true
					break
				}
			}
		}
		if foundPresence {
			break
		}
	}

	if !foundPresence || len(presenceMsg.Users) != 1 {
		t.Errorf("unexpected or missing presence message")
	} else {
		if presenceMsg.Users[0].Username != "testuser" {
			t.Errorf("expected presence username 'testuser', got '%s'", presenceMsg.Users[0].Username)
		}
	}

	// 15. Test Page Analytics
	_, code = sendReq("GET", "/api/documents/doc_guides_eng", nil, token)
	if code != http.StatusOK {
		t.Fatalf("expected GET document code 200, got %d", code)
	}

	wAnal1, codeAnal1 := sendReq("GET", "/api/documents/doc_guides_eng/analytics", nil, token)
	if codeAnal1 != http.StatusOK {
		t.Fatalf("expected GET analytics code 200, got %d. Body: %s", codeAnal1, wAnal1.Body.String())
	}
	var anal1 domain.DocumentAnalytics
	if err := json.Unmarshal(wAnal1.Body.Bytes(), &anal1); err != nil {
		t.Fatalf("failed to parse analytics: %v", err)
	}
	if anal1.TotalViews != 1 || anal1.TotalVisitors != 1 {
		t.Errorf("expected 1 view and 1 visitor initially, got views=%d, visitors=%d", anal1.TotalViews, anal1.TotalVisitors)
	}
	if len(anal1.History) != 7 {
		t.Errorf("expected 7 history data points, got %d", len(anal1.History))
	} else {
		todayPt := anal1.History[6]
		if todayPt.Views != 1 || todayPt.UniqueVisitors != 1 {
			t.Errorf("expected today to have 1 view and 1 visitor, got views=%d, visitors=%d", todayPt.Views, todayPt.UniqueVisitors)
		}
	}

	_, _ = sendReq("GET", "/api/documents/doc_guides_eng", nil, token)
	_, _ = sendReq("GET", "/api/documents/doc_guides_eng", nil, token2)

	wAnal2, codeAnal2 := sendReq("GET", "/api/documents/doc_guides_eng/analytics", nil, token)
	if codeAnal2 != http.StatusOK {
		t.Fatalf("expected GET analytics code 200, got %d", codeAnal2)
	}
	var anal2 domain.DocumentAnalytics
	if err := json.Unmarshal(wAnal2.Body.Bytes(), &anal2); err != nil {
		t.Fatalf("failed to parse analytics 2: %v", err)
	}
	if anal2.TotalViews != 3 || anal2.TotalVisitors != 2 {
		t.Errorf("expected 3 views and 2 visitors, got views=%d, visitors=%d", anal2.TotalViews, anal2.TotalVisitors)
	}
	if len(anal2.History) == 7 {
		todayPt := anal2.History[6]
		if todayPt.Views != 3 || todayPt.UniqueVisitors != 2 {
			t.Errorf("expected today to have 3 views and 2 visitors in history, got views=%d, visitors=%d", todayPt.Views, todayPt.UniqueVisitors)
		}
	}

	// 12. Test System Settings and Audit Logs
	wSettings, codeSettings := sendReq("GET", "/api/system/settings", nil, token)
	if codeSettings != http.StatusOK {
		t.Fatalf("expected GET settings code 200, got %d. Body: %s", codeSettings, wSettings.Body.String())
	}
	var settings domain.SystemSettings
	if err := json.Unmarshal(wSettings.Body.Bytes(), &settings); err != nil {
		t.Fatalf("failed to parse system settings: %v", err)
	}
	if settings.AuditRetentionPolicy != "forever" {
		t.Errorf("expected default policy 'forever', got %q", settings.AuditRetentionPolicy)
	}
	if settings.TrashRetentionPolicy != "forever" {
		t.Errorf("expected default trash policy 'forever', got %q", settings.TrashRetentionPolicy)
	}

	// Update settings
	settings.AuditRetentionPolicy = "30d"
	settings.AuditRetentionCustomDays = 45
	settings.TrashRetentionPolicy = "7d"
	settings.TrashRetentionCustomDays = 14
	settingsPayload, _ := json.Marshal(settings)
	wUpSettings, codeUpSettings := sendReq("PUT", "/api/system/settings", settingsPayload, token)
	if codeUpSettings != http.StatusOK {
		t.Fatalf("expected PUT settings code 200, got %d. Body: %s", codeUpSettings, wUpSettings.Body.String())
	}
	var settingsUpdated domain.SystemSettings
	_ = json.Unmarshal(wUpSettings.Body.Bytes(), &settingsUpdated)
	if settingsUpdated.AuditRetentionPolicy != "30d" || settingsUpdated.AuditRetentionCustomDays != 45 {
		t.Errorf("expected updated policy '30d' and custom days 45, got policy=%q, custom_days=%d", settingsUpdated.AuditRetentionPolicy, settingsUpdated.AuditRetentionCustomDays)
	}
	if settingsUpdated.TrashRetentionPolicy != "7d" || settingsUpdated.TrashRetentionCustomDays != 14 {
		t.Errorf("expected updated trash policy '7d' and custom days 14, got policy=%q, custom_days=%d", settingsUpdated.TrashRetentionPolicy, settingsUpdated.TrashRetentionCustomDays)
	}

	// Check page audit trail
	wAudit, codeAudit := sendReq("GET", "/api/documents/doc_guides_eng/audit", nil, token)
	if codeAudit != http.StatusOK {
		t.Fatalf("expected GET audit code 200, got %d. Body: %s", codeAudit, wAudit.Body.String())
	}
	var auditLogs []*domain.AuditLog
	if err := json.Unmarshal(wAudit.Body.Bytes(), &auditLogs); err != nil {
		t.Fatalf("failed to parse page audit logs: %v", err)
	}
	if len(auditLogs) == 0 {
		t.Errorf("expected at least 1 audit log, got 0")
	}
	hasView := false
	for _, l := range auditLogs {
		if l.Action == "view" {
			hasView = true
		}
		if l.DocumentID != "doc_guides_eng" {
			t.Errorf("expected document ID 'doc_guides_eng', got %q", l.DocumentID)
		}
	}
	if !hasView {
		t.Errorf("expected audit logs to contain at least 1 'view' event")
	}

	// 13. Test Comments
	// Create a comment (bad request - empty content)
	badCommentPayload := `{"content": ""}`
	_, codeBadComment := sendReq("POST", "/api/documents/doc_guides_eng/comments", []byte(badCommentPayload), token)
	if codeBadComment != http.StatusBadRequest {
		t.Errorf("expected POST comment with empty content to return 400, got %d", codeBadComment)
	}

	// Create a comment (success)
	commentPayload := `{"content": "This is a test comment"}`
	wCreateComment, codeCreateComment := sendReq("POST", "/api/documents/doc_guides_eng/comments", []byte(commentPayload), token)
	if codeCreateComment != http.StatusCreated {
		t.Fatalf("expected POST comment code 201, got %d. Body: %s", codeCreateComment, wCreateComment.Body.String())
	}
	var createdComment domain.Comment
	if err := json.Unmarshal(wCreateComment.Body.Bytes(), &createdComment); err != nil {
		t.Fatalf("failed to parse created comment: %v", err)
	}
	if createdComment.Content != "This is a test comment" {
		t.Errorf("expected comment content 'This is a test comment', got %q", createdComment.Content)
	}
	if createdComment.CreatedByName == "" {
		t.Errorf("expected comment to have a createdByName")
	}

	// List comments (should contain the one we created)
	wListComments, codeListComments := sendReq("GET", "/api/documents/doc_guides_eng/comments", nil, token)
	if codeListComments != http.StatusOK {
		t.Fatalf("expected GET comments code 200, got %d. Body: %s", codeListComments, wListComments.Body.String())
	}
	var commentsList []*domain.Comment
	if err := json.Unmarshal(wListComments.Body.Bytes(), &commentsList); err != nil {
		t.Fatalf("failed to parse comments list: %v", err)
	}
	if len(commentsList) != 1 {
		t.Errorf("expected 1 comment, got %d", len(commentsList))
	}

	// Create a reply comment
	replyPayload := fmt.Sprintf(`{"parentId": "%s", "content": "This is a reply comment"}`, createdComment.ID)
	wCreateReply, codeCreateReply := sendReq("POST", "/api/documents/doc_guides_eng/comments", []byte(replyPayload), token)
	if codeCreateReply != http.StatusCreated {
		t.Fatalf("expected POST reply comment code 201, got %d. Body: %s", codeCreateReply, wCreateReply.Body.String())
	}
	var createdReply domain.Comment
	if err := json.Unmarshal(wCreateReply.Body.Bytes(), &createdReply); err != nil {
		t.Fatalf("failed to parse reply comment: %v", err)
	}
	if createdReply.ParentID == nil || *createdReply.ParentID != createdComment.ID {
		t.Errorf("expected reply comment parent ID to be %q, got %v", createdComment.ID, createdReply.ParentID)
	}

	// List comments (should now contain both comments)
	wListComments2, codeListComments2 := sendReq("GET", "/api/documents/doc_guides_eng/comments", nil, token)
	if codeListComments2 != http.StatusOK {
		t.Fatalf("expected GET comments list 2 code 200, got %d", codeListComments2)
	}
	var commentsList2 []*domain.Comment
	_ = json.Unmarshal(wListComments2.Body.Bytes(), &commentsList2)
	if len(commentsList2) != 2 {
		t.Errorf("expected 2 comments in list, got %d", len(commentsList2))
	}

	// Update comment (unauthorized - other user)
	updatePayload = `{"content": "This is an edited comment"}`
	_, codeUpdateUnauth := sendReq("PUT", fmt.Sprintf("/api/comments/%s", createdComment.ID), []byte(updatePayload), token2)
	if codeUpdateUnauth != http.StatusForbidden {
		t.Errorf("expected PUT comment with unauthorized user to return 403, got %d", codeUpdateUnauth)
	}

	// Update comment (success - author)
	wUpdate, codeUpdateAuth := sendReq("PUT", fmt.Sprintf("/api/comments/%s", createdComment.ID), []byte(updatePayload), token)
	if codeUpdateAuth != http.StatusOK {
		t.Errorf("expected PUT comment with author to return 200, got %d. Body: %s", codeUpdateAuth, wUpdate.Body.String())
	}
	var updatedComment domain.Comment
	_ = json.Unmarshal(wUpdate.Body.Bytes(), &updatedComment)
	if updatedComment.Content != "This is an edited comment" {
		t.Errorf("expected updated comment content to be 'This is an edited comment', got %q", updatedComment.Content)
	}

	// Delete comment (unauthorized - other user)
	_, codeDeleteUnauth := sendReq("DELETE", fmt.Sprintf("/api/comments/%s", createdComment.ID), nil, token2)
	if codeDeleteUnauth != http.StatusForbidden {
		t.Errorf("expected DELETE comment with unauthorized user to return 403, got %d", codeDeleteUnauth)
	}

	// Delete comment (success - author)
	_, codeDeleteAuth := sendReq("DELETE", fmt.Sprintf("/api/comments/%s", createdComment.ID), nil, token)
	if codeDeleteAuth != http.StatusNoContent {
		t.Errorf("expected DELETE comment with author to return 204, got %d", codeDeleteAuth)
	}

	// List comments (should be empty if database cascades or contains only reply depending on DB vs in-memory)
	wListComments3, _ := sendReq("GET", "/api/documents/doc_guides_eng/comments", nil, token)
	var commentsList3 []*domain.Comment
	_ = json.Unmarshal(wListComments3.Body.Bytes(), &commentsList3)
	for _, c := range commentsList3 {
		if c.ID == createdComment.ID {
			t.Errorf("expected deleted comment %s to be missing from the list", createdComment.ID)
		}
	}

	// 14. Test Favorites and Soft/Hard-Delete Cascading
	// Favorite a document
	_, codeFav := sendReq("POST", "/api/favorites/doc_guides_eng", nil, token)
	if codeFav != http.StatusOK {
		t.Errorf("expected POST favorite to return 200, got %d", codeFav)
	}

	// Verify status
	wFavStatus, codeFavStatus := sendReq("GET", "/api/favorites/doc_guides_eng/status", nil, token)
	if codeFavStatus != http.StatusOK {
		t.Errorf("expected GET favorite status to return 200, got %d", codeFavStatus)
	}
	var favStatus map[string]bool
	_ = json.Unmarshal(wFavStatus.Body.Bytes(), &favStatus)
	if !favStatus["isFavorite"] {
		t.Errorf("expected isFavorite to be true")
	}

	// List favorites
	wFavList, codeFavList := sendReq("GET", "/api/favorites", nil, token)
	if codeFavList != http.StatusOK {
		t.Errorf("expected GET favorites to return 200, got %d", codeFavList)
	}
	var favList []*domain.Favorite
	_ = json.Unmarshal(wFavList.Body.Bytes(), &favList)
	foundFav := false
	for _, f := range favList {
		if f.DocumentID == "doc_guides_eng" {
			foundFav = true
			break
		}
	}
	if !foundFav {
		t.Errorf("expected to find doc_guides_eng in favorites list")
	}

	// Soft-delete the document
	_, codeDel = sendReq("DELETE", "/api/documents/doc_guides_eng", nil, token)
	if codeDel != http.StatusNoContent {
		t.Errorf("expected DELETE document to return 204, got %d", codeDel)
	}

	// Verify favorite status is gone
	wFavStatus2, _ := sendReq("GET", "/api/favorites/doc_guides_eng/status", nil, token)
	var favStatus2 map[string]bool
	_ = json.Unmarshal(wFavStatus2.Body.Bytes(), &favStatus2)
	if favStatus2["isFavorite"] {
		t.Errorf("expected isFavorite to be false after soft-delete")
	}

	// Verify it does not show up in list
	wFavList2, _ := sendReq("GET", "/api/favorites", nil, token)
	var favList2 []*domain.Favorite
	_ = json.Unmarshal(wFavList2.Body.Bytes(), &favList2)
	for _, f := range favList2 {
		if f.DocumentID == "doc_guides_eng" {
			t.Errorf("expected doc_guides_eng to be removed from favorites after soft-delete")
		}
	}

	// Restore the document
	_, codeRest = sendReq("POST", "/api/documents/doc_guides_eng/restore", nil, token)
	if codeRest != http.StatusOK {
		t.Errorf("expected POST restore document to return 200, got %d", codeRest)
	}

	// Re-favorite it
	_, _ = sendReq("POST", "/api/favorites/doc_guides_eng", nil, token)

	// Hard-delete it
	_, codePermDel := sendReq("DELETE", "/api/documents/doc_guides_eng?permanent=true", nil, token)
	if codePermDel != http.StatusNoContent {
		t.Errorf("expected DELETE permanent to return 204, got %d", codePermDel)
	}

	// Verify it is gone from list
	wFavList3, _ := sendReq("GET", "/api/favorites", nil, token)
	var favList3 []*domain.Favorite
	_ = json.Unmarshal(wFavList3.Body.Bytes(), &favList3)
	for _, f := range favList3 {
		if f.DocumentID == "doc_guides_eng" {
			t.Errorf("expected doc_guides_eng to be removed from favorites after permanent delete")
		}
	}

	// 15. Test Health Check endpoints (public, no token needed)
	wHealth, codeHealth := sendReq("GET", "/health", nil, "")
	if codeHealth != 300 {
		t.Errorf("expected health code 300, got %d. Body: %s", codeHealth, wHealth.Body.String())
	}
	var healthRes map[string]interface{}
	if err := json.Unmarshal(wHealth.Body.Bytes(), &healthRes); err != nil {
		t.Fatalf("failed to decode health response: %v", err)
	}
	if healthRes["status"] != "ok" {
		t.Errorf("expected health status 'ok', got %q", healthRes["status"])
	}
	checks, ok := healthRes["checks"].(map[string]interface{})
	if !ok || checks["database"] != "up" {
		t.Errorf("expected checks.database to be 'up', got %+v", healthRes)
	}

	wAPIHealth, codeAPIHealth := sendReq("GET", "/api/health", nil, "")
	if codeAPIHealth != 300 {
		t.Errorf("expected api health code 300, got %d. Body: %s", codeAPIHealth, wAPIHealth.Body.String())
	}

	// 16. Test AI Generation & Rate Limiting
	// Default rate limit is 10, let's first test that a normal generation succeeds
	aiPayload := `{"prompt": "Generate a test overview"}`
	wAI, codeAI := sendReq("POST", "/api/ai/generate", []byte(aiPayload), token)
	if codeAI != http.StatusOK {
		t.Fatalf("expected AI generation to succeed with 200, got %d. Body: %s", codeAI, wAI.Body.String())
	}
	var aiRes map[string]string
	if err := json.Unmarshal(wAI.Body.Bytes(), &aiRes); err != nil {
		t.Fatalf("failed to parse AI response: %v", err)
	}
	if aiRes["text"] != "Mock AI generated response" {
		t.Errorf("expected AI response 'Mock AI generated response', got %q", aiRes["text"])
	}

	// Update settings to set rate limit to 2
	wSettingsGet, _ := sendReq("GET", "/api/system/settings", nil, token)
	var aiSettings domain.SystemSettings
	_ = json.Unmarshal(wSettingsGet.Body.Bytes(), &aiSettings)
	aiSettings.AIRateLimit = 2
	aiSettings.WelcomeTitle = "Custom Welcome Title"
	aiSettings.WelcomeText = "Custom Welcome Description"

	aiSettingsPayload, _ := json.Marshal(aiSettings)
	_, codeSet := sendReq("PUT", "/api/system/settings", aiSettingsPayload, token)
	if codeSet != http.StatusOK {
		t.Fatalf("expected PUT settings code 200, got %d", codeSet)
	}

	// Verify custom welcome text and title are returned publicly by OIDC config
	wOIDC, codeOIDC := sendReq("GET", "/api/auth/config", nil, "")
	if codeOIDC != http.StatusOK {
		t.Fatalf("expected public OIDC config status 200, got %d", codeOIDC)
	}
	var oidcRes map[string]interface{}
	_ = json.Unmarshal(wOIDC.Body.Bytes(), &oidcRes)
	if oidcRes["welcomeTitle"] != "Custom Welcome Title" || oidcRes["welcomeText"] != "Custom Welcome Description" {
		t.Errorf("expected dynamic welcome settings from public config, got Title: %v, Text: %v", oidcRes["welcomeTitle"], oidcRes["welcomeText"])
	}

	// Since we set AI Rate Limit to 2, and we already made 1 request above:
	// Making request 2: should succeed
	_, codeAI2 := sendReq("POST", "/api/ai/generate", []byte(aiPayload), token)
	if codeAI2 != http.StatusOK {
		t.Errorf("expected request 2 to succeed (2/2), got status %d", codeAI2)
	}

	// Making request 3: should fail with 429 Too Many Requests
	wAI3, codeAI3 := sendReq("POST", "/api/ai/generate", []byte(aiPayload), token)
	if codeAI3 != http.StatusTooManyRequests {
		t.Errorf("expected request 3 to fail with 429 Too Many Requests, got status %d. Body: %s", codeAI3, wAI3.Body.String())
	}
}

