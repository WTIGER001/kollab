import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditorHeader } from './EditorHeader';

describe('EditorHeader', () => {
  const mockSetIsFavorite = vi.fn();
  const mockSetIsEditing = vi.fn();
  const mockSetShowComments = vi.fn();
  const mockHandleToggleHistory = vi.fn();
  const mockHandleOpenMoreMenu = vi.fn();
  const mockHandleCloseMoreMenu = vi.fn();
  const mockHandleTriggerMove = vi.fn();
  const mockHandleTriggerDelete = vi.fn();
  const mockSetPageSettingsDialogOpen = vi.fn();
  const mockSetAnalyticsDialogOpen = vi.fn();
  const mockSetCommitDescription = vi.fn();
  const mockSetCommitModalOpen = vi.fn();
  const mockSetExportDialogOpen = vi.fn();
  const mockSetJsonDialogOpen = vi.fn();
  const mockSetRestrictionsDialogOpen = vi.fn();
  const mockSetSharingLinksDialogOpen = vi.fn();
  const mockAddFavorite = vi.fn().mockResolvedValue({});
  const mockRemoveFavorite = vi.fn().mockResolvedValue({});

  const defaultProps = {
    editor: {}, // truthy to render
    activeDocId: 'doc_1',
    developerMode: false,
    isSaving: false,
    previewVersion: null,
    isFavorite: false,
    setIsFavorite: mockSetIsFavorite,
    selectedProjectName: 'Frontend',
    selectedTeamName: 'Engineering',
    breadcrumbsList: [{ id: 'b1', title: 'Home' }, { id: 'b2', title: 'Current Page' }],
    isEditing: false,
    setIsEditing: mockSetIsEditing,
    showComments: true,
    setShowComments: mockSetShowComments,
    uniqueActiveUsers: [{ userId: 'u1', username: 'Alice', color: '#ff0000' }],
    moreMenuAnchor: null,
    historyOpen: false,
    attachments: [],
    deletedAt: null,
    handleToggleHistory: mockHandleToggleHistory,
    handleOpenMoreMenu: mockHandleOpenMoreMenu,
    handleCloseMoreMenu: mockHandleCloseMoreMenu,
    handleTriggerMove: mockHandleTriggerMove,
    handleTriggerDelete: mockHandleTriggerDelete,
    setPageSettingsDialogOpen: mockSetPageSettingsDialogOpen,
    setAnalyticsDialogOpen: mockSetAnalyticsDialogOpen,
    setCommitDescription: mockSetCommitDescription,
    setCommitModalOpen: mockSetCommitModalOpen,
    setExportDialogOpen: mockSetExportDialogOpen,
    setJsonDialogOpen: mockSetJsonDialogOpen,
    setRestrictionsDialogOpen: mockSetRestrictionsDialogOpen,
    setSharingLinksDialogOpen: mockSetSharingLinksDialogOpen,
    addFavorite: mockAddFavorite,
    removeFavorite: mockRemoveFavorite,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders breadcrumbs and active users in read-only mode', () => {
    render(<EditorHeader {...defaultProps} />);
    
    // Breadcrumbs
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
    
    // Active users initials (Alice -> A)
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('switches to Edit mode correctly', () => {
    render(<EditorHeader {...defaultProps} isEditing={true} />);
    
    // Breadcrumbs should not be visible
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    
    // Edit mode chip and "Done" button should be visible
    expect(screen.getByText('EDIT MODE')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('calls setIsEditing when Edit button is clicked', () => {
    render(<EditorHeader {...defaultProps} />);
    
    // In read-only mode, 'Edit' button is visible
    const editBtn = screen.getByText('Edit').closest('button');
    fireEvent.click(editBtn!);
    
    expect(mockSetIsEditing).toHaveBeenCalledWith(true);
  });

  it('calls commit functions when Done button is clicked', () => {
    render(<EditorHeader {...defaultProps} isEditing={true} />);
    
    const doneBtn = screen.getByText('Done').closest('button');
    fireEvent.click(doneBtn!);
    
    expect(mockSetCommitDescription).toHaveBeenCalledWith('');
    expect(mockSetCommitModalOpen).toHaveBeenCalledWith(true);
  });

  it('toggles favorite status when star icon is clicked', async () => {
    render(<EditorHeader {...defaultProps} />);
    
    // Favorite icon is rendered when not favorited (add)
    const favoriteBtn = screen.getByLabelText('Add to Favorites');
    fireEvent.click(favoriteBtn);
    
    expect(mockAddFavorite).toHaveBeenCalledWith('doc_1');
    
    await waitFor(() => {
      expect(mockSetIsFavorite).toHaveBeenCalledWith(true);
    });
  });

  it('opens more menu and triggers dialogs', () => {
    // We pass a mock anchor to simulate the menu being open
    const dummyElement = document.createElement('div');
    render(<EditorHeader {...defaultProps} moreMenuAnchor={dummyElement} />);
    
    // Click Viewers & Editors
    fireEvent.click(screen.getByText('Viewers & Editors'));
    expect(mockHandleCloseMoreMenu).toHaveBeenCalled();
    expect(mockSetRestrictionsDialogOpen).toHaveBeenCalledWith(true);
    
    // Click Page Settings
    fireEvent.click(screen.getByText('Page Settings'));
    expect(mockSetPageSettingsDialogOpen).toHaveBeenCalledWith(true);
  });
});
