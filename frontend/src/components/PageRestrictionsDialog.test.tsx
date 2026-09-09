import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageRestrictionsDialog } from './PageRestrictionsDialog';
import * as api from '../services/api';

// Mock the API services
vi.mock('../services/api', () => ({
  fetchDocumentPermissions: vi.fn(),
  fetchTeams: vi.fn(),
  fetchTeamUsers: vi.fn(),
  updatePermissionSettings: vi.fn(),
  addPermissionGrant: vi.fn(),
  deletePermissionGrant: vi.fn(),
}));

describe('PageRestrictionsDialog', () => {
  const mockDocId = 'doc-123';
  const mockDocTitle = 'Test Document';
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful API responses
    (api.fetchDocumentPermissions as any).mockResolvedValue({
      classification: 'internal',
      inheritanceBroken: false,
      projectId: 'proj-1',
      teamId: 'team-1',
      grants: [
        { id: 1, granteeType: 'user', granteeId: 'user-1', granteeName: 'Alice', roleId: 'builtin.wiki.document.viewer' }
      ]
    });
    
    (api.fetchTeams as any).mockResolvedValue([
      { id: 'team-1', name: 'Engineering', abbreviation: 'ENG' }
    ]);
    
    (api.fetchTeamUsers as any).mockResolvedValue([
      { id: 'user-1', username: 'Alice' },
      { id: 'user-2', username: 'Bob' }
    ]);
    
    (api.updatePermissionSettings as any).mockResolvedValue({});
    (api.addPermissionGrant as any).mockResolvedValue({});
    (api.deletePermissionGrant as any).mockResolvedValue({});
  });

  it('renders the dialog when open is true', async () => {
    render(
      <PageRestrictionsDialog 
        open={true} 
        onClose={mockOnClose} 
        documentId={mockDocId} 
        documentTitle={mockDocTitle} 
      />
    );
    
    expect(screen.getByText('Page Access & Restrictions')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText((content, element) => content.includes('Test Document'))).toBeInTheDocument();
      expect(api.fetchDocumentPermissions).toHaveBeenCalledWith(mockDocId);
    });
  });

  it('does not render when open is false', () => {
    render(
      <PageRestrictionsDialog 
        open={false} 
        onClose={mockOnClose} 
        documentId={mockDocId} 
        documentTitle={mockDocTitle} 
      />
    );
    
    expect(screen.queryByText('Page Access & Restrictions')).not.toBeInTheDocument();
  });

  it('displays the list of grants', async () => {
    render(
      <PageRestrictionsDialog 
        open={true} 
        onClose={mockOnClose} 
        documentId={mockDocId} 
        documentTitle={mockDocTitle} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('calls updatePermissionSettings when saving settings', async () => {
    render(
      <PageRestrictionsDialog 
        open={true} 
        onClose={mockOnClose} 
        documentId={mockDocId} 
        documentTitle={mockDocTitle} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Save Settings'));
    
    await waitFor(() => {
      expect(api.updatePermissionSettings).toHaveBeenCalledWith(mockDocId, 'internal', false);
      expect(screen.getByText('Page access settings updated successfully.')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (api.fetchDocumentPermissions as any).mockRejectedValue(new Error('Permission Denied'));
    
    render(
      <PageRestrictionsDialog 
        open={true} 
        onClose={mockOnClose} 
        documentId={mockDocId} 
        documentTitle={mockDocTitle} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Permission Denied')).toBeInTheDocument();
    });
  });
});
