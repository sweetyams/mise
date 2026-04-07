'use client';

// =============================================================================
// MISE Recipe Library — List View
// =============================================================================
// Displays all saved recipes sorted by most recently modified.
// Search by title, ingredient, or tag. Tag filter chips.
// Requirements: 8.2, 8.3, 8.4
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getRecipes, searchRecipes, type RecipeRow } from './actions';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LibraryPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Collect all unique tags across recipes
  const allTags = Array.from(
    new Set(recipes.flatMap((r) => (Array.isArray(r.tags) ? r.tags : [])))
  ).sort();

  // -------------------------------------------------------------------------
  // Load recipes
  // -------------------------------------------------------------------------

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = searchQuery.trim()
        ? await searchRecipes(undefined, searchQuery)
        : await getRecipes();

      if (result.success) {
        setRecipes(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Failed to load recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  // -------------------------------------------------------------------------
  // Filtered recipes (by active tag)
  // -------------------------------------------------------------------------

  const filteredRecipes = activeTag
    ? recipes.filter((r) => Array.isArray(r.tags) && r.tags.includes(activeTag))
    : recipes;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Recipe Library</h1>
        <p className="mb-8 text-sm text-gray-500">
          Your saved recipes, sorted by most recently modified.
        </p>

        {/* Search bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, ingredient, or tag…"
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:placeholder-gray-500"
          />
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeTag === tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="ml-2 text-sm text-gray-500">Loading recipes…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredRecipes.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">
              {searchQuery || activeTag
                ? 'No recipes match your search.'
                : 'No recipes yet. Head to the Canvas to generate your first recipe.'}
            </p>
          </div>
        )}

        {/* Recipe cards */}
        {!loading && filteredRecipes.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => router.push(`/library/${recipe.id}`)}
                className="rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {recipe.title}
                </h3>

                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {recipe.fingerprint_id && (
                    <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      Fingerprint
                    </span>
                  )}
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
                    {recipe.complexity_mode}
                  </span>
                  {recipe.cooked && (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700 dark:bg-green-900 dark:text-green-300">
                      ✓ Cooked
                    </span>
                  )}
                </div>

                {/* Tags */}
                {Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  {new Date(recipe.updated_at).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
