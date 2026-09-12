import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './MainLayout';
import { useAppStore } from '../store/useAppStore';

const viewport = vi.hoisted(() => ({ mobile: false }));
vi.mock('@mui/material', async (original) => ({ ...await original<typeof import('@mui/material')>(), useMediaQuery: () => viewport.mobile }));
vi.mock('../auth/SessionContext', () => ({ useSession: () => ({ user: { id: 'admin', username: 'admin', isAdmin: true }, logout: vi.fn() }) }));
vi.mock('../hooks/queries', () => ({
  useTeams: () => ({ data: [] }), useAllProjects: () => ({ data: [] }),
  useDocuments: () => ({ data: [], refetch: vi.fn() }), useSystemSettings: () => ({ data: {} }),
}));
vi.mock('../components/CreatePageWizardModal', () => ({ CreatePageWizardModal: () => null }));
vi.mock('../components/Sidebar', () => ({ Sidebar: () => <aside aria-label="Workspace navigation">Page tree</aside> }));

function openLayout(path = '/_admin/settings') {
  return render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[path]}><Routes>
    <Route element={<MainLayout authMode="local" />}>
      <Route path="/_admin/settings" element={<h1>General settings page</h1>} />
      <Route path="/_admin/settings/appearance" element={<h1>Appearance settings page</h1>} />
      <Route path="/my/recents" element={<h1>Recent pages</h1>} />
      <Route path="/search" element={<h1>Search pages</h1>} />
    </Route>
  </Routes></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  viewport.mobile = false;
  useAppStore.setState({ sidebarOpen: true, themeMode: 'light', createPageOpen: false });
});

describe('contextual navigation', () => {
  it('replaces authoring navigation with admin links and supports collapse', () => {
    useAppStore.setState({ sidebarOpen: false });
    openLayout();
    expect(screen.getByRole('navigation', { name: 'Server settings navigation' })).toBeVisible();
    expect(screen.queryByLabelText('Workspace navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /General Workspace/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Admin guide/ })).toHaveAttribute('href', '/_admin/help');
    fireEvent.click(screen.getByRole('button', { name: 'Close admin navigation' }));
    expect(screen.getByRole('button', { name: 'Open admin navigation' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('restores the authoring sidebar after leaving administration', async () => {
    openLayout();
    fireEvent.click(screen.getByRole('button', { name: /Back to workspace/ }));
    expect(await screen.findByRole('heading', { name: 'Recent pages' })).toBeVisible();
    expect(screen.getByLabelText('Workspace navigation')).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Server settings navigation' })).not.toBeInTheDocument();
  });

  it('opens mobile navigation as an overlay and closes it after selecting a section', async () => {
    viewport.mobile = true;
    openLayout();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open admin navigation' }));
    expect(screen.getByRole('navigation', { name: 'Server settings navigation' }).closest('.MuiModal-root')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Appearance Theme/ }));
    expect(await screen.findByRole('heading', { name: 'Appearance settings page' })).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });

  it('dismisses the mobile drawer with Escape and restores focus', async () => {
    viewport.mobile = true;
    openLayout();
    const trigger = screen.getByRole('button', { name: 'Open admin navigation' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('navigation'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('opens a visible search page on mobile', async () => {
    viewport.mobile = true;
    openLayout('/my/recents');
    fireEvent.click(screen.getByRole('button', { name: 'Search pages' }));
    expect(await screen.findByRole('heading', { name: 'Search pages' })).toBeVisible();
  });

  it('dismisses mobile navigation when its backdrop is tapped', async () => {
    viewport.mobile = true;
    openLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Open admin navigation' }));
    const modal = screen.getByRole('navigation').closest('.MuiModal-root')!;
    fireEvent.click(modal.querySelector('.MuiBackdrop-root')!);
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
  });

  it('opens mobile search with the keyboard shortcut', async () => {
    viewport.mobile = true;
    openLayout('/my/recents');
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    expect(await screen.findByRole('heading', { name: 'Search pages' })).toBeVisible();
  });
});
