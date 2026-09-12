import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Space {
  id: string;
  name: string;
  type: 'personal' | 'team' | 'project';
  [key: string]: any;
}

interface RecentSpacesState {
  recentSpaces: Space[];
  syncSpaces: (teams: any[], allProjects: any[]) => void;
}

export const useRecentSpacesStore = create<RecentSpacesState>()(
  persist(
    (set, get) => ({
      recentSpaces: [],
      syncSpaces: (teams, allProjects) => {
        const { recentSpaces } = get();
        const filtered = recentSpaces.filter(space => {
          if (space.type === 'personal' || space.type === 'team') {
            return teams.some(t => t.id === space.id || t.abbreviation === space.id);
          }
          if (space.type === 'project') {
            return allProjects.some(p => p.id === space.id || p.abbreviation === space.id);
          }
          return false;
        });

        if (filtered.length !== recentSpaces.length) {
          set({ recentSpaces: filtered });
        }
      },
    }),
    {
      name: 'recent_spaces',
    }
  )
);
