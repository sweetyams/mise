import { createClient } from '@/lib/supabase/server';
import { getVersionHistory, type VersionHistoryEntry } from '@/lib/version-store';
import { getRecipeCard } from '../actions';
import RecipeDetailClient from './recipe-detail-client';

// =============================================================================
// MISE Recipe Detail Page — Server Component
// =============================================================================
// Fetches recipe data and version history, passes to client components.
// Requirements: 8.5–8.7, 9.2–9.4, 9.9
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch recipe
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="mb-4 text-2xl font-bold">Recipe not found</h1>
          <p className="text-gray-500">
            This recipe may have been deleted or you may not have access to it.
          </p>
        </div>
      </div>
    );
  }

  // Fetch version history
  const historyResult = await getVersionHistory(id);
  const versions: VersionHistoryEntry[] = Array.isArray(historyResult)
    ? historyResult
    : [];

  // Fetch existing recipe card for current version
  const cardResult = await getRecipeCard(id, recipe.version ?? 1);
  const initialRecipeCard = cardResult.success ? cardResult.data : null;

  return (
    <RecipeDetailClient
      recipe={recipe}
      versions={versions}
      initialRecipeCard={initialRecipeCard}
    />
  );
}
