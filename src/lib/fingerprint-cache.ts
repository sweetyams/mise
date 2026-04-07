// =============================================================================
// MISE Fingerprint Cache — Layer 2 of the 4-Layer Prompt Architecture
// =============================================================================
// In-memory cache for fingerprint prompt texts with 1-hour TTL.
// On cache miss, falls back to Supabase `fingerprints` table.
// Requirements: 2.1, 2.2, 2.6, 2.7, 3.1, 3.3, 6.2, 6.3
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedFingerprint {
  id: string;
  name: string;
  promptText: string;
  version: number;
  cachedAt: number; // Date.now()
}

// ---------------------------------------------------------------------------
// Cache configuration
// ---------------------------------------------------------------------------

const TTL_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// In-memory cache store
// ---------------------------------------------------------------------------

const cache = new Map<string, CachedFingerprint>();

// ---------------------------------------------------------------------------
// TTL check
// ---------------------------------------------------------------------------

function isStale(entry: CachedFingerprint): boolean {
  return Date.now() - entry.cachedAt > TTL_MS;
}

// ---------------------------------------------------------------------------
// getFingerprint — check cache first, fall back to Supabase
// ---------------------------------------------------------------------------

export async function getFingerprint(id: string): Promise<CachedFingerprint | null> {
  // Check cache
  const cached = cache.get(id);
  if (cached && !isStale(cached)) {
    return cached;
  }

  // Evict stale entry
  if (cached) {
    cache.delete(id);
  }

  // Fall back to Supabase
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('fingerprints')
    .select('id, name, prompt_text, version')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  const entry: CachedFingerprint = {
    id: data.id,
    name: data.name,
    promptText: data.prompt_text,
    version: data.version,
    cachedAt: Date.now(),
  };

  cache.set(id, entry);
  return entry;
}

// ---------------------------------------------------------------------------
// invalidateFingerprint — remove from cache
// ---------------------------------------------------------------------------

export function invalidateFingerprint(id: string): void {
  cache.delete(id);
}

// ---------------------------------------------------------------------------
// preloadFingerprints — load all default fingerprints at startup
// ---------------------------------------------------------------------------

export async function preloadFingerprints(): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('fingerprints')
    .select('id, name, prompt_text, version')
    .eq('is_default', true);

  if (error || !data) {
    console.warn('[MISE] Failed to preload fingerprints:', error?.message);
    return;
  }

  for (const row of data) {
    const entry: CachedFingerprint = {
      id: row.id,
      name: row.name,
      promptText: row.prompt_text,
      version: row.version,
      cachedAt: Date.now(),
    };
    cache.set(row.id, entry);
  }
}

// ---------------------------------------------------------------------------
// getCacheSize — for testing/diagnostics
// ---------------------------------------------------------------------------

export function getCacheSize(): number {
  return cache.size;
}

// ---------------------------------------------------------------------------
// clearCache — for testing
// ---------------------------------------------------------------------------

export function clearCache(): void {
  cache.clear();
}
