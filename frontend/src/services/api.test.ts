import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from './api';

describe('api service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // We can clear session storage which api.ts might use for tokens, though api.ts 
    // extracts token directly from oidc storage.
    sessionStorage.clear();
    
    // Mock the global fetch
    global.fetch = vi.fn();
    
    // Mock standard OIDC token retrieval if api uses it
    sessionStorage.setItem('oidc.user:http://localhost:8080:frontend', JSON.stringify({ access_token: 'fake-token' }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const mockFetchResponse = (ok: boolean, status: number, data: any) => {
    (global.fetch as any).mockResolvedValue({
      ok,
      status,
      json: async () => data,
      text: async () => typeof data === 'string' ? data : JSON.stringify(data),
    });
  };

  it('fetchTeams returns data on success', async () => {
    const mockTeams = [{ id: 'team-1', name: 'Engineering' }];
    mockFetchResponse(true, 200, mockTeams);

    const result = await api.fetchTeams();
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/teams'),
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    expect(result).toEqual(mockTeams);
  });

  it('fetchTeams throws an error on failure', async () => {
    mockFetchResponse(false, 401, { error: 'Unauthorized' });

    await expect(api.fetchTeams()).rejects.toThrow(/401|Unauthorized/);
  });

  it('fetchDocumentPermissions returns permissions data', async () => {
    const mockPerms = { classification: 'internal', inheritanceBroken: false, grants: [] };
    mockFetchResponse(true, 200, mockPerms);

    const result = await api.fetchDocumentPermissions('doc-123');
    
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/documents/doc-123/permissions'), expect.any(Object));
    expect(result).toEqual(mockPerms);
  });

  it('fetchTeamUsers returns users array', async () => {
    const mockUsers = [{ id: 'user-1', username: 'alice' }];
    mockFetchResponse(true, 200, mockUsers);

    const result = await api.fetchTeamUsers('team-1');
    
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/teams/team-1/users'), expect.any(Object));
    expect(result).toEqual(mockUsers);
  });
  
  it('generateAIContent posts correctly and returns text', async () => {
    const mockResponse = { content: 'Generated text' };
    mockFetchResponse(true, 200, mockResponse);

    const result = await api.generateAIContent('Make it shorter');
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/ai/generate'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prompt: 'Make it shorter' })
      })
    );
    expect(result).toEqual(mockResponse);
  });
});
