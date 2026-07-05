import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ServerSettingsPage } from './ServerSettingsPage';
import * as api from '../services/api';

// Mock the API calls
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    downloadBackup: vi.fn().mockResolvedValue(new Blob(['dummy backup'])),
    downloadSyncExport: vi.fn().mockResolvedValue(new Blob(['dummy sync'])),
    restoreBackup: vi.fn().mockResolvedValue({ message: 'Success' }),
    importSyncPackage: vi.fn().mockResolvedValue({ message: 'Success' }),
  };
});

// Mock child components
vi.mock('./ThemeSelector', () => ({
  ThemeSelector: () => <div data-testid="mock-theme-selector" />
}));
vi.mock('./LogoSelector', () => ({
  LogoSelector: () => <div data-testid="mock-logo-selector" />
}));

// Mock window.URL
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

describe('ServerSettingsPage', () => {
  const mockOnSave = vi.fn();
  const mockOnSaveSettings = vi.fn().mockResolvedValue(undefined);
  const mockOnBack = vi.fn();
  const mockShowToast = vi.fn();

  const defaultProps = {
    currentTheme: {
      id: 'theme_1',
      name: 'Default Theme',
      logoUrl: 'http://example.com/logo.png',
      lightMode: {
        primary: '#000000',
        secondary: '#000000',
        background: '#000000',
        paper: '#000000',
        textPrimary: '#000000',
        textSecondary: '#000000',
        border: '#000000',
        accent: '#000000'
      },
      darkMode: {
        primary: '#ffffff',
        secondary: '#ffffff',
        background: '#ffffff',
        paper: '#ffffff',
        textPrimary: '#ffffff',
        textSecondary: '#ffffff',
        border: '#ffffff',
        accent: '#ffffff'
      }
    },
    systemSettings: {
      auditRetentionPolicy: '30days',
      auditRetentionCustomDays: 30,
      auditLogDestination: 'postgres',
      trashRetentionPolicy: 'forever',
      trashRetentionCustomDays: 30,
      welcomeTitle: 'Custom Welcome',
      welcomeText: 'Custom text',
      authLogoUrl: '',
      authLogoSize: 'Medium',
      authLegalDisclaimer: '',
      authLoginButtonText: 'Log In',
      aiRateLimit: 20,
      asposeEnabled: true,
      asposeLicense: ''
    },
    onSave: mockOnSave,
    onSaveSettings: mockOnSaveSettings,
    onBack: mockOnBack,
    showToast: mockShowToast,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and populates form from props', () => {
    render(<ServerSettingsPage {...defaultProps} />);
    
    expect(screen.getByText('Server Settings')).toBeInTheDocument();
    
    // Check General tab values
    expect(screen.getByDisplayValue('Default Theme')).toBeInTheDocument(); // Name is populated from currentTheme.name
    expect(screen.getByDisplayValue('20')).toBeInTheDocument(); // AI Rate Limit
  });

  it('switches tabs correctly', () => {
    render(<ServerSettingsPage {...defaultProps} />);
    
    // Switch to Audit & Retention tab
    fireEvent.click(screen.getByText('Audit & Retention'));
    
    // Check for audit specific content
    expect(screen.getByText('Audit Log Retention Policy')).toBeInTheDocument();
    expect(screen.getByText('Trash Bin Pruning Policy')).toBeInTheDocument();
  });

  it('submits correctly when Save Changes is clicked', async () => {
    render(<ServerSettingsPage {...defaultProps} />);
    
    // Modify a value
    const nameInput = screen.getByDisplayValue('Default Theme');
    fireEvent.change(nameInput, { target: { value: 'New Branding Name' } });
    
    // Click Save
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        'New Branding Name',
        'http://example.com/logo.png', // from LogoSelector default mock prop, wait, the mock doesn't update it, but the state holds it
        expect.any(Object),
        expect.any(Object)
      );
      
      expect(mockOnSaveSettings).toHaveBeenCalledWith(expect.objectContaining({
        aiRateLimit: 20,
        auditRetentionPolicy: '30days',
      }));
      
      expect(mockShowToast).toHaveBeenCalledWith('Server settings saved successfully', 'success');
    });
  });

  it('calls downloadBackup when Export Full Server Backup ZIP is clicked', async () => {
    render(<ServerSettingsPage {...defaultProps} />);
    
    // Switch to Backups tab
    fireEvent.click(screen.getByText('Backups & Air-Gap Sync'));
    
    // Click export button
    const exportBtn = screen.getByText('Export Full Server Backup ZIP');
    
    await act(async () => {
      fireEvent.click(exportBtn);
    });
    
    expect(api.downloadBackup).toHaveBeenCalled();
  });
});
