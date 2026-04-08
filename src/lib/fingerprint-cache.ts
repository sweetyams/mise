// =============================================================================
// MISE Fingerprint Cache — Layer 2 of the 4-Layer Prompt Architecture
// =============================================================================
// In-memory cache for fingerprint data with 1-hour TTL.
// On cache miss, falls back to Supabase `fingerprints` table.
// Now includes full_profile for layered fingerprint assembly.
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';
import type { ChefProfile } from '@/lib/types/fingerprint-profile';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedFingerprint {
  id: string;
  name: string;
  slug: string | null;
  promptText: string;
  fullProfile: ChefProfile | null;
  version: number;
  cachedAt: number;
}

// ---------------------------------------------------------------------------
// Cache configuration
// ---------------------------------------------------------------------------

const TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, CachedFingerprint>();

function isStale(entry: CachedFingerprint): boolean {
  return Date.now() - entry.cachedAt > TTL_MS;
}

// ---------------------------------------------------------------------------
// getFingerprint — check cache first, fall back to Supabase
// ---------------------------------------------------------------------------

export async function getFingerprint(id: string): Promise<CachedFingerprint | null> {
  const cached = cache.get(id);
  if (cached && !isStale(cached)) return cached;
  if (cached) cache.delete(id);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('fingerprints')
    .select('id, name, slug, prompt_text, full_profile, version')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const entry: CachedFingerprint = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    promptText: data.prompt_text,
    fullProfile: data.full_profile as ChefProfile | null,
    version: data.version,
    cachedAt: Date.now(),
  };

  cache.set(id, entry);
  return entry;
}

// ---------------------------------------------------------------------------
// getFingerprintBySlug — lookup by slug instead of UUID
// ---------------------------------------------------------------------------

export async function getFingerprintBySlug(slug: string): Promise<CachedFingerprint | null> {
  // Check cache by slug
  for (const entry of cache.values()) {
    if (entry.slug === slug && !isStale(entry)) return entry;
  }

  const supabase = createServiceClient();

  // Try slug column first
  let { data, error } = await supabase
    .from('fingerprints')
    .select('id, name, slug, prompt_text, full_profile, version')
    .eq('slug', slug)
    .single();

  // If slug column doesn't exist or no match, try matching by name (case-insensitive)
  if (error || !data) {
    ({ data, error } = await supabase
      .from('fingerprints')
      .select('id, name, prompt_text, full_profile, version')
      .ilike('name', slug.replace(/-/g, ' '))
      .single());
  }

  // Last resort: try selecting with slug column absent
  if (error || !data) {
    const { data: allData } = await supabase
      .from('fingerprints')
      .select('id, name, prompt_text, full_profile, version');
    if (allData) {
      const match = allData.find((row) => {
        const nameSlug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return nameSlug === slug || row.name.toLowerCase() === slug.toLowerCase();
      });
      if (match) {
        data = match;
        error = null;
      }
    }
  }

  if (!data) return null;

  const entry: CachedFingerprint = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    promptText: data.prompt_text,
    fullProfile: data.full_profile as ChefProfile | null,
    version: data.version,
    cachedAt: Date.now(),
  };

  cache.set(data.id, entry);
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
    .select('id, name, slug, prompt_text, full_profile, version')
    .eq('is_default', true);

  if (error || !data) {
    console.warn('[MISE] Failed to preload fingerprints:', error?.message);
    return;
  }

  for (const row of data) {
    cache.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      promptText: row.prompt_text,
      fullProfile: row.full_profile as ChefProfile | null,
      version: row.version,
      cachedAt: Date.now(),
    });
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function getCacheSize(): number { return cache.size; }
export function clearCache(): void { cache.clear(); }
