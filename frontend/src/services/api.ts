export interface Team {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  teamId: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  projectId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
  paper: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
}

export interface WorkspaceTheme {
  id: string;
  name: string;
  logoUrl: string;
  lightMode: ColorScheme;
  darkMode: ColorScheme;
  isDefault: boolean;
}

export interface UserPreference {
  userId: string;
  themeMode: "light" | "dark";
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  versionNumber: number;
  createdBy: string | null;
  changeSummary: string | null;
  createdAt: string;
}

const BASE_URL = "http://localhost:8080";
let apiToken: string | null = null;

export const setApiToken = (token: string | null) => {
  apiToken = token;
};

const request = async (path: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
};

export const fetchTeams = (): Promise<Team[]> => {
  return request("/api/teams");
};

export const fetchProjects = (teamId?: string): Promise<Project[]> => {
  const url = teamId ? `/api/projects?teamId=${teamId}` : "/api/projects";
  return request(url);
};

export const fetchDocuments = (projectId: string): Promise<Document[]> => {
  return request(`/api/documents?projectId=${projectId}`);
};

export const createDocument = (
  title: string,
  projectId: string,
  parentId?: string | null
): Promise<Document> => {
  return request("/api/documents", {
    method: "POST",
    body: JSON.stringify({ title, projectId, parentId: parentId || null }),
  });
};

export const updateDocument = (
  id: string,
  title: string,
  content: string
): Promise<Document> => {
  return request(`/api/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title, content }),
  });
};

export const deleteDocument = (id: string): Promise<void> => {
  return request(`/api/documents/${id}`, {
    method: "DELETE",
  });
};

export const fetchOIDCConfig = (): Promise<{
  authority: string;
  clientId: string;
  redirectUri: string;
  theme: WorkspaceTheme | null;
}> => {
  return fetch(`${BASE_URL}/api/auth/config`).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch OIDC configuration");
    return res.json();
  });
};

export const fetchUserPreferences = (): Promise<UserPreference> => {
  return request("/api/users/preferences");
};

export const updateUserPreferences = (themeMode: "light" | "dark"): Promise<UserPreference> => {
  return request("/api/users/preferences", {
    method: "PUT",
    body: JSON.stringify({ themeMode }),
  });
};

export const updateWorkspaceTheme = (
  name: string,
  logoUrl: string,
  lightMode: ColorScheme,
  darkMode: ColorScheme
): Promise<WorkspaceTheme> => {
  return request("/api/theme", {
    method: "PUT",
    body: JSON.stringify({ name, logoUrl, lightMode, darkMode }),
  });
};

export const uploadImage = (file: File): Promise<{
  id: string;
  filename: string;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
}> => {
  const formData = new FormData();
  formData.append("image", file);

  const headers = new Headers();
  if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }

  return fetch(`${BASE_URL}/api/images`, {
    method: "POST",
    headers,
    body: formData,
  }).then((res) => {
    if (!res.ok) {
      return res.text().then((text) => {
        throw new Error(text || "Failed to upload image");
      });
    }
    return res.json();
  });
};

export const fetchVersions = (docId: string): Promise<DocumentVersion[]> => {
  return request(`/api/documents/${docId}/versions`);
};

export const fetchVersion = (docId: string, versionId: string): Promise<DocumentVersion> => {
  return request(`/api/documents/${docId}/versions/${versionId}`);
};

export const restoreVersion = (docId: string, versionId: string): Promise<Document> => {
  return request(`/api/documents/${docId}/versions/${versionId}/restore`, {
    method: "POST",
  });
};

export const createMilestone = (docId: string, summary: string): Promise<DocumentVersion> => {
  return request(`/api/documents/${docId}/versions`, {
    method: "POST",
    body: JSON.stringify({ summary }),
  });
};

export const searchDocuments = (projectId: string, query: string): Promise<Document[]> => {
  return request(`/api/search?q=${encodeURIComponent(query)}&projectId=${projectId}`);
};
