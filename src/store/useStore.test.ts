// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insertMock: vi.fn(),
  getUserMock: vi.fn(),
  plaidDisconnectMock: vi.fn(async () => ({ ok: true })),
  plaidSyncMock: vi.fn(async () => ({ added: 0, updated: 0, errors: 0 })),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastMessageMock: vi.fn(),
}));

const {
  insertMock,
  getUserMock,
  plaidDisconnectMock,
  plaidSyncMock,
  toastErrorMock,
  toastSuccessMock,
  toastMessageMock,
} = mocks;

vi.mock('../lib/api/supabase', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  },
}));

vi.mock('../lib/api/plaid', () => ({
  disconnectPlaid: plaidDisconnectMock,
  syncPlaidTransactions: plaidSyncMock,
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
    message: toastMessageMock,
  },
}));

describe('useStore ingestion persistence', () => {
  beforeEach(() => {
    insertMock.mockReset();
    getUserMock.mockReset();
    plaidDisconnectMock.mockClear();
    plaidSyncMock.mockReset();
    plaidSyncMock.mockResolvedValue({ added: 0, updated: 0, errors: 0 });
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    toastMessageMock.mockReset();
  });

  it('persists pending ingestion with same generated id', async () => {
    const generatedId = '11111111-2222-3333-4444-555555555555';
    const randomSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(generatedId);
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    insertMock.mockResolvedValue({ error: null });

    const { useStore } = await import('./useStore');

    const createdId = useStore.getState().addPendingIngestion({
      type: 'bill',
      status: 'uploading',
      extractedData: {},
      source: 'desktop',
      originalFile: {
        name: 'sample.pdf',
        size: 1234,
        type: 'application/pdf',
        url: 'blob:sample',
      },
    });

    expect(createdId).toBe(generatedId);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: generatedId,
        user_id: 'user-123',
        type: 'bill',
        status: 'uploading',
        source: 'desktop',
      }),
    );

    randomSpy.mockRestore();
  });
});

describe('useStore plaid sync messaging', () => {
  beforeEach(() => {
    plaidSyncMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    toastMessageMock.mockReset();
  });

  it('shows reconnect guidance when sync errors require relink', async () => {
    plaidSyncMock.mockResolvedValue({ added: 0, updated: 0, errors: 1 });
    const { useStore } = await import('./useStore');
    useStore.setState({
      plaidNeedsRelink: false,
      plaidInstitutionName: 'Chase',
      fetchData: vi.fn(async () => {
        useStore.setState({ plaidNeedsRelink: true });
      }),
    });

    const ok = await useStore.getState().syncPlaidTransactions();

    expect(ok).toBe(true);
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Sync found a bank login issue. Use Fix connection to reconnect Chase.',
    );
    expect(toastMessageMock).not.toHaveBeenCalled();
  });
});
