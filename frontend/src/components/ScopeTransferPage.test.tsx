import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionContext } from '../auth/SessionContext';
import { ScopeTransferPage } from './ScopeTransferPage';
import * as api from '../services/api';
vi.mock('../services/api', () => ({
  fetchTeams: vi.fn().mockResolvedValue([{ id: 'existing', name: 'Existing team', abbreviation: 'existing' }]),
  fetchProjects: vi.fn().mockResolvedValue([]),
  fetchAllUsers: vi.fn().mockResolvedValue([{ id: 'owner', username: 'owner', displayName: 'Local owner' }]),
  fetchTeamUsers: vi.fn().mockResolvedValue([{ id: 'owner', username: 'owner' }]),
  previewScopeArchive: vi.fn(), importScopeArchive: vi.fn(), exportScopeArchive: vi.fn(),
}));
const report: api.ScopePreview = { kind: 'project', name: 'Source project', abbreviation: 'source', teamName: 'Source team', teamAbbreviation: 'source-team', createdAt: '2026-09-12T00:00:00Z', counts: {documents: 2, projects: 1, document_versions: 3}, files: 1, users: [{ id: 'remote-user', username: 'remote', name: 'Remote author', member: true }] };
function mount(admin = true) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><SessionContext.Provider value={{ token: 'mock-jwt-token', user: { id: 'owner', username: 'owner', displayName: 'Local owner', email: '', isActive: true, isAdmin: admin }, logout: vi.fn() }}><ScopeTransferPage /></SessionContext.Provider></MemoryRouter></QueryClientProvider>);
}
async function upload() {
  fireEvent.change(screen.getByLabelText('Transfer archive (.zip, up to 256 MiB)'), { target: { files: [new File(['zip'], 'source.zip', {type: 'application/zip'})] } });
  await screen.findByText('Archive preview: Source project');
  await screen.findAllByRole('option', { name: 'Local owner' });
}
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.previewScopeArchive).mockResolvedValue(report); vi.mocked(api.importScopeArchive).mockResolvedValue({ teamId: 'created-team', projectId: 'created-project', pages: 2 }); });
describe('Scope transfer', () => {
  it('creates a new parent without requiring an existing team', async () => {
    mount(); await upload();
    expect(screen.getByLabelText('New parent team name')).toHaveValue('Source team');
    expect(screen.getByRole('button', { name: 'Create project & import' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Map remote'), {target: {value: 'owner'}});
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create project & import' }));
    await screen.findByText('Import complete');
    expect(api.importScopeArchive).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({teamId: '', teamName: 'Source team', ownerId: 'owner', userMap: {'remote-user':'owner'}}));
    expect(screen.getByRole('link', {name: 'Open imported project'})).toHaveAttribute('href', '/teams/created-team/p/created-project');
  });
  it('allows an existing parent and resets access confirmation after a destination change', async () => {
    mount(); await upload();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Parent team'), {target: {value: 'existing'}});
    expect(screen.queryByLabelText('New parent team name')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await waitFor(() => expect(api.fetchTeamUsers).toHaveBeenCalledWith('existing'));
    await waitFor(() => expect(screen.getByLabelText('Local owner').querySelector('option[value="owner"]')).not.toBeNull());
    fireEvent.change(screen.getByLabelText('Local owner'), {target: {value: 'owner'}});
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', {name: 'Create project & import'}));
    await screen.findByText('Import complete');
    expect(api.importScopeArchive).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({teamId: 'existing'}));
  });
  it('blocks destination conflicts and shows server failures without claiming success', async () => {
    mount(); await upload();
    fireEvent.change(screen.getByLabelText('New parent team name'), {target: {value: 'Existing team'}});
    expect(screen.getByRole('alert')).toHaveTextContent('already in use');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', {name: 'Create project & import'})).toBeDisabled();
    fireEvent.change(screen.getByLabelText('New parent team name'), {target: {value: 'New team'}});
    vi.mocked(api.importScopeArchive).mockRejectedValueOnce(new Error('Disk full; import rolled back'));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', {name: 'Create project & import'}));
    await screen.findByText('Disk full; import rolled back');
    expect(screen.queryByText('Import complete')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('discards the old preview when a replacement archive is invalid', async () => {
    mount(); await upload();
    vi.mocked(api.previewScopeArchive).mockRejectedValueOnce(new Error('Invalid ZIP'));
    fireEvent.change(screen.getByLabelText('Transfer archive (.zip, up to 256 MiB)'), {target: {files: [new File(['bad'], 'bad.zip')]}});
    await screen.findByText('Invalid ZIP');
    expect(screen.queryByRole('button', {name: 'Create project & import'})).not.toBeInTheDocument();
    expect(api.importScopeArchive).not.toHaveBeenCalled();
  });
  it('requires administrator access', () => { mount(false); expect(screen.getByText('Server administrator access is required.')).toBeInTheDocument(); expect(screen.queryByRole('button')).not.toBeInTheDocument(); });
});
