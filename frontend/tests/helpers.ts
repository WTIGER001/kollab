import { Page } from '@playwright/test';

export async function setupMockAPI(page: Page) {
  // Mock OIDC config to fallback to mock mode
  await page.route('**/api/auth/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authority: 'https://mock-authority.logto.app/oidc',
        clientId: 'mock-client-id',
        redirectUri: 'http://localhost:5173',
        theme: null,
      }),
    });
  });

  // Mock user preferences
  await page.route('**/api/users/preferences', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 'user-1',
        themeMode: 'dark',
        updatedAt: new Date().toISOString(),
      }),
    });
  });

  // Mock teams
  await page.route('**/api/teams', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'team-1', name: 'Mock Workspace' },
      ]),
    });
  });

  // Mock projects
  await page.route('**/api/projects*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'proj-1', name: 'Design Project', teamId: 'team-1' },
      ]),
    });
  });

  // Mock documents
  await page.route(/\/api\/documents/, async (route) => {
    const url = route.request().url();
    if (url.includes('/analytics')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalViews: 1248,
          totalVisitors: 412,
          trendPercentage: 12,
          history: [
            { date: '2026-06-08', views: 90, uniqueVisitors: 14 },
            { date: '2026-06-09', views: 94, uniqueVisitors: 10 },
            { date: '2026-06-10', views: 68, uniqueVisitors: 22 },
            { date: '2026-06-11', views: 82, uniqueVisitors: 18 },
            { date: '2026-06-12', views: 40, uniqueVisitors: 36 },
            { date: '2026-06-13', views: 52, uniqueVisitors: 30 },
            { date: '2026-06-14', views: 32, uniqueVisitors: 42 },
          ]
        })
      });
      return;
    }

    if (route.request().method() === 'PUT') {
      const payload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'doc-1',
          title: payload.title || 'Welcome Document',
          content: payload.content || '',
          projectId: 'proj-1',
          parentId: null,
          updatedAt: new Date().toISOString(),
        }),
      });
      return;
    }

    // Check if it is a request for a single document
    const pathname = new URL(url).pathname;
    const docIdMatch = pathname.match(/\/api\/documents\/([^/]+)$/);
    if (docIdMatch) {
      const docId = docIdMatch[1];
      let docTitle = 'Welcome Document';
      let docContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Welcome to the mock editor canvas. Type something!' }],
          },
        ],
      });

      if (docId === 'team-1') {
        docTitle = 'Mock Workspace';
        docContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Mock Workspace' }],
            },
          ],
        });
      } else if (docId === 'proj-1') {
        docTitle = 'Design Project';
        docContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Design Project' }],
            },
          ],
        });
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: docId,
          title: docTitle,
          content: docContent,
          projectId: 'proj-1',
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'doc-1',
          title: 'Welcome Document',
          content: JSON.stringify({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Welcome to the mock editor canvas. Type something!' }],
              },
            ],
          }),
          projectId: 'proj-1',
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    });
  });
}
