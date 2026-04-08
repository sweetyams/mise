'use server';

import { createClient } from '@/lib/supabase/server';
import { computeBrainStats, type BrainStats } from '@/lib/recipe-utils';
import type { RecipeRow } from '@/app/(studio)/library/actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrainSnapshot {
  id: string;
  version: number;
  promptText: string;
  compiledAt: string;
}

export async function getBrainStats(): Promise<
  { success: true; data: BrainStats } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'You must be signed in.' };
    }

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: `Failed to load recipes: ${error.message}` };
    }

    const recipes = (data ?? []) as RecipeRow[];
    const stats = computeBrainStats(recipes);

    return { success: true, data: stats };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to compute brain stats.',
    };
  }
}


// ---------------------------------------------------------------------------
// getBrainSnapshots — fetch all brain snapshots for the current user
// ---------------------------------------------------------------------------

export async function getBrainSnapshots(): Promise<
  { success: true; data: BrainSnapshot[] } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'You must be signed in.' };
    }

    const { data, error } = await supabase
      .from('brain_snapshots')
      .select('id, version, prompt_text, compiled_at')
      .eq('user_id', user.id)
      .order('version', { ascending: false });

    if (error) {
      return { success: false, error: `Failed to load snapshots: ${error.message}` };
    }

    const snapshots: BrainSnapshot[] = (data ?? []).map((row) => ({
      id: row.id,
      version: row.version,
      promptText: row.prompt_text,
      compiledAt: row.compiled_at,
    }));

    return { success: true, data: snapshots };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load brain snapshots.',
    };
  }
}
