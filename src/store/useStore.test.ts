import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn();
const getUserMock = vi.fn();

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
  disconnectPlaid: vi.fn(async () => ({ ok: true })),
  syncPlaidTransactions: vi.fn(async () => ({ added: 0, updated: 0, errors: 0 })),
}));

describe('useStore ingestion persistence', () => {
  beforeEach(() => {
    insertMock.mockReset();
    getUserMock.mockReset();
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
