export interface Team {
  id: string;
  name: string;
  abbreviation?: string;
  description?: string;
  logoUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  teamId: string;
  logoUrl: string;
  abbreviation: string;
  description: string;
}

export interface Document {
  id: string;
  title: string;
  slug: string;
  content: string;
  projectId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  deletedAt?: string;
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

export interface Task {
  id: string;
  documentId: string;
  docTitle?: string;
  content: string;
  assignee: string;
  dueDate: string | null;
  completed: boolean;
  projectId: string | null;
  teamId: string;
  createdAt: string;
  updatedAt: string;
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

export type TemplateScope = "system" | "team" | "personal";
export type TemplateType = "page" | "block";

export interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  scope: TemplateScope;
  templateType: TemplateType;
  teamId?: string;
  userId?: string;
  createdAt: string;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:8080" : window.location.origin);
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "ws://localhost:8080" : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`);

const BASE_URL = API_BASE_URL;
let apiToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export const setApiToken = (token: string | null) => {
  apiToken = token;
};

export const setOnUnauthorized = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

const request = async (path: string, options: RequestInit & { suppress401?: boolean } = {}) => {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (onUnauthorizedCallback && !options.suppress401) {
        onUnauthorizedCallback();
      }
    }
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
};

export interface MigrationIssue {
  level: "info" | "warning" | "error";
  code: string;
  entry?: string;
  message: string;
}

export interface ConfluencePreflightReport {
  spaceKey: string;
  spaceName: string;
  totalPages: number;
  totalAttachments: number;
  pages: Array<{ sourcePath: string; title: string }>;
  detectedMacros: Array<{ macro: string; count: number; supported: boolean }>;
  issues: MigrationIssue[];
}

export interface ConfluenceMigrationSummary {
  spaceKey: string;
  spaceName: string;
  totalPages: number;
  totalAttachments: number;
  successCount: number;
  skippedCount: number;
  durationMs: number;
  warnings: string[];
  issues: MigrationIssue[];
}

const confluenceForm = (file: File, teamId?: string, projectId?: string) => {
  const form = new FormData();
  form.append("backup", file);
  if (teamId) form.append("teamId", teamId);
  if (projectId) form.append("projectId", projectId);
  return form;
};

export const preflightConfluenceImport = (file: File): Promise<ConfluencePreflightReport> =>
  request("/api/migration/confluence/preview", { method: "POST", body: confluenceForm(file) });

export const importConfluenceArchive = (file: File, teamId: string, projectId: string): Promise<ConfluenceMigrationSummary> =>
  request("/api/migration/confluence/import", { method: "POST", body: confluenceForm(file, teamId, projectId) });

export interface DocumentProperty {
  documentId: string;
  title: string;
  projectId: string;
  teamId: string;
  key: string;
  value: string;
  valueType: string;
  updatedAt: string;
}

export const fetchDocumentProperties = (projectId?: string | null, teamId?: string | null, key?: string): Promise<DocumentProperty[]> => {
  const parameters = new URLSearchParams();
  if (projectId) parameters.set("projectId", projectId);
  if (teamId) parameters.set("teamId", teamId);
  if (key) parameters.set("key", key);
  return request(`/api/documents/properties?${parameters.toString()}`);
};

export const fetchTeams = (): Promise<Team[]> => {
  return request("/api/teams");
};

export const fetchTeamUsers = (teamId: string): Promise<{ id: string; username: string }[]> => {
  return request(`/api/teams/${teamId}/users`);
};

export const fetchTasks = (username: string): Promise<Task[]> => {
  return request(`/api/tasks?username=${encodeURIComponent(username)}`);
};

export const fetchProjects = async (teamId?: string): Promise<Project[]> => {
  const url = teamId ? `/api/projects?teamId=${teamId}` : "/api/projects";
  try {
    return await request(url, { suppress401: true });
  } catch (err: any) {
    if (err.message && err.message.includes("401")) {
      return [];
    }
    throw err;
  }
};

export const fetchDocuments = (projectId?: string | null, teamId?: string | null): Promise<Document[]> => {
  if (projectId) {
    return request(`/api/documents?projectId=${projectId}`);
  }
  return request(`/api/documents?teamId=${teamId}`);
};

export const createDocument = (
  title: string,
  projectId: string | null,
  teamId: string,
  parentId?: string | null,
  slug?: string
): Promise<Document> => {
  return request("/api/documents", {
    method: "POST",
    body: JSON.stringify({ title, projectId, teamId, parentId: parentId || null, slug }),
  });
};

export const updateDocument = (
  id: string,
  title: string,
  content: string,
  changeSummary?: string,
  slug?: string
): Promise<Document> => {
  return request(`/api/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title, content, changeSummary, slug }),
  });
};

export const moveDocument = (
  id: string,
  parentId: string | null,
  projectId?: string,
  teamId?: string
): Promise<Document> => {
  return request(`/api/documents/${id}/move`, {
    method: "PUT",
    body: JSON.stringify({ parentId, projectId, teamId }),
  });
};

export const autogenSummary = (
  id: string,
  content: string,
  title?: string
): Promise<{ summary: string }> => {
  return request(`/api/documents/${id}/autogen-summary`, {
    method: "POST",
    body: JSON.stringify({ content, title }),
  });
};

export const deleteDocument = (id: string, permanent?: boolean): Promise<void> => {
  const url = permanent ? `/api/documents/${id}?permanent=true` : `/api/documents/${id}`;
  return request(url, {
    method: "DELETE",
  });
};

export const fetchTrash = (
  projectId?: string | null,
  teamId?: string | null
): Promise<Document[]> => {
  if (projectId) {
    return request(`/api/documents/trash?projectId=${projectId}`);
  }
  return request(`/api/documents/trash?teamId=${teamId}`);
};

export const restoreDocument = (id: string): Promise<Document> => {
  return request(`/api/documents/${id}/restore`, {
    method: "POST",
  });
};

export const checkSlug = (
  slug: string,
  documentId?: string
): Promise<{ available: boolean; suggested?: string }> => {
  const url = new URL(`${BASE_URL}/api/documents/check-slug`);
  url.searchParams.append("slug", slug);
  if (documentId) {
    url.searchParams.append("documentId", documentId);
  }
  return request(url.pathname + url.search);
};

export const fetchOIDCConfig = (): Promise<{
  authority: string;
  clientId: string;
  redirectUri: string;
  theme: WorkspaceTheme | null;
  welcomeTitle?: string;
  welcomeText?: string;
  authLogoUrl?: string;
  authLogoSize?: string;
  legalDisclaimer?: string;
  authLoginButtonText?: string;
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
      if (res.status === 401 && onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
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

export const searchDocuments = (projectId: string, query: string, mode: "ai" | "keyword" = "ai"): Promise<Document[]> => {
  return request(`/api/search?q=${encodeURIComponent(query)}&projectId=${encodeURIComponent(projectId)}&mode=${encodeURIComponent(mode)}`);
};

export interface AnalyticsDataPoint {
  date: string;
  views: number;
  uniqueVisitors: number;
}

export interface DocumentAnalytics {
  totalViews: number;
  totalVisitors: number;
  trendPercentage: number;
  history: AnalyticsDataPoint[];
}

export const fetchDocument = (id: string): Promise<Document> => {
  return request(`/api/documents/${id}`);
};

export const fetchDocumentAnalytics = (docId: string): Promise<DocumentAnalytics> => {
  return request(`/api/documents/${docId}/analytics`);
};

export const updateTeamSettings = async (
  teamId: string,
  name: string,
  abbreviation: string,
  description: string,
  logoUrl?: string
): Promise<Team> => {
  return request(`/api/teams/${encodeURIComponent(teamId)}`, {
    method: "PUT",
    body: JSON.stringify({ name, abbreviation, description, logoUrl }),
  });
};

export const updateProjectSettings = (
  id: string,
  name: string,
  logoUrl: string,
  abbreviation: string,
  description: string
): Promise<Project> => {
  return request(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, logoUrl, abbreviation, description }),
  });
};

export const fetchTeamByAbbreviation = (abbreviation: string): Promise<Team> => {
  return request(`/api/teams/by-abbreviation/${encodeURIComponent(abbreviation)}`);
};

export const createTeam = (
  name: string,
  abbreviation: string,
  description: string
): Promise<Team> => {
  return request("/api/teams", {
    method: "POST",
    body: JSON.stringify({ name, abbreviation, description }),
  });
};

export const createProject = (
  teamId: string,
  name: string,
  abbreviation: string,
  description: string,
  logoUrl?: string
): Promise<Project> => {
  return request("/api/projects", {
    method: "POST",
    body: JSON.stringify({ teamId, name, abbreviation, description, logoUrl: logoUrl || "" }),
  });
};

export interface Favorite {
  userId: string;
  documentId: string;
  title: string;
  spaceType: "team" | "project" | "personal";
  spaceName: string;
  lastAccessedAt: string;
  createdAt: string;
}

export const fetchFavorites = (): Promise<Favorite[]> => {
  return request("/api/favorites");
};

export const addFavorite = (documentId: string): Promise<{ status: string }> => {
  return request(`/api/favorites/${encodeURIComponent(documentId)}`, {
    method: "POST"
  });
};

export const removeFavorite = (documentId: string): Promise<{ status: string }> => {
  return request(`/api/favorites/${encodeURIComponent(documentId)}`, {
    method: "DELETE"
  });
};

export const isFavorite = (documentId: string): Promise<boolean> => {
  return request(`/api/favorites/${encodeURIComponent(documentId)}/status`)
    .then(res => !!res.isFavorite);
};

export const addWatch = (documentId: string): Promise<{ status: string }> => {
  return request(`/api/watches/${encodeURIComponent(documentId)}`, {
    method: "POST"
  });
};

export const removeWatch = (documentId: string): Promise<{ status: string }> => {
  return request(`/api/watches/${encodeURIComponent(documentId)}`, {
    method: "DELETE"
  });
};

export const isWatching = (documentId: string): Promise<boolean> => {
  return request(`/api/watches/${encodeURIComponent(documentId)}/status`)
    .then(res => !!res.isWatching);
};

export const fetchRecentDocuments = (type: "views" | "edits" | "both" = "both"): Promise<Document[]> => {
  return request(`/api/documents/recent?type=${encodeURIComponent(type)}`);
};

export interface SystemSettings {
  auditRetentionPolicy: string;
  auditRetentionCustomDays: number;
  auditLogDestination: string;
  trashRetentionPolicy: string;
  trashRetentionCustomDays: number;
  welcomeTitle: string;
  welcomeText: string;
  authLogoUrl: string;
  authLogoSize: string;
  authLegalDisclaimer: string;
  authLoginButtonText: string;
  aiRateLimit: number;
  asposeEnabled: boolean;
  asposeLicense: string;
}

export interface AuditLogEntry {
  id: string;
  documentId: string;
  userId: string;
  action: "view" | "edit";
  createdAt: string;
  userDisplayName: string;
  userEmail: string;
}

export const fetchSystemSettings = (): Promise<SystemSettings> => {
  return request("/api/system/settings");
};

export const updateSystemSettings = (settings: SystemSettings): Promise<SystemSettings> => {
  return request("/api/system/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
};

export const generateAIContent = (prompt: string): Promise<{ text: string }> => {
  return request("/api/ai/generate", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
};

export const fetchDocumentAuditLogs = (docId: string): Promise<AuditLogEntry[]> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/audit`);
};

export interface Comment {
  id: string;
  documentId: string;
  parentId?: string | null;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export const fetchComments = (docId: string): Promise<Comment[]> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/comments`);
};

export const createComment = (
  docId: string,
  parentId: string | null,
  content: string
): Promise<Comment> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ parentId, content }),
  });
};

export const updateComment = (id: string, content: string): Promise<Comment> => {
  return request(`/api/comments/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
};

export const deleteComment = (id: string): Promise<void> => {
  return request(`/api/comments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export interface Attachment {
  id: string;
  documentId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  uploadedBy: string;
  uploadedAt: string;
}

export const fetchAttachments = (docId: string): Promise<Attachment[]> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/attachments`);
};

export interface PreviewStatus {
  attachmentId: string;
  status: 'pending' | 'converting_aspose' | 'converting_libreoffice' | 'completed' | 'failed';
  progress: number;
  format: 'html' | 'pdf' | '';
  errorMessage?: string;
  updatedAt: string;
}

export const fetchPreviewStatus = (attachmentId: string): Promise<PreviewStatus> => {
  return request(`/api/attachments/${encodeURIComponent(attachmentId)}/preview/status`);
};

export const retryPreviewGeneration = (attachmentId: string): Promise<void> => {
  return request(`/api/attachments/${encodeURIComponent(attachmentId)}/preview/retry`, {
    method: "POST",
  });
};

export const getApiToken = (): string | null => {
  return apiToken;
};

export const uploadAttachment = (docId: string, file: File): Promise<Attachment> => {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }

  return fetch(`${BASE_URL}/api/documents/${encodeURIComponent(docId)}/attachments`, {
    method: "POST",
    headers,
    body: formData,
  }).then((res) => {
    if (!res.ok) {
      if (res.status === 401 && onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      return res.text().then((text) => {
        throw new Error(text || "Failed to upload attachment");
      });
    }
    return res.json();
  });
};

export const deleteAttachment = (id: string): Promise<void> => {
  return request(`/api/attachments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export interface Tag {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  pageCount?: number;
}

export const fetchTags = (): Promise<Tag[]> => {
  return request("/api/tags");
};

export const createTag = (name: string, description: string, color: string): Promise<Tag> => {
  return request("/api/tags", {
    method: "POST",
    body: JSON.stringify({ name, description, color }),
  });
};

export const updateTag = (id: string, name: string, description: string, color: string): Promise<Tag> => {
  return request(`/api/tags/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ name, description, color }),
  });
};

export const deleteTag = (id: string): Promise<void> => {
  return request(`/api/tags/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const fetchDocumentTags = (docId: string): Promise<Tag[]> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/tags`);
};

export const addTagToDocument = (docId: string, tagId: string): Promise<void> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/tags/${encodeURIComponent(tagId)}`, {
    method: "POST",
  });
};

export const removeTagFromDocument = (docId: string, tagId: string): Promise<void> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/tags/${encodeURIComponent(tagId)}`, {
    method: "DELETE",
  });
};

export const fetchAllDocumentTags = (): Promise<Record<string, Tag[]>> => {
  return request("/api/tags/document-associations");
};

export const fetchUserMentions = (username: string): Promise<DocumentItem[]> => {
  return request(`/api/mentions?username=${encodeURIComponent(username)}`);
};

export const downloadDocumentExport = async (documentId: string, format: string, hierarchy: boolean, title: string) => {
  const headers = new Headers();
  if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }

  const res = await fetch(`${BASE_URL}/api/documents/${documentId}/export?format=${format}&hierarchy=${hierarchy ? "true" : "false"}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export failed with status ${res.status}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  
  let extension = "json";
  if (format === "html") {
    extension = hierarchy ? "zip" : "html";
  } else if (format === "pdf") {
    extension = "pdf";
  } else if (format === "word") {
    extension = "docx";
  }

  const cleanTitle = title.replace(/[/\\?%*:|"<>.]/g, "_").trim() || "Untitled_Page";
  a.download = `${cleanTitle}.${extension}`;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const importDocumentHierarchy = (teamId: string, projectId: string | null, parentId: string | null, tree: any): Promise<any> => {
  return request("/api/documents/import", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      projectId,
      parentId,
      tree,
    }),
  });
};

export interface PermissionGrant {
  id: number;
  granteeType: "user" | "group";
  granteeId: string;
  roleId: string;
}

export interface DocumentPermissionsResponse {
  documentId: string;
  classification: "public" | "internal" | "confidential" | "pii";
  inheritanceBroken: boolean;
  projectId: string;
  teamId: string;
  grants: PermissionGrant[];
}

export interface ShareLink {
  tokenHash: string;
  roleId: string;
  scope: "anyone" | "organization";
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateShareLinkResponse {
  token: string;
  documentId: string;
  roleId: string;
  scope: string;
  expiresAt: string | null;
}

export const fetchDocumentPermissions = (docId: string): Promise<DocumentPermissionsResponse> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/permissions`);
};

export const addPermissionGrant = (
  docId: string,
  granteeType: "user" | "group",
  granteeId: string,
  roleId: string
): Promise<void> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/permissions/grants`, {
    method: "POST",
    body: JSON.stringify({ granteeType, granteeId, roleId }),
  });
};

export const deletePermissionGrant = (docId: string, grantId: number): Promise<void> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/permissions/grants/${encodeURIComponent(grantId)}`, {
    method: "DELETE",
  });
};

export const updatePermissionSettings = (
  docId: string,
  classification: "public" | "internal" | "confidential" | "pii",
  inheritanceBroken: boolean
): Promise<void> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/permissions/settings`, {
    method: "PUT",
    body: JSON.stringify({ classification, inheritanceBroken }),
  });
};

export const createShareLink = (
  docId: string,
  roleId: string,
  scope: "anyone" | "organization",
  password?: string,
  expiresInDays?: number
): Promise<CreateShareLinkResponse> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/permissions/share-links`, {
    method: "POST",
    body: JSON.stringify({ roleId, scope, password, expiresInDays }),
  });
};

export const fetchShareLinks = (docId: string): Promise<ShareLink[]> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/permissions/share-links`);
};

export const deleteShareLink = (docId: string, linkId: string): Promise<void> => {
  return request(`/api/documents/${encodeURIComponent(docId)}/permissions/share-links/${encodeURIComponent(linkId)}`, {
    method: "DELETE",
  });
};

export interface UserDirectoryItem {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
}

export const fetchAllUsers = (): Promise<UserDirectoryItem[]> => {
  return request("/api/users");
};

export const addTeamMember = (teamId: string, userId: string): Promise<void> => {
  return request(`/api/teams/${encodeURIComponent(teamId)}/users`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
};

export const removeTeamMember = (teamId: string, userId: string): Promise<void> => {
  return request(`/api/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
};

export const downloadBackup = async (): Promise<Blob> => {
  const headers = new Headers();
  if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }
  const res = await fetch(`${BASE_URL}/api/system/backup`, {
    headers,
  });
  if (!res.ok) {
    if (res.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.blob();
};

export const downloadSyncExport = async (sinceId: string): Promise<Blob> => {
  const headers = new Headers();
  if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }
  const res = await fetch(`${BASE_URL}/api/system/sync/export?since_id=${encodeURIComponent(sinceId)}`, {
    headers,
  });
  if (!res.ok) {
    if (res.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.blob();
};

export const restoreBackup = async (formData: FormData): Promise<{ message: string }> => {
  const headers = new Headers();
  if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }
  const res = await fetch(`${BASE_URL}/api/system/restore`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json();
};

export const importSyncPackage = async (formData: FormData): Promise<{ message: string; importedCount?: number }> => {
  const headers = new Headers();
  if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }
  const res = await fetch(`${BASE_URL}/api/system/sync/import`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json();
};

export interface LibraryImage {
  id: string;
  filename: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  scope: "system" | "team" | "project" | "personal";
  teamId?: string | null;
  projectId?: string | null;
  uploadedBy: string;
  createdAt: string;
}

const getHeaders = (isFormData = false) => {
  const headers: HeadersInit = {};
  if (apiToken) {
    headers["Authorization"] = `Bearer ${apiToken}`;
  }
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    if (res.status === 401) {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

export const fetchLibraryImages = async (scope: string, teamId?: string | null, projectId?: string | null): Promise<LibraryImage[]> => {
  const query = new URLSearchParams({ scope });
  if (teamId) query.append("teamId", teamId);
  if (projectId) query.append("projectId", projectId);

  const res = await fetch(`${BASE_URL}/api/library/images?${query.toString()}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const uploadLibraryImage = async (file: File, scope: string, teamId?: string | null, projectId?: string | null): Promise<LibraryImage> => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("scope", scope);
  if (teamId) formData.append("teamId", teamId);
  if (projectId) formData.append("projectId", projectId);

  const res = await fetch(`${BASE_URL}/api/library/images`, {
    method: "POST",
    headers: getHeaders(true), // Assuming getHeaders(true) does not set Content-Type so the browser sets it with boundaries
    body: formData,
  });
  return handleResponse(res);
};

export const updateLibraryImageName = async (id: string, displayName: string): Promise<LibraryImage> => {
  const res = await fetch(`${BASE_URL}/api/library/images/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ displayName }),
  });
  return handleResponse(res);
};

export const deleteLibraryImage = async (id: string): Promise<void> => {
  const res = await fetch(`${BASE_URL}/api/library/images/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const getTemplate = async (id: string): Promise<Template> => {
  const res = await fetch(`${BASE_URL}/api/templates/${id}`, { headers: getHeaders() });
  return handleResponse(res);
};

export const getTemplates = async (params?: { scope?: string; templateType?: string; teamId?: string; userId?: string }): Promise<Template[]> => {
  const url = new URL(`${BASE_URL}/api/templates`);
  if (params) {
    if (params.scope) url.searchParams.append("scope", params.scope);
    if (params.templateType) url.searchParams.append("templateType", params.templateType);
    if (params.teamId) url.searchParams.append("teamId", params.teamId);
    if (params.userId) url.searchParams.append("userId", params.userId);
  }
  const res = await fetch(url.toString(), { headers: getHeaders() });
  return handleResponse(res);
};

export const createTemplate = async (template: Partial<Template>): Promise<Template> => {
  const res = await fetch(`${BASE_URL}/api/templates`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(template),
  });
  return handleResponse(res);
};

export const updateTemplate = async (id: string, template: Partial<Template>): Promise<Template> => {
  const res = await fetch(`${BASE_URL}/api/templates/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(template),
  });
  return handleResponse(res);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  const res = await fetch(`${BASE_URL}/api/templates/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(res);
};
