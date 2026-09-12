import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopNavbar } from './TopNavbar';
import { MemoryRouter, useLocation } from 'react-router-dom';
const CurrentRoute = () => { const location = useLocation(); return <output data-testid="current-route">{location.pathname}{location.search}</output>; };
import type { Team } from '../services/api';

describe('TopNavbar', () => {
  const mockOnLogout = vi.fn();
  const mockOnToggleThemeMode = vi.fn();
  const mockOnOpenHelp = vi.fn();
  const mockOnOpenSettings = vi.fn();
  const mockOnOpenAdminHelp = vi.fn();
  const mockOnOpenFavorites = vi.fn();
  const mockOnOpenRecents = vi.fn();
  const mockOnOpenTasks = vi.fn();
  const mockOnOpenMentions = vi.fn();
  const mockOnToggleDeveloperMode = vi.fn();
  const mockOnToggleSidebar = vi.fn();

  const teams: Team[] = [
    { id: 'team_1', name: 'Engineering', abbreviation: 'eng', description: '' }
  ];

  const defaultProps = {
    teams,
    selectedTeamId: 'team_1',
    displayName: 'John Doe',
    username: 'johndoe',
    onLogout: mockOnLogout,
    themeMode: 'light' as const,
    onToggleThemeMode: mockOnToggleThemeMode,
    onOpenHelp: mockOnOpenHelp,
    onOpenSettings: mockOnOpenSettings,
    onOpenAdminHelp: mockOnOpenAdminHelp,
    onOpenFavorites: mockOnOpenFavorites,
    onOpenRecents: mockOnOpenRecents,
    onOpenTasks: mockOnOpenTasks,
    onOpenMentions: mockOnOpenMentions,
    activeUsers: [{ userId: 'u2', username: 'Jane Smith', color: '#ff0000' }],
    developerMode: false,
    onToggleDeveloperMode: mockOnToggleDeveloperMode,
    sidebarOpen: true,
    onToggleSidebar: mockOnToggleSidebar
  };

  const renderNavbar = () => render(<MemoryRouter><TopNavbar {...defaultProps} /><CurrentRoute /></MemoryRouter>);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand logo and user avatar correctly', () => {
    renderNavbar();
    expect(screen.getByText('Kollab')).toBeInTheDocument();
    
    // Multiple elements might have the display name text depending on avatar
    const avatarElements = screen.getAllByText('JD'); // Initial from 'John Doe'
    expect(avatarElements.length).toBeGreaterThan(0);
    
    // Check if active user 'Jane Smith' is rendered
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('toggles sidebar on menu button click', () => {
    renderNavbar();
    // The first button in the toolbar is the sidebar toggle
    fireEvent.click(screen.getByRole('button', { name: 'Close workspace navigation' }));
    expect(mockOnToggleSidebar).toHaveBeenCalled();
  });

  it('toggles theme on button click', () => {
    renderNavbar();
    
    // It's the button with the tooltip "Switch to Dark Mode"
    const themeBtn = screen.getByLabelText('Switch to Dark Mode');
    fireEvent.click(themeBtn);
    expect(mockOnToggleThemeMode).toHaveBeenCalled();
  });

  it('opens help on button click', () => {
    renderNavbar();
    const helpBtn = screen.getByLabelText('Help & User Guide');
    fireEvent.click(helpBtn);
    expect(mockOnOpenHelp).toHaveBeenCalled();
  });

  it('handles search input and Enter key', () => {
    renderNavbar();
    const searchInput = screen.getByLabelText('global search');
    
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    
    expect(screen.getByTestId('current-route')).toHaveTextContent('/search?q=test%20query');
  });

  it('opens profile menu and triggers actions', () => {
    renderNavbar();
    
    // Find the profile container by looking for the display name text node
    const profileContainers = screen.getAllByText('John Doe');
    fireEvent.click(profileContainers[0]);
    
    // Now the menu should be open
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    
    // Test Favorites
    fireEvent.click(screen.getByText('Favorite Pages'));
    expect(mockOnOpenFavorites).toHaveBeenCalled();
  });

  it('triggers logout from profile menu', () => {
    renderNavbar();
    
    fireEvent.click(screen.getAllByText('John Doe')[0]);
    
    fireEvent.click(screen.getByText('Log Out'));
    expect(mockOnLogout).toHaveBeenCalled();
  });

  it('toggles developer mode from profile menu', () => {
    renderNavbar();
    
    fireEvent.click(screen.getAllByText('John Doe')[0]);
    
    fireEvent.click(screen.getByText('Developer Mode'));
    expect(mockOnToggleDeveloperMode).toHaveBeenCalledWith(true);
  });
});
