package handler

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	gitlab "gitlab.com/gitlab-org/api/client-go"
)

func TestGitLabIssuesCollectsProjectAndGroupPages(t *testing.T) {
	for _, group := range []bool{false, true} {
		t.Run(fmt.Sprint(group), func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if group && r.URL.Path == "/api/v4/projects/example/issues" {
					http.NotFound(w, r)
					return
				}
				calls++
				if r.URL.Query().Get("per_page") != "100" {
					t.Error("missing bounded page size")
				}
				w.Header().Set("Content-Type", "application/json")
				if r.URL.Query().Get("page") == "1" {
					w.Header().Set("X-Next-Page", "2")
					fmt.Fprint(w, `[{"id":1,"iid":1,"title":"first"}]`)
				} else {
					fmt.Fprint(w, `[{"id":2,"iid":2,"title":"second"}]`)
				}
			}))
			defer server.Close()
			client, err := gitlab.NewClient("test", gitlab.WithBaseURL(server.URL), gitlab.WithHTTPClient(gitLabHTTPClient()))
			if err != nil {
				t.Fatal(err)
			}
			issues, err := fetchGitLabIssues(context.Background(), client, "example", nil)
			if err != nil || len(issues) != 2 || calls != 2 {
				t.Fatalf("pagination failed: %v, count=%d, calls=%d", err, len(issues), calls)
			}
		})
	}
}

func TestGitLabRedirectCannotLeakToken(t *testing.T) {
	reached := false
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { reached = true }))
	defer destination.Close()
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, destination.URL, http.StatusFound) }))
	defer origin.Close()
	req, _ := http.NewRequest("GET", origin.URL, nil)
	req.Header.Set("PRIVATE-TOKEN", "synthetic")
	response, err := gitLabHTTPClient().Do(req)
	if response != nil {
		response.Body.Close()
	}
	if err == nil || reached {
		t.Fatal("cross-origin provider redirect was followed")
	}
}
