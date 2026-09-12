import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StartupScreen } from './StartupScreen';

describe('Startup screen', () => {
  it('shows useful loading information before authentication', () => {
    render(<StartupScreen />);
    expect(screen.getByRole('status')).toHaveTextContent('Connecting to Kollab');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('explains configuration failures and lets the user retry', () => {
    const retry = vi.fn();
    render(<StartupScreen failed onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('server configuration could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
