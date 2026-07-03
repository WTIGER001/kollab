import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTeams,
  fetchProjects,
  fetchDocuments,
  fetchSystemSettings,
  fetchUserPreferences,
} from '../services/api';
import type {
  Team,
  Project,
  Document,
  SystemSettings,
  UserPreference
} from '../services/api';

export const useTeams = (options?: { enabled?: boolean }) => {
  return useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    enabled: options?.enabled !== false,
  });
};

export const useProjects = (teamId?: string) => {
  return useQuery<Project[]>({
    queryKey: ['projects', teamId],
    queryFn: () => fetchProjects(teamId || ''),
    enabled: !!teamId,
  });
};

export const useAllProjects = () => {
  return useQuery<Project[]>({
    queryKey: ['projects', 'all'],
    queryFn: () => fetchProjects('all'),
  });
};

export const useDocuments = (projectId?: string | null, teamId?: string | null) => {
  return useQuery<Document[]>({
    queryKey: ['documents', projectId, teamId],
    queryFn: () => fetchDocuments(projectId, teamId),
  });
};

export const useSystemSettings = (options?: { enabled?: boolean }) => {
  return useQuery<SystemSettings>({
    queryKey: ['systemSettings'],
    queryFn: fetchSystemSettings,
    enabled: options?.enabled !== false,
  });
};

export const useUserPreferences = (userId?: string) => {
  return useQuery<UserPreference | null>({
    queryKey: ['userPreferences', userId],
    queryFn: () => (userId ? fetchUserPreferences(userId) : Promise.resolve(null)),
    enabled: !!userId,
  });
};
