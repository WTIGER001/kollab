import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopNavbar } from './TopNavbar';
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand logo and user avatar correctly', () => {
    render(<TopNavbar {...defaultProps} />);
    expect(screen.getByText('Kollab')).toBeInTheDocument();
    
    // Multiple elements might have the display name text depending on avatar
    const avatarElements = screen.getAllByText('JD'); // Initial from 'John Doe'
    expect(avatarElements.length).toBeGreaterThan(0);
    
    // Check if active user 'Jane Smith' is rendered
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('toggles sidebar on menu button click', () => {
    render(<TopNavbar {...defaultProps} />);
    // The first button in the toolbar is the sidebar toggle
    const toggleButtons = screen.getAllByRole('button');
    // First button is sidebar toggle, wait, let's find it by role and no specific label
    fireEvent.click(toggleButtons[0]);
    expect(mockOnToggleSidebar).toHaveBeenCalled();
  });

  it('toggles theme on button click', () => {
    render(<TopNavbar {...defaultProps} />);
    
    // It's the button with the tooltip "Switch to Dark Mode"
    const themeBtn = screen.getByLabelText('Switch to Dark Mode');
    fireEvent.click(themeBtn);
    expect(mockOnToggleThemeMode).toHaveBeenCalled();
  });

  it('opens help on button click', () => {
    render(<TopNavbar {...defaultProps} />);
    const helpBtn = screen.getByLabelText('Help & User Guide');
    fireEvent.click(helpBtn);
    expect(mockOnOpenHelp).toHaveBeenCalled();
  });

  it('handles search input and Enter key', () => {
    // Mock window.location.href
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, href: '' };

    render(<TopNavbar {...defaultProps} />);
    const searchInput = screen.getByLabelText('global search');
    
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    
    expect(window.location.href).toBe('/search?q=test%20query');

    // Restore window.location
    window.location = originalLocation;
  });

  it('opens profile menu and triggers actions', () => {
    render(<TopNavbar {...defaultProps} />);
    
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
    render(<TopNavbar {...defaultProps} />);
    
    fireEvent.click(screen.getAllByText('John Doe')[0]);
    
    fireEvent.click(screen.getByText('Log Out'));
    expect(mockOnLogout).toHaveBeenCalled();
  });

  it('toggles developer mode from profile menu', () => {
    render(<TopNavbar {...defaultProps} />);
    
    fireEvent.click(screen.getAllByText('John Doe')[0]);
    
    fireEvent.click(screen.getByText('Developer Mode'));
    expect(mockOnToggleDeveloperMode).toHaveBeenCalledWith(true);
  });
});
