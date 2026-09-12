package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/handler"
	"kollab/api/internal/http/middleware"
)

type memoryTemplateRepository struct {
	templates  map[string]*domain.Template
	listScope  *domain.TemplateScope
	listType   *domain.TemplateType
	listTeamID *string
	listUserID *string
}

func (r *memoryTemplateRepository) Create(_ context.Context, template *domain.Template) error {
	if r.templates == nil {
		r.templates = map[string]*domain.Template{}
	}
	r.templates[template.ID] = template
	return nil
}

func (r *memoryTemplateRepository) GetByID(_ context.Context, id string) (*domain.Template, error) {
	template, ok := r.templates[id]
	if !ok {
		return nil, errors.New("template not found")
	}
	return template, nil
}

func (r *memoryTemplateRepository) GetByContext(_ context.Context, scope *domain.TemplateScope, templateType *domain.TemplateType, teamID *string, userID *string) ([]*domain.Template, error) {
	r.listScope, r.listType, r.listTeamID, r.listUserID = scope, templateType, teamID, userID
	return nil, nil
}

func (r *memoryTemplateRepository) Update(_ context.Context, template *domain.Template) error {
	if _, ok := r.templates[template.ID]; !ok {
		return errors.New("template not found")
	}
	r.templates[template.ID] = template
	return nil
}

func (r *memoryTemplateRepository) Delete(_ context.Context, id string) error {
	if _, ok := r.templates[id]; !ok {
		return errors.New("template not found")
	}
	delete(r.templates, id)
	return nil
}

func withURLParams(request *http.Request, parameters map[string]string) *http.Request {
	routeContext := chi.NewRouteContext()
	for key, value := range parameters {
		routeContext.URLParams.Add(key, value)
	}
	return request.WithContext(context.WithValue(request.Context(), chi.RouteCtxKey, routeContext))
}

func TestTemplateHandlerCreateAndList(t *testing.T) {
	repository := &memoryTemplateRepository{}
	templateHandler := handler.NewTemplateHandler(repository)
	secret := []byte("test-jwt-secret-key-123456")
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "user-1", "exp": time.Now().Add(time.Hour).Unix(),
	}).SignedString(secret)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}

	createRequest := httptest.NewRequest(http.MethodPost, "/api/templates", bytes.NewBufferString(`{"id":"template-1","title":"Meeting notes","scope":"personal","templateType":"page"}`))
	createRequest.Header.Set("Authorization", "Bearer "+token)
	createResponse := httptest.NewRecorder()
	authenticated := middleware.AuthMiddleware(secret, nil, nil)(http.HandlerFunc(templateHandler.CreateTemplate))
	authenticated.ServeHTTP(createResponse, createRequest)
	if createResponse.Code != http.StatusCreated {
		t.Fatalf("expected template creation, got %d: %s", createResponse.Code, createResponse.Body.String())
	}
	created := repository.templates["template-1"]
	if created == nil || created.UserID == nil || *created.UserID != "user-1" || created.TeamID != nil {
		t.Fatalf("personal template did not receive the authenticated owner: %#v", created)
	}

	listRequest := httptest.NewRequest(http.MethodGet, "/api/templates?scope=team&templateType=block&teamId=team-1&userId=user-1", nil)
	listResponse := httptest.NewRecorder()
	templateHandler.ListTemplates(listResponse, listRequest)
	if listResponse.Code != http.StatusOK || listResponse.Body.String() != "[]\n" {
		t.Fatalf("expected an empty JSON list, got %d: %s", listResponse.Code, listResponse.Body.String())
	}
	if repository.listScope == nil || *repository.listScope != domain.TemplateScopeTeam || repository.listType == nil || *repository.listType != domain.TemplateTypeBlock || repository.listTeamID == nil || *repository.listTeamID != "team-1" || repository.listUserID == nil || *repository.listUserID != "user-1" {
		t.Fatalf("list filters were not forwarded: %#v %#v %#v %#v", repository.listScope, repository.listType, repository.listTeamID, repository.listUserID)
	}
}

func TestTemplateHandlerGetUpdateAndDelete(t *testing.T) {
	ownerID := "user-1"
	secret := []byte("template-test-secret-at-least-32-bytes")
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"user_id": ownerID, "exp": time.Now().Add(time.Hour).Unix()}).SignedString(secret)
	authorize := func(fn http.HandlerFunc, w http.ResponseWriter, r *http.Request) {
		r.Header.Set("Authorization", "Bearer "+token)
		middleware.AuthMiddleware(secret, nil, nil)(fn).ServeHTTP(w, r)
	}
	repository := &memoryTemplateRepository{templates: map[string]*domain.Template{
		"template-1": {ID: "template-1", Title: "Original", Scope: domain.TemplateScopePersonal, UserID: &ownerID},
	}}
	templateHandler := handler.NewTemplateHandler(repository)

	getRequest := withURLParams(httptest.NewRequest(http.MethodGet, "/api/templates/template-1", nil), map[string]string{"id": "template-1"})
	getResponse := httptest.NewRecorder()
	authorize(templateHandler.GetTemplate, getResponse, getRequest)
	if getResponse.Code != http.StatusOK {
		t.Fatalf("expected template, got %d", getResponse.Code)
	}
	var returned domain.Template
	if err := json.NewDecoder(getResponse.Body).Decode(&returned); err != nil || returned.Title != "Original" {
		t.Fatalf("unexpected template response: %#v, %v", returned, err)
	}

	updateRequest := withURLParams(httptest.NewRequest(http.MethodPut, "/api/templates/template-1", bytes.NewBufferString(`{"title":"Updated"}`)), map[string]string{"id": "template-1"})
	updateResponse := httptest.NewRecorder()
	authorize(templateHandler.UpdateTemplate, updateResponse, updateRequest)
	if updateResponse.Code != http.StatusOK || repository.templates["template-1"].Title != "Updated" {
		t.Fatalf("template was not updated: %d %#v", updateResponse.Code, repository.templates["template-1"])
	}

	deleteRequest := withURLParams(httptest.NewRequest(http.MethodDelete, "/api/templates/template-1", nil), map[string]string{"id": "template-1"})
	deleteResponse := httptest.NewRecorder()
	authorize(templateHandler.DeleteTemplate, deleteResponse, deleteRequest)
	if deleteResponse.Code != http.StatusNoContent {
		t.Fatalf("expected deletion, got %d", deleteResponse.Code)
	}

	notFoundRequest := withURLParams(httptest.NewRequest(http.MethodGet, "/api/templates/missing", nil), map[string]string{"id": "missing"})
	notFoundResponse := httptest.NewRecorder()
	authorize(templateHandler.GetTemplate, notFoundResponse, notFoundRequest)
	if notFoundResponse.Code != http.StatusNotFound {
		t.Fatalf("expected not found response, got %d", notFoundResponse.Code)
	}
}
