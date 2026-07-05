import { describe, it, expect, vi } from 'vitest';
import { getLegacyNavigateFn } from './navigation';

describe('navigation.ts: getLegacyNavigateFn', () => {
  it('returns a function that calls navigate with the correct URL', () => {
    const mockNavigate = vi.fn();
    const navigateTo = getLegacyNavigateFn(mockNavigate);
    
    // Default fallback
    navigateTo(null, null, null);
    expect(mockNavigate).toHaveBeenCalledWith('/');
    
    // Admin routes
    navigateTo('_admin', null, null);
    expect(mockNavigate).toHaveBeenCalledWith('/_admin/settings');
    
    navigateTo('_admin_help', null, null);
    expect(mockNavigate).toHaveBeenCalledWith('/_admin/help');
    
    // Global pages
    navigateTo(null, null, null, false, false, true);
    expect(mockNavigate).toHaveBeenCalledWith('/my/favorites');
    
    navigateTo(null, null, null, false, false, false, true);
    expect(mockNavigate).toHaveBeenCalledWith('/my/recents');
    
    navigateTo(null, null, null, false, false, false, false, false, false, true);
    expect(mockNavigate).toHaveBeenCalledWith('/my/tasks');
    
    navigateTo(null, null, null, false, false, false, false, false, false, false, true);
    expect(mockNavigate).toHaveBeenCalledWith('/my/mentions');
    
    // Personal space routes
    navigateTo('personal', null, null);
    expect(mockNavigate).toHaveBeenCalledWith('/personal');
    
    navigateTo('personal', null, 'doc-123');
    expect(mockNavigate).toHaveBeenCalledWith('/personal/docs/doc-123');
    
    navigateTo('personal', null, 'doc-123', false, false, false, false, true); // isAuditPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/personal/docs/doc-123/viewers');
    
    navigateTo('personal', null, null, true); // isSettings = true
    expect(mockNavigate).toHaveBeenCalledWith('/personal/_settings');
    
    navigateTo('personal', null, null, false, true); // isTeamSettings = true
    expect(mockNavigate).toHaveBeenCalledWith('/personal/_settings');
    
    navigateTo('personal', null, null, false, false, false, false, false, true); // isTrashPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/personal/trash');
    
    navigateTo('personal', null, null, false, false, false, false, false, false, false, false, true); // isImagesPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/personal/_images');
    
    navigateTo('personal', null, null, false, false, false, false, false, false, false, false, false, true); // isTemplatesPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/personal/_templates');
    
    // Team space routes (no project)
    navigateTo('team-1', null, null);
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1');
    
    navigateTo('team-1', null, 'doc-123');
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/docs/doc-123');
    
    navigateTo('team-1', null, 'doc-123', false, false, false, false, true); // isAuditPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/docs/doc-123/viewers');
    
    navigateTo('team-1', null, null, true); // isSettings = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/_settings');
    
    navigateTo('team-1', null, null, false, false, false, false, false, true); // isTrashPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/trash');
    
    navigateTo('team-1', null, null, false, false, false, false, false, false, false, false, true); // isImagesPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/_images');
    
    navigateTo('team-1', null, null, false, false, false, false, false, false, false, false, false, true); // isTemplatesPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/_templates');
    
    // Project space routes
    navigateTo('team-1', 'proj-1', null);
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/p/proj-1');
    
    navigateTo('team-1', 'proj-1', 'doc-123');
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/p/proj-1/docs/doc-123');
    
    navigateTo('team-1', 'proj-1', 'doc-123', false, false, false, false, true); // isAuditPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/p/proj-1/docs/doc-123/viewers');
    
    navigateTo('team-1', 'proj-1', null, true); // isSettings = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/p/proj-1/_settings');
    
    navigateTo('team-1', 'proj-1', null, false, false, false, false, false, true); // isTrashPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/p/proj-1/trash');
    
    navigateTo('team-1', 'proj-1', null, false, false, false, false, false, false, false, false, true); // isImagesPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/p/proj-1/_images');
    
    navigateTo('team-1', 'proj-1', null, false, false, false, false, false, false, false, false, false, true); // isTemplatesPage = true
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1/p/proj-1/_templates');
  });
});
