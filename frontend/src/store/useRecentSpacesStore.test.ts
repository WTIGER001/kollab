import { describe, it, expect, beforeEach } from 'vitest';
import { useRecentSpacesStore } from './useRecentSpacesStore';

describe('useRecentSpacesStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useRecentSpacesStore.setState({
      recentSpaces: [
        { id: 'team-1', name: 'team-1', type: 'team' },
        { id: 'proj-1', name: 'proj-1', type: 'project' },
        { id: 'deleted-team', name: 'deleted-team', type: 'team' },
        { id: 'deleted-proj', name: 'deleted-proj', type: 'project' },
        { id: 'personal-1', name: 'personal-1', type: 'personal' },
      ],
    });
  });

  it('filters out stale or deleted spaces correctly on sync', () => {
    const { syncSpaces } = useRecentSpacesStore.getState();
    
    const activeTeams = [
      { id: 'team-1' },
      { id: 'personal-1' }, // personal spaces are matched against teams array
    ];
    
    const activeProjects = [
      { id: 'proj-1' },
    ];
    
    syncSpaces(activeTeams, activeProjects);
    
    const state = useRecentSpacesStore.getState();
    expect(state.recentSpaces).toHaveLength(3);
    
    const spaceIds = state.recentSpaces.map(s => s.id);
    expect(spaceIds).toContain('team-1');
    expect(spaceIds).toContain('proj-1');
    expect(spaceIds).toContain('personal-1');
    
    expect(spaceIds).not.toContain('deleted-team');
    expect(spaceIds).not.toContain('deleted-proj');
  });

  it('matches by abbreviation as well as id', () => {
    // Some older cache entries might have used abbreviation as ID
    useRecentSpacesStore.setState({
      recentSpaces: [
        { id: 'TEAM', name: 'TEAM', type: 'team' },
        { id: 'PROJ', name: 'PROJ', type: 'project' },
      ],
    });
    
    const { syncSpaces } = useRecentSpacesStore.getState();
    
    const activeTeams = [{ id: 'team-1', abbreviation: 'TEAM' }];
    const activeProjects = [{ id: 'proj-1', abbreviation: 'PROJ' }];
    
    syncSpaces(activeTeams, activeProjects);
    
    const state = useRecentSpacesStore.getState();
    expect(state.recentSpaces).toHaveLength(2);
  });
});
