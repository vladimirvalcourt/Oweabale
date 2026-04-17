import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn();
const getUserMock = vi.fn();
const plaidDisconnectMock = vi.fn(async () => ({ ok: true }));
const plaidSyncMock = vi.fn(async () => ({ added: 0, updated: 0, errors: 0 }));
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastMessageMock = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  },
}));

vi.mock('../lib/plaid', () => ({
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
    plaidSyncMock.mockResolvedValue({ ok: true, processed: 0, errors: 1 });
    const { useStore } = await import('./useStore');
    useStore.setState({
      plaidNeedsRelink: false,
      plaidInstitutionName: 'Chase',
      fetchData: vi.fn(async () => {
        useStore.setState({ plaidNeedsRelink: true });
        return true;
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
