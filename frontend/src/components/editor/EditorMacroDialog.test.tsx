import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorMacroDialog } from './EditorMacroDialog';

describe('EditorMacroDialog', () => {
  const mockSetMacroSelectorOpen = vi.fn();
  const mockSetMacroSearchQuery = vi.fn();
  const mockSetActiveCategoryTab = vi.fn();
  const mockToggleFavorite = vi.fn();
  const mockEditor = {}; // dummy object for editor

  const commands = [
    {
      id: 'text-1',
      label: 'Heading 1',
      description: 'Big heading',
      category: 'text',
      icon: <span>H1</span>,
      action: vi.fn(),
    },
    {
      id: 'layout-1',
      label: 'Columns',
      description: 'Create two columns',
      category: 'layout',
      icon: <span>Col</span>,
      action: vi.fn(),
    }
  ];

  const defaultProps = {
    macroSelectorOpen: true,
    setMacroSelectorOpen: mockSetMacroSelectorOpen,
    macroSearchQuery: '',
    setMacroSearchQuery: mockSetMacroSearchQuery,
    activeCategoryTab: 'text',
    setActiveCategoryTab: mockSetActiveCategoryTab,
    commands,
    toggleFavorite: mockToggleFavorite,
    favorites: ['layout-1'], // columns is favorited
    editor: mockEditor,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and shows category tabs', () => {
    render(<EditorMacroDialog {...defaultProps} />);
    expect(screen.getByText('Insert Macro or Block')).toBeInTheDocument();
    
    // Check tabs
    expect(screen.getByText('Text & Lists')).toBeInTheDocument();
    expect(screen.getByText('Layout & Structure')).toBeInTheDocument();
    
    // Only the 'text' category commands should be visible initially
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.queryByText('Columns')).not.toBeInTheDocument();
  });

  it('switches category tabs', () => {
    render(<EditorMacroDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Layout & Structure'));
    expect(mockSetActiveCategoryTab).toHaveBeenCalledWith('layout');
  });

  it('filters commands by search query and hides tabs', () => {
    // When searching, tabs are hidden and all categories are searched
    render(<EditorMacroDialog {...defaultProps} macroSearchQuery="col" />);
    
    expect(screen.queryByText('Text & Lists')).not.toBeInTheDocument(); // Tabs hidden
    
    expect(screen.queryByText('Heading 1')).not.toBeInTheDocument();
    expect(screen.getByText('Columns')).toBeInTheDocument();
  });

  it('updates search query when typing', () => {
    render(<EditorMacroDialog {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search macros by name or description...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(mockSetMacroSearchQuery).toHaveBeenCalledWith('test');
  });

  it('clears search query when clear button is clicked', () => {
    render(<EditorMacroDialog {...defaultProps} macroSearchQuery="test" />);
    
    // The clear button is an X icon button rendered when query is not empty
    // It's the second X button (first is close dialog)
    const closeButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg'));
    // We can also find it by clicking the one that doesn't trigger close dialog
    // Actually, let's just trigger it:
    const clearSearchBtn = closeButtons[1];
    fireEvent.click(clearSearchBtn);
    
    expect(mockSetMacroSearchQuery).toHaveBeenCalledWith('');
  });

  it('invokes command action and closes dialog when clicked', () => {
    render(<EditorMacroDialog {...defaultProps} />);
    
    const headingBlock = screen.getByText('Heading 1').closest('div')!.parentElement!;
    fireEvent.click(headingBlock);
    
    expect(commands[0].action).toHaveBeenCalledWith(mockEditor);
    expect(mockSetMacroSelectorOpen).toHaveBeenCalledWith(false);
  });

  it('toggles favorite status when star icon is clicked', () => {
    render(<EditorMacroDialog {...defaultProps} />);
    
    // The text-1 command is NOT favorited
    // Find the star icon button for it
    const starButtons = screen.getAllByLabelText('Pin to Toolbar Favorites'); // Tooltip title
    expect(starButtons.length).toBe(1);
    
    fireEvent.click(starButtons[0]);
    expect(mockToggleFavorite).toHaveBeenCalledWith('text-1', expect.any(Object));
  });

  it('displays correct tooltip for favorited commands', () => {
    render(<EditorMacroDialog {...defaultProps} activeCategoryTab="layout" />);
    
    // The layout-1 command IS favorited
    const starButtons = screen.getAllByLabelText('Remove from Favorites'); // Tooltip title
    expect(starButtons.length).toBe(1);
  });
});
