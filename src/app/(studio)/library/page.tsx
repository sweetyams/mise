'use client';

// =============================================================================
// MISE Recipe Library — List View (Editorial)
// =============================================================================
// Displays all saved recipes sorted by most recently modified.
// Search by title, ingredient, or tag. Tag filter chips.
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getRecipes, type RecipeRow } from './actions';
import { extractCardMetadata, formatDuration, filterByFacets, type FacetFilters } from '@/lib/recipe-utils';
import type { Recipe } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Client-side multi-field search (includes ingredient names)
// ---------------------------------------------------------------------------

/**
 * Filters recipes client-side across all searchable fields.
 * Returns results with title matches first, then others.
 * Queries < 2 chars: title only. 2 chars: title + tags.
 * 3+ chars: all fields with word-boundary matching for ingredients.
 */
function clientSideSearch(recipes: RecipeRow[], query: string): RecipeRow[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return recipes;

  const titleMatches: RecipeRow[] = [];
  const otherMatches: RecipeRow[] = [];
  const deepSearch = q.length >= 3;

  // For ingredient matching, use word-start: "sal" matches "salt" or "salsa" but not "universal"
  const wordStartRegex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

  for (const recipe of recipes) {
    const intent = recipe.intent as Recipe['intent'] | null | undefined;
    const flavour = recipe.flavour as Recipe['flavour'] | null | undefined;
    const components = recipe.components as Recipe['components'] | null | undefined;

    // Check title (always for 2+ chars)
    if (recipe.title?.toLowerCase().includes(q)) {
      titleMatches.push(recipe);
      continue;
    }

    // Check tags (always for 2+ chars)
    if (Array.isArray(recipe.tags) && recipe.tags.some((t) => t.toLowerCase().includes(q))) {
      otherMatches.push(recipe);
      continue;
    }

    // Below here: only search deeper fields for queries >= 3 chars
    if (!deepSearch) continue;

    // Check intent fields — startsWith for partial category matching
    const occasion = typeof intent?.occasion === 'string' ? intent.occasion : '';
    const mood = typeof intent?.mood === 'string' ? intent.mood : '';
    const effort = typeof intent?.effort === 'string' ? intent.effort : '';
    const seasonVal = intent?.season as string | string[] | undefined;
    const seasonMatch = typeof seasonVal === 'string'
      ? seasonVal.toLowerCase().startsWith(q)
      : Array.isArray(seasonVal) && seasonVal.some((s: string) => typeof s === 'string' && s.toLowerCase().startsWith(q));

    if (
      occasion.toLowerCase().startsWith(q) ||
      mood.toLowerCase().startsWith(q) ||
      seasonMatch ||
      effort.toLowerCase().startsWith(q)
    ) {
      otherMatches.push(recipe);
      continue;
    }

    // Check dietary — word-start matching
    const dietary = Array.isArray(intent?.dietary) ? intent.dietary : [];
    if (dietary.some((d) => typeof d === 'string' && wordStartRegex.test(d))) {
      otherMatches.push(recipe);
      continue;
    }

    // Check flavour fields — word-start matching
    const dominant = typeof flavour?.dominant_element === 'string' ? flavour.dominant_element : '';
    if (dominant && wordStartRegex.test(dominant)) {
      otherMatches.push(recipe);
      continue;
    }

    // Check ingredient names — word-start matching only
    if (Array.isArray(components)) {
      let ingredientMatch = false;
      for (const comp of components) {
        const ingredients = (comp as { ingredients?: Array<{ name?: string }> })?.ingredients;
        if (!Array.isArray(ingredients)) continue;
        for (const ing of ingredients) {
          if (typeof ing?.name === 'string' && wordStartRegex.test(ing.name)) {
            ingredientMatch = true;
            break;
          }
        }
        if (ingredientMatch) break;
      }
      if (ingredientMatch) {
        otherMatches.push(recipe);
        continue;
      }
    }
  }

  return [...titleMatches, ...otherMatches];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LibraryPage() {
  const router = useRouter();
  const [allRecipes, setAllRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [facets, setFacets] = useState<FacetFilters>({ occasion: null, mood: null, effort: null, season: null, dietary: null, dominantElement: null, fingerprint: null });

  // Collect all unique tags across all recipes (not filtered)
  const allTags = Array.from(
    new Set(allRecipes.flatMap((r) => (Array.isArray(r.tags) ? r.tags : [])))
  ).sort();

  // Derive available facet filter options from all recipes
  const filterOptions = (() => {
    const occasions = new Set<string>();
    const moods = new Set<string>();
    const efforts = new Set<string>();
    const seasons = new Set<string>();
    const dietaryTags = new Set<string>();
    const dominantElements = new Set<string>();
    const fingerprints = new Set<string>();

    for (const recipe of allRecipes) {
      const intent = recipe.intent as any;
      const flavour = recipe.flavour as any;
      if (typeof intent?.occasion === 'string' && intent.occasion) occasions.add(intent.occasion);
      if (typeof intent?.mood === 'string' && intent.mood) moods.add(intent.mood);
      if (typeof intent?.effort === 'string' && intent.effort) efforts.add(intent.effort);
      // season can be a string or array of strings
      if (typeof intent?.season === 'string' && intent.season) {
        seasons.add(intent.season);
      } else if (Array.isArray(intent?.season)) {
        for (const s of intent.season) {
          if (typeof s === 'string' && s.trim()) seasons.add(s);
        }
      }
      if (Array.isArray(intent?.dietary)) {
        for (const d of intent.dietary) {
          if (typeof d === 'string' && d.trim()) dietaryTags.add(d);
        }
      }
      if (typeof flavour?.dominant_element === 'string' && flavour.dominant_element) dominantElements.add(flavour.dominant_element);
      if (typeof recipe.fingerprint_name === 'string' && recipe.fingerprint_name) fingerprints.add(recipe.fingerprint_name);
    }

    return {
      occasions: Array.from(occasions).sort(),
      moods: Array.from(moods).sort(),
      efforts: Array.from(efforts).sort(),
      seasons: Array.from(seasons).sort(),
      dietaryTags: Array.from(dietaryTags).sort(),
      dominantElements: Array.from(dominantElements).sort(),
      fingerprints: Array.from(fingerprints).sort(),
    };
  })();

  // -------------------------------------------------------------------------
  // Load recipes once
  // -------------------------------------------------------------------------

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getRecipes();
      if (result.success) {
        setAllRecipes(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Failed to load recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  // -------------------------------------------------------------------------
  // Derived filtered recipes: search → facets → tags
  // -------------------------------------------------------------------------

  const searched = searchQuery.trim()
    ? clientSideSearch(allRecipes, searchQuery)
    : allRecipes;
  const facetFiltered = filterByFacets(searched, facets);
  const filteredRecipes = activeTag
    ? facetFiltered.filter((r) => Array.isArray(r.tags) && r.tags.includes(activeTag))
    : facetFiltered;

  const hasAnyFilter = Object.values(facets).some((v) => v != null) || activeTag != null || searchQuery.trim().length > 0;

  const clearAllFilters = () => {
    setFacets({ occasion: null, mood: null, effort: null, season: null, dietary: null, dominantElement: null, fingerprint: null });
    setActiveTag(null);
    setSearchQuery('');
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="editorial" style={{ minHeight: '100vh' }}>
      {/* Scoped placeholder style for search input */}
      <style>{`.ed-search-input::placeholder { color: var(--ed-text-muted); opacity: 1; }`}</style>
      <div style={{ maxWidth: '100%', margin: '0 auto', padding: '48px 40px' }}>
        {/* Page title */}
        <h1
          style={{
            fontFamily: 'var(--ed-font-serif)',
            fontWeight: 400,
            fontSize: 'var(--ed-fs-hero)',
            color: 'var(--ed-text-primary)',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
          }}
        >
          Recipe Library
        </h1>
        <p
          style={{
            fontSize: 'var(--ed-fs-body)',
            color: 'var(--ed-text-secondary)',
            marginBottom: '48px',
          }}
        >
          Your saved recipes, sorted by most recently modified.
        </p>

        {/* Search bar */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            className="ed-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, ingredient, or tag…"
            style={{
              width: '100%',
              border: 'none',
              borderBottom: '1px solid var(--ed-border)',
              padding: '10px 0',
              fontSize: 'var(--ed-fs-body)',
              fontFamily: 'var(--ed-font)',
              color: 'var(--ed-text-primary)',
              background: 'transparent',
              outline: 'none',
              transition: 'border-color 200ms ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = 'var(--ed-text-primary)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = 'var(--ed-border)';
            }}
          />
        </div>

        {/* Facet filter controls */}
        {(() => {
          const facetRows = ([
            { label: 'Chef', key: 'fingerprint', options: filterOptions.fingerprints },
            { label: 'Occasion', key: 'occasion', options: filterOptions.occasions },
            { label: 'Mood', key: 'mood', options: filterOptions.moods },
            { label: 'Effort', key: 'effort', options: filterOptions.efforts },
            { label: 'Season', key: 'season', options: filterOptions.seasons },
            { label: 'Dietary', key: 'dietary', options: filterOptions.dietaryTags },
            { label: 'Element', key: 'dominantElement', options: filterOptions.dominantElements },
          ] as Array<{ label: string; key: keyof FacetFilters; options: string[] }>).filter((row) => row.options.length >= 2);

          if (facetRows.length === 0) return null;

          return (
            <div style={{ marginBottom: '16px' }}>
              {facetRows.map((row) => (
                <div
                  key={row.key}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--ed-font)',
                      fontSize: 'var(--ed-fs-small)',
                      color: 'var(--ed-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginRight: '8px',
                      userSelect: 'none',
                    }}
                  >
                    {row.label}:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFacets((prev) => ({ ...prev, [row.key]: null }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px 0',
                      cursor: 'pointer',
                      fontFamily: 'var(--ed-font)',
                      fontSize: 'var(--ed-fs-small)',
                      fontWeight: facets[row.key] === null ? 700 : 400,
                      color: facets[row.key] === null ? 'var(--ed-text-primary)' : 'var(--ed-text-muted)',
                      transition: 'color 200ms ease',
                    }}
                  >
                    All
                  </button>
                  {row.options.map((option, optIdx) => (
                    <span key={`${row.key}-${optIdx}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span
                        style={{
                          color: 'var(--ed-text-muted)',
                          margin: '0 8px',
                          fontSize: 'var(--ed-fs-small)',
                          userSelect: 'none',
                        }}
                      >
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFacets((prev) => ({
                            ...prev,
                            [row.key]: prev[row.key] === option ? null : option,
                          }))
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px 0',
                          cursor: 'pointer',
                          fontFamily: 'var(--ed-font)',
                          fontSize: 'var(--ed-fs-small)',
                          fontWeight: facets[row.key] === option ? 700 : 400,
                          color: facets[row.key] === option ? 'var(--ed-text-primary)' : 'var(--ed-text-muted)',
                          transition: 'color 200ms ease',
                        }}
                      >
                        {option}
                      </button>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Tag filter chips — interpunct-separated plain text */}
        {allTags.length > 0 && (
          <div style={{ marginBottom: '32px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0' }}>
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                fontFamily: 'var(--ed-font)',
                fontSize: 'var(--ed-fs-small)',
                fontWeight: activeTag === null ? 700 : 400,
                color: activeTag === null ? 'var(--ed-text-primary)' : 'var(--ed-text-muted)',
                transition: 'color 200ms ease',
              }}
            >
              All
            </button>
            {allTags.map((tag) => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span
                  style={{
                    color: 'var(--ed-text-muted)',
                    margin: '0 8px',
                    fontSize: 'var(--ed-fs-small)',
                    userSelect: 'none',
                  }}
                >
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    cursor: 'pointer',
                    fontFamily: 'var(--ed-font)',
                    fontSize: 'var(--ed-fs-small)',
                    fontWeight: activeTag === tag ? 700 : 400,
                    color: activeTag === tag ? 'var(--ed-text-primary)' : 'var(--ed-text-muted)',
                    transition: 'color 200ms ease',
                  }}
                >
                  {tag}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Active filter count and clear all */}
        {hasAnyFilter && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{
                fontFamily: 'var(--ed-font)',
                fontSize: 'var(--ed-fs-small)',
                color: 'var(--ed-text-muted)',
              }}
            >
              {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                fontFamily: 'var(--ed-font)',
                fontSize: 'var(--ed-fs-small)',
                fontWeight: 400,
                color: 'var(--ed-text-muted)',
                textDecoration: 'underline',
                transition: 'color 200ms ease',
              }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--ed-fs-body)', color: 'var(--ed-text-muted)' }}>
              Loading recipes…
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginBottom: '24px', padding: '16px 0' }}>
            <p style={{ fontSize: 'var(--ed-fs-body)', color: 'var(--ed-text-primary)' }}>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredRecipes.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--ed-fs-body)', color: 'var(--ed-text-muted)' }}>
              {searchQuery || activeTag || hasAnyFilter
                ? 'No recipes match your search.'
                : 'No recipes yet. Head to the Canvas to generate your first recipe.'}
            </p>
          </div>
        )}

        {/* Recipe cards */}
        {!loading && filteredRecipes.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredRecipes.map((recipe) => {
              const meta = extractCardMetadata(recipe);

              // Line 1: occasion · mood · effort · duration · Feeds N
              const line1Parts = [
                meta.occasion,
                meta.mood,
                meta.effort,
                meta.totalTime > 0 ? formatDuration(meta.totalTime) : '',
                meta.feeds > 0 ? `Feeds ${meta.feeds}` : '',
              ].filter(Boolean);

              // Line 2: dominant element · N ingredients
              const line2Parts = [
                meta.dominantElement,
                meta.ingredientCount > 0 ? `${meta.ingredientCount} ingredients` : '',
              ].filter(Boolean);

              // Line 3: dietary tags
              const dietaryLine = meta.dietary.length > 0 ? meta.dietary.join(' · ') : '';

              return (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => router.push(`/library/${recipe.id}`)}
                  style={{
                    textAlign: 'left',
                    padding: '20px',
                    border: '1px solid var(--ed-border)',
                    borderRadius: '0',
                    boxShadow: 'none',
                    background: 'var(--ed-bg)',
                    cursor: 'pointer',
                    transition: 'border-color 200ms ease',
                    fontFamily: 'var(--ed-font)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ed-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ed-border)';
                  }}
                >
                  {/* Title */}
                  <h3
                    style={{
                      fontWeight: 600,
                      fontSize: 'var(--ed-fs-body)',
                      color: 'var(--ed-text-primary)',
                      marginBottom: '6px',
                      lineHeight: 1.3,
                    }}
                  >
                    {recipe.title}
                  </h3>

                  {/* Enriched metadata — Line 1: occasion · mood · effort · duration · feeds */}
                  {line1Parts.length > 0 && (
                    <div
                      style={{
                        fontSize: 'var(--ed-fs-small)',
                        color: 'var(--ed-text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {line1Parts.join(' · ')}
                    </div>
                  )}

                  {/* Enriched metadata — Line 2: dominant element · ingredient count */}
                  {line2Parts.length > 0 && (
                    <div
                      style={{
                        fontSize: 'var(--ed-fs-small)',
                        color: 'var(--ed-text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {line2Parts.join(' · ')}
                    </div>
                  )}

                  {/* Enriched metadata — Line 3: dietary tags */}
                  {dietaryLine && (
                    <div
                      style={{
                        fontSize: 'var(--ed-fs-small)',
                        color: 'var(--ed-text-muted)',
                        lineHeight: 1.5,
                        marginBottom: '4px',
                      }}
                    >
                      {dietaryLine}
                    </div>
                  )}

                  {/* Existing metadata — fingerprint, complexity, cooked, date */}
                  <div
                    style={{
                      fontSize: 'var(--ed-fs-small)',
                      color: 'var(--ed-text-muted)',
                      marginBottom: '8px',
                      lineHeight: 1.5,
                    }}
                  >
                    {[
                      recipe.fingerprint_name || null,
                      recipe.complexity_mode,
                      recipe.cooked ? 'Cooked' : null,
                      new Date(recipe.updated_at).toLocaleDateString('en-CA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>

                  {/* Tags — plain text, no pill backgrounds */}
                  {Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                    <div
                      style={{
                        fontSize: 'var(--ed-fs-small)',
                        color: 'var(--ed-text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {recipe.tags.join(' · ')}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
