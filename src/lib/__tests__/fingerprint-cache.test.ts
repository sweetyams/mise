import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFingerprint,
  invalidateFingerprint,
  clearCache,
  getCacheSize,
} from '@/lib/fingerprint-cache';

// ---------------------------------------------------------------------------
// Mock Supabase — chain: from().select().eq().single()
// ---------------------------------------------------------------------------

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fingerprint-cache', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  it('returns null when fingerprint not found in DB', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const result = await getFingerprint('nonexistent-id');
    expect(result).toBeNull();
  });

  it('fetches from Supabase on cache miss and caches the result', async () => {
    const dbRow = {
      id: 'fp-1',
      name: 'Matty Matheson',
      prompt_text: 'Big flavours, comfort food...',
      version: 1,
    };
    mockSingle.mockResolvedValue({ data: dbRow, error: null });

    const result = await getFingerprint('fp-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('fp-1');
    expect(result!.name).toBe('Matty Matheson');
    expect(result!.promptText).toBe('Big flavours, comfort food...');
    expect(result!.version).toBe(1);
    expect(result!.cachedAt).toBeGreaterThan(0);

    // Second call should hit cache (no new DB call)
    vi.clearAllMocks();
    const cached = await getFingerprint('fp-1');
    expect(cached).not.toBeNull();
    expect(cached!.id).toBe('fp-1');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('invalidateFingerprint removes entry from cache', async () => {
    const dbRow = {
      id: 'fp-2',
      name: 'Ottolenghi',
      prompt_text: 'Vegetable-forward...',
      version: 2,
    };
    mockSingle.mockResolvedValue({ data: dbRow, error: null });

    await getFingerprint('fp-2');
    expect(getCacheSize()).toBe(1);

    invalidateFingerprint('fp-2');
    expect(getCacheSize()).toBe(0);
  });

  it('re-fetches from DB after invalidation', async () => {
    const dbRow = {
      id: 'fp-3',
      name: 'Brad Leone',
      prompt_text: 'Fermentation, preservation...',
      version: 1,
    };
    mockSingle.mockResolvedValue({ data: dbRow, error: null });

    await getFingerprint('fp-3');
    invalidateFingerprint('fp-3');
    expect(getCacheSize()).toBe(0);

    // Re-fetch should hit DB again
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { ...dbRow, version: 2 }, error: null });
    const refetched = await getFingerprint('fp-3');
    expect(refetched).not.toBeNull();
    expect(refetched!.version).toBe(2);
    expect(mockFrom).toHaveBeenCalled();
  });

  it('clearCache empties the entire cache', async () => {
    const dbRow = {
      id: 'fp-4',
      name: 'Samin Nosrat',
      prompt_text: 'Salt, fat, acid, heat...',
      version: 1,
    };
    mockSingle.mockResolvedValue({ data: dbRow, error: null });

    await getFingerprint('fp-4');
    expect(getCacheSize()).toBe(1);

    clearCache();
    expect(getCacheSize()).toBe(0);
  });

  it('getCacheSize returns correct count', async () => {
    expect(getCacheSize()).toBe(0);

    const dbRow = {
      id: 'fp-5',
      name: 'Claire Saffitz',
      prompt_text: 'Pastry precision...',
      version: 1,
    };
    mockSingle.mockResolvedValue({ data: dbRow, error: null });

    await getFingerprint('fp-5');
    expect(getCacheSize()).toBe(1);
  });
});
