import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateSpaceDialog } from './CreateSpaceDialog';

describe('CreateSpaceDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnCreateTeam = vi.fn().mockResolvedValue(undefined);
  const mockOnCreateProject = vi.fn().mockResolvedValue(undefined);
  
  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    teams: [
      { id: 'personal_123', name: 'Personal', abbreviation: '', description: '' },
      { id: 'team_1', name: 'Engineering', abbreviation: 'eng', description: '' }
    ],
    activeTeamId: 'team_1',
    onCreateTeam: mockOnCreateTeam,
    onCreateProject: mockOnCreateProject,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and switches tabs', () => {
    render(<CreateSpaceDialog {...defaultProps} />);
    
    expect(screen.getByText('Create New Space')).toBeInTheDocument();
    
    // Team tab is default
    expect(screen.getByLabelText('Team Space Name')).toBeInTheDocument();
    
    // Switch to Project tab
    fireEvent.click(screen.getByText('Project'));
    expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
  });

  it('auto-generates team abbreviation based on name', () => {
    render(<CreateSpaceDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Team Space Name');
    fireEvent.change(nameInput, { target: { value: 'Mobile Engineering' } });
    
    const abbrInput = screen.getByLabelText('Unique Abbreviation (URL path)') as HTMLInputElement;
    expect(abbrInput.value).toBe('mobileengine');
  });

  it('validates team creation (empty name)', async () => {
    render(<CreateSpaceDialog {...defaultProps} />);
    
    const createBtn = screen.getByText('Create Team Space');
    fireEvent.click(createBtn);
    
    expect(await screen.findByText('Space name and abbreviation are required')).toBeInTheDocument();
    expect(mockOnCreateTeam).not.toHaveBeenCalled();
  });

  it('submits valid team creation', async () => {
    render(<CreateSpaceDialog {...defaultProps} />);
    
    fireEvent.change(screen.getByLabelText('Team Space Name'), { target: { value: 'Mobile Team' } });
    
    const createBtn = screen.getByText('Create Team Space');
    fireEvent.click(createBtn);
    
    await waitFor(() => {
      expect(mockOnCreateTeam).toHaveBeenCalledWith('Mobile Team', 'mobileteam', '');
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('validates project creation (missing parent team)', async () => {
    render(<CreateSpaceDialog {...defaultProps} activeTeamId={null} teams={[{ id: 'personal_123', name: 'Personal', abbreviation: '', description: '' }]} />);
    
    fireEvent.click(screen.getByText('Project'));
    
    fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'iOS App' } });
    
    const createBtn = screen.getByText('Create Project');
    fireEvent.click(createBtn);
    
    expect(await screen.findByText('Please select a parent Team Space')).toBeInTheDocument();
    expect(mockOnCreateProject).not.toHaveBeenCalled();
  });

  it('submits valid project creation', async () => {
    render(<CreateSpaceDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Project'));
    
    fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'iOS App' } });
    
    const createBtn = screen.getByText('Create Project');
    fireEvent.click(createBtn);
    
    await waitFor(() => {
      expect(mockOnCreateProject).toHaveBeenCalledWith('team_1', 'iOS App', 'iosapp', '');
    });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
