import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthGuard } from './AuthGuard';
import { useAuth } from 'react-oidc-context';
import { useAppStore } from '../store/useAppStore';

// Mock the react-oidc-context
vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

describe('AuthGuard', () => {
  const mockRemoveUser = vi.fn().mockResolvedValue(undefined);
  const mockSigninRedirect = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('kollab:theme-mode');
    useAppStore.setState({ themeMode: 'dark' });
    
    // Default mock implementation
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: null,
      removeUser: mockRemoveUser,
      signinRedirect: mockSigninRedirect,
    });
  });

  it('renders children immediately in mock mode', () => {
    render(
      <AuthGuard isMockMode={true} apiAuthError={false}>
        <div data-testid="child">Mock Content</div>
      </AuthGuard>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders a loading spinner when auth is loading', () => {
    (useAuth as any).mockReturnValue({ isLoading: true });
    render(
      <AuthGuard isMockMode={false} authMode="oidc" apiAuthError={false}>
        <div>Content</div>
      </AuthGuard>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state when auth error occurs', () => {
    (useAuth as any).mockReturnValue({ 
      error: new Error('OIDC Failed'),
      removeUser: mockRemoveUser
    });
    
    vi.useFakeTimers();
    render(
      <AuthGuard isMockMode={false} authMode="oidc" apiAuthError={false}>
        <div>Content</div>
      </AuthGuard>
    );
    
    expect(screen.getByText('Authentication Error: OIDC Failed')).toBeInTheDocument();
    
    act(() => {
      vi.runAllTimers();
    });
    
    expect(mockRemoveUser).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('renders API auth error state', () => {
    render(
      <AuthGuard isMockMode={false} apiAuthError={true}>
        <div>Content</div>
      </AuthGuard>
    );
    
    expect(screen.getByText('Your session has expired')).toBeInTheDocument();
  });

  it('renders login UI when not authenticated', () => {
    render(
      <AuthGuard isMockMode={false} authMode="oidc" apiAuthError={false} welcomeTitle="Welcome to Kollab">
        <div>Content</div>
      </AuthGuard>
    );
    
    expect(screen.getByText('Welcome to Kollab')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log In to Workspace/i })).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    (useAuth as any).mockReturnValue({ isAuthenticated: true, user: { expired: false } });
    
    render(
      <AuthGuard isMockMode={false} authMode="oidc" apiAuthError={false}>
        <div data-testid="child">Protected Content</div>
      </AuthGuard>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders readable, visible labels while creating the first local administrator', () => {
    render(
      <AuthGuard isMockMode={false} authMode="local" localSetupRequired={true} apiAuthError={false}>
        <div>Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Create the first administrator for this Kollab installation.')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Your name', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Email', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create administrator' })).toBeInTheDocument();
  });

  it('switches and remembers the theme from local sign-in', () => {
    render(
      <AuthGuard isMockMode={false} authMode="local" apiAuthError={false}>
        <div>Content</div>
      </AuthGuard>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));

    expect(useAppStore.getState().themeMode).toBe('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('kollab:theme-mode', 'light');
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });
});
