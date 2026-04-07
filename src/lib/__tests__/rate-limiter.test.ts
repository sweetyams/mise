// =============================================================================
// MISE Rate Limiter — Unit Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GENERATION_LIMITS,
  MAX_INPUT_TOKENS,
  MAX_OUTPUT_TOKENS,
} from '@/lib/rate-limiter';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect.mockReturnValue({
    eq: mockEq.mockReturnValue({
      single: mockSingle,
    }),
  }),
  insert: mockInsert.mockResolvedValue({ error: null }),
  update: mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}));

// Import after mocks
const { checkRateLimit, recordGenerationCost } = await import(
  '@/lib/rate-limiter'
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GENERATION_LIMITS', () => {
    it('should set free tier to 10 generations per month', () => {
      expect(GENERATION_LIMITS.free).toBe(10);
    });

    it('should set paid tiers to unlimited (null)', () => {
      expect(GENERATION_LIMITS.home_cook).toBeNull();
      expect(GENERATION_LIMITS.creator).toBeNull();
      expect(GENERATION_LIMITS.brigade).toBeNull();
    });
  });

  describe('Token caps', () => {
    it('should define MAX_INPUT_TOKENS as 1200', () => {
      expect(MAX_INPUT_TOKENS).toBe(1200);
    });

    it('should define MAX_OUTPUT_TOKENS as 2000', () => {
      expect(MAX_OUTPUT_TOKENS).toBe(2000);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow a free-tier user with remaining generations', async () => {
      mockSingle.mockResolvedValue({
        data: {
          tier: 'free',
          generation_count_this_month: 3,
          generation_count_reset_date: new Date().toISOString().split('T')[0],
        },
        error: null,
      });

      const result = await checkRateLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7);
    });

    it('should deny a free-tier user who has reached the limit', async () => {
      mockSingle.mockResolvedValue({
        data: {
          tier: 'free',
          generation_count_this_month: 10,
          generation_count_reset_date: new Date().toISOString().split('T')[0],
        },
        error: null,
      });

      const result = await checkRateLimit('user-123');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reason).toBeDefined();
    });

    it('should allow unlimited generations for paid tiers', async () => {
      mockSingle.mockResolvedValue({
        data: {
          tier: 'home_cook',
          generation_count_this_month: 500,
          generation_count_reset_date: new Date().toISOString().split('T')[0],
        },
        error: null,
      });

      const result = await checkRateLimit('user-456');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1); // -1 signals unlimited
    });

    it('should return not allowed when user is not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await checkRateLimit('nonexistent');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User not found');
    });

    it('should reset count when reset date is in a previous month', async () => {
      // Set reset date to a previous month
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 1);

      mockSingle.mockResolvedValue({
        data: {
          tier: 'free',
          generation_count_this_month: 10,
          generation_count_reset_date: oldDate.toISOString().split('T')[0],
        },
        error: null,
      });

      const result = await checkRateLimit('user-789');

      // After reset, count should be 0, so remaining = 10
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });
  });

  describe('recordGenerationCost', () => {
    it('should insert a cost record and increment the monthly count', async () => {
      // Mock the select for getting current count
      mockSingle.mockResolvedValue({
        data: { generation_count_this_month: 5 },
        error: null,
      });

      const result = await recordGenerationCost({
        userId: 'user-123',
        recipeId: 'recipe-456',
        inputTokens: 850,
        outputTokens: 1200,
        estimatedCost: 0.021,
        createdAt: new Date().toISOString(),
      });

      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should return error when insert fails', async () => {
      mockInsert.mockResolvedValueOnce({
        error: { message: 'Insert failed' },
      });

      const result = await recordGenerationCost({
        userId: 'user-123',
        recipeId: 'recipe-456',
        inputTokens: 850,
        outputTokens: 1200,
        estimatedCost: 0.021,
        createdAt: new Date().toISOString(),
      });

      expect(result.error).toBe('Insert failed');
    });
  });
});
