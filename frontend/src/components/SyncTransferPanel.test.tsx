import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncTransferPanel } from './SyncTransferPanel';
import { importSyncPackage, SyncConflictError } from '../services/api';

vi.mock('../services/api', async importOriginal => ({
  ...await importOriginal<typeof import('../services/api')>(),
  importSyncPackage: vi.fn(), downloadSyncExport: vi.fn(),
}));

describe('sync conflict review', () => {
  beforeEach(() => vi.clearAllMocks());
  const file = new File(['package'], 'sync.zip', { type: 'application/zip' });
  const conflict = { id: 'conflict-one', table: 'documents', key: 'page-one', local: { title: 'Local work' }, incoming: { title: 'Remote work' }, localDeleted: false, incomingDeleted: false };
  it('requires a choice and carries earlier decisions through subsequent conflicts', async () => {
    vi.mocked(importSyncPackage)
      .mockRejectedValueOnce(new SyncConflictError('Conflict', conflict))
      .mockRejectedValueOnce(new SyncConflictError('Conflict', { ...conflict, id: 'conflict-two', key: 'page-two' }))
      .mockResolvedValueOnce({ message: 'Imported after review' });
    render(<SyncTransferPanel />);
    fireEvent.change(screen.getByLabelText('Sync package'), { target: { files: [file] } });
    expect(await screen.findByText(/Nothing has been imported/)).toBeInTheDocument();
    expect(importSyncPackage).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Local work/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use incoming version' }));
    await screen.findByText('page-two');
    expect(JSON.parse(vi.mocked(importSyncPackage).mock.calls[1][0].get('resolutions') as string)).toEqual({ 'conflict-one': 'use-incoming' });
    fireEvent.click(screen.getByRole('button', { name: 'Keep this installation’s version' }));
    await screen.findByText('Imported after review');
    expect(JSON.parse(vi.mocked(importSyncPackage).mock.calls[2][0].get('resolutions') as string)).toEqual({ 'conflict-one': 'use-incoming', 'conflict-two': 'keep-local' });
    expect(screen.queryByText('page-two')).not.toBeInTheDocument();
  });
  it('cancels without applying a default decision', async () => {
    vi.mocked(importSyncPackage).mockRejectedValueOnce(new SyncConflictError('Conflict', conflict));
    render(<SyncTransferPanel />);
    fireEvent.change(screen.getByLabelText('Sync package'), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel import' }));
    expect(importSyncPackage).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Nothing has been imported/)).not.toBeInTheDocument();
  });
  it('prevents duplicate submissions and displays actionable failures', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(importSyncPackage).mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    render(<SyncTransferPanel />);
    fireEvent.change(screen.getByLabelText('Sync package'), { target: { files: [file] } });
    expect(screen.getByRole('button', { name: 'Export Sync ZIP' })).toBeDisabled();
    await act(async () => reject(new Error('Signature is invalid')));
    await waitFor(() => expect(screen.getByText('Signature is invalid')).toBeInTheDocument());
  });
});
