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
	"arkollab/api/internal/domain"
	apihttp "arkollab/api/internal/http"
	"arkollab/api/internal/http/handler"
	imgservice "arkollab/api/internal/image"
	pgrepo "arkollab/api/internal/postgres"
	"arkollab/api/internal/storage"
	inmemteam "arkollab/api/internal/team"
	themepkg "arkollab/api/internal/theme"
	inmemuser "arkollab/api/internal/user"
	"arkollab/api/internal/ws"
)

func TestInMemoryAuthAndProtectedEndpoints(t *testing.T) {
	jwtSecret := "test-secret-key-inmem"

	// InMemory Repositories
	userRepo := inmemuser.NewInMemoryUserRepository()
	teamRepo := inmemteam.NewInMemoryTeamRepository()
	docRepo := inmemdoc.NewInMemoryDocumentRepository()
	imageRepo := imgservice.NewInMemoryImageRepository()
	themeRepo := themepkg.NewInMemoryThemeRepository()

	tmpDir, err := os.MkdirTemp("", "arkollab-image-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	storageProvider, err := storage.NewLocalStorage(tmpDir)
	if err != nil {
		t.Fatalf("failed to create local storage: %v", err)
	}

	runIntegrationTests(t, userRepo, teamRepo, docRepo, imageRepo, themeRepo, storageProvider, jwtSecret)
}

func TestPostgresAuthAndProtectedEndpoints(t *testing.T) {
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

	// Postgres Repositories
	userRepo := pgrepo.NewPostgresUserRepository(db)
	teamRepo := pgrepo.NewPostgresTeamRepository(db)
	docRepo := pgrepo.NewPostgresDocumentRepository(db)
	imageRepo := pgrepo.NewPostgresImageRepository(db)
	themeRepo := pgrepo.NewPostgresThemeRepository(db)

	tmpDir, err := os.MkdirTemp("", "arkollab-postgres-image-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	storageProvider, err := storage.NewLocalStorage(tmpDir)
	if err != nil {
		t.Fatalf("failed to create local storage: %v", err)
	}

	runIntegrationTests(t, userRepo, teamRepo, docRepo, imageRepo, themeRepo, storageProvider, jwtSecret)
}

func runIntegrationTests(t *testing.T, userRepo domain.UserRepository, teamRepo domain.TeamRepository, docRepo domain.DocumentRepository, imageRepo domain.ImageRepository, themeRepo domain.ThemeRepository, storageProvider domain.FileStorage, jwtSecret string) {
	// Services
	authService := inmemuser.NewAuthService(userRepo, jwtSecret)
	teamService := inmemteam.NewTeamService(teamRepo)
	docService := inmemdoc.NewDocumentService(docRepo)
	imageService := imgservice.NewImageService(imageRepo, storageProvider)
	themeService := themepkg.NewThemeService(themeRepo)

	// WebSocket Hub
	wsHub := ws.NewHub()
	go wsHub.Run()

	// Handlers
	mockOidcConfig := map[string]string{
		"authority":   "https://mock-authority.logto.app/oidc",
		"clientId":    "mock-client-id",
		"redirectUri": "http://localhost:5173",
	}
	userH := handler.NewUserHandler(authService, themeService, mockOidcConfig)
	teamH := handler.NewTeamHandler(teamService)
	docH := handler.NewDocumentHandler(docService)
	imgH := handler.NewImageHandler(imageService)
	themeH := handler.NewThemeHandler(themeService)
	wsH := handler.NewWSHandler([]byte(jwtSecret), nil, wsHub)

	// Router
	router := apihttp.NewRouter([]byte(jwtSecret), nil, userH, teamH, docH, imgH, themeH, wsH)

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
	if len(teams) != 3 {
		t.Errorf("expected 3 teams, got %d", len(teams))
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

	// Verify document is deleted
	_, code = sendReq("GET", "/api/documents/"+newDoc.ID, nil, token)
	if code != http.StatusNotFound {
		t.Fatalf("expected code 404 for deleted document, got %d", code)
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

	// Fetch versions again (should have 1 auto-saved snapshot containing original empty content)
	wVListAfterUpdate, vListAfterUpdateCode := sendReq("GET", "/api/documents/"+vDoc.ID+"/versions", nil, token)
	if vListAfterUpdateCode != http.StatusOK {
		t.Fatalf("expected get versions code 200, got %d", vListAfterUpdateCode)
	}
	var vListAfterUpdate []*domain.DocumentVersion
	_ = json.Unmarshal(wVListAfterUpdate.Body.Bytes(), &vListAfterUpdate)
	if len(vListAfterUpdate) != 1 {
		t.Errorf("expected 1 auto-saved version, got %d", len(vListAfterUpdate))
	} else {
		if vListAfterUpdate[0].VersionNumber != 1 || !strings.Contains(vListAfterUpdate[0].Content, `{"type":"doc","content":[{"type":"paragraph"}]}`) {
			t.Errorf("unexpected auto-saved version contents: %+v", vListAfterUpdate[0])
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
	if *milestone.ChangeSummary != "Specification Milestone 1" || milestone.VersionNumber != 2 {
		t.Errorf("unexpected milestone contents: %+v", milestone)
	}

	// Verify versions count is now 2
	wVList2, vList2Code := sendReq("GET", "/api/documents/"+vDoc.ID+"/versions", nil, token)
	var vList2 []*domain.DocumentVersion
	_ = json.Unmarshal(wVList2.Body.Bytes(), &vList2)
	if vList2Code != http.StatusOK || len(vList2) != 2 {
		t.Fatalf("expected 2 versions in list, got code %d, count %d", vList2Code, len(vList2))
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

	// Restore document to version 1 (which had blank content)
	wRestore, restoreCode := sendReq("POST", "/api/documents/"+vDoc.ID+"/versions/"+vListAfterUpdate[0].ID+"/restore", nil, token)
	if restoreCode != http.StatusOK {
		t.Fatalf("expected restore code 200, got %d. Body: %s", restoreCode, wRestore.Body.String())
	}
	var restoredDoc domain.Document
	_ = json.Unmarshal(wRestore.Body.Bytes(), &restoredDoc)
	if !strings.Contains(restoredDoc.Content, `{"type":"doc","content":[{"type":"paragraph"}]}`) {
		t.Errorf("expected restored content to be blank doc, got %s", restoredDoc.Content)
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

	// Read initial presence message broadcast
	_, pMsg, err := wsConn.ReadMessage()
	if err != nil {
		t.Fatalf("failed to read message from WebSocket: %v", err)
	}

	// The server write pump batches messages separating them by newlines
	lines := strings.Split(string(pMsg), "\n")
	var presenceMsg ws.WSMessage
	foundPresence := false
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

	if !foundPresence || len(presenceMsg.Users) != 1 {
		t.Errorf("unexpected or missing presence message: %s", string(pMsg))
	} else {
		if presenceMsg.Users[0].Username != "testuser" {
			t.Errorf("expected presence username 'testuser', got '%s'", presenceMsg.Users[0].Username)
		}
	}
}
