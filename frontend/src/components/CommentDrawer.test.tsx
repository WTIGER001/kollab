import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommentDrawer } from './CommentDrawer';

vi.mock('@mui/material', async (original) => ({ ...await original<typeof import('@mui/material')>(), useMediaQuery: () => true }));

describe('mobile comments', () => {
  it('opens over the editor and restores focus when dismissed', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    client.setQueryData(['comments', 'mobile-doc'], []);
    render(<QueryClientProvider client={client}>
      <button onClick={() => document.dispatchEvent(new CustomEvent('open-comment-drawer'))}>Open comments</button>
      <CommentDrawer documentId="mobile-doc" authToken="test-token" />
    </QueryClientProvider>);
    const trigger = screen.getByRole('button', { name: 'Open comments' });
    trigger.focus();
    fireEvent.click(trigger);
    const close = screen.getByRole('button', { name: 'Close comments' });
    expect(close.closest('.MuiModal-root')).toBeInTheDocument();
    fireEvent.click(close);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Close comments' })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
