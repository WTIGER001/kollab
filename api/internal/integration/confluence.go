package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type ConfluencePageEmbed struct {
	PageID      string    `json:"pageId"`
	SpaceKey    string    `json:"spaceKey"`
	Title       string    `json:"title"`
	Author      string    `json:"author"`
	LastUpdated time.Time `json:"lastUpdated"`
	EmbedHTML   string    `json:"embedHtml"`
}

type ConfluenceIntegrationService struct{ baseURL, token string }

func NewConfluenceIntegrationService(baseURL, token string) *ConfluenceIntegrationService {
	return &ConfluenceIntegrationService{strings.TrimSuffix(baseURL, "/"), token}
}
func (c *ConfluenceIntegrationService) GetPageEmbed(ctx context.Context, pageURL string) (*ConfluencePageEmbed, error) {
	base, err := url.Parse(c.baseURL)
	if err != nil || base.Host == "" || base.Scheme != "https" && base.Scheme != "http" {
		return nil, fmt.Errorf("invalid Confluence connection URL")
	}
	page, err := url.Parse(pageURL)
	if err != nil || page.Host != base.Host || page.Scheme != base.Scheme {
		return nil, fmt.Errorf("page URL must belong to the configured Confluence connection")
	}
	id := page.Query().Get("pageId")
	parts := strings.Split(strings.Trim(page.Path, "/"), "/")
	for i, part := range parts {
		if part == "pages" && i+1 < len(parts) {
			id = parts[i+1]
			break
		}
	}
	if id == "" || strings.Trim(id, "0123456789") != "" {
		return nil, fmt.Errorf("use a Confluence page URL containing its numeric page ID")
	}
	endpoint := c.baseURL + "/rest/api/content/" + id + "?expand=body.view,space,version"
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+c.token)
	request.Header.Set("Accept", "application/json")
	client := &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if req.URL.Host != base.Host || req.URL.Scheme != base.Scheme || len(via) > 3 {
			return fmt.Errorf("Confluence redirect rejected")
		}
		return nil
	}}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Confluence returned HTTP %d", response.StatusCode)
	}
	var data struct {
		ID, Title string
		Space     struct{ Key string }
		Version   struct {
			When time.Time
			By   struct{ DisplayName string }
		}
		Body struct{ View struct{ Value string } }
	}
	if err = json.NewDecoder(io.LimitReader(response.Body, 10<<20)).Decode(&data); err != nil {
		return nil, fmt.Errorf("invalid Confluence response: %w", err)
	}
	if data.ID == "" {
		return nil, fmt.Errorf("Confluence response has no page")
	}
	return &ConfluencePageEmbed{PageID: data.ID, SpaceKey: data.Space.Key, Title: data.Title, Author: data.Version.By.DisplayName, LastUpdated: data.Version.When, EmbedHTML: data.Body.View.Value}, nil
}
