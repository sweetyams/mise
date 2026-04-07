'use client';

// =============================================================================
// MISE Recipe Detail — Client Component
// =============================================================================
// Interactive recipe view: display modes, dev notes, tags, cooked toggle,
// version history with diff, The Dial UI.
// Requirements: 8.5–8.7, 9.2–9.4, 9.6–9.11
// =============================================================================

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DisplayModeSwitcher from '@/components/display-mode-switcher';
import type { Recipe, DialDirection } from '@/lib/types/recipe';
import type { VersionHistoryEntry } from '@/lib/version-store';
import {
  addDevNotes,
  addTags,
  markAsCooked,
  deleteRecipe,
} from '../actions';
import { suggestSubstitutions } from '../../canvas/actions';
import type { Substitution } from '@/lib/types/recipe';
import {
  exportRecipeAsPdf,
  exportRecipeAsMarkdown,
  canExport,
  canUseBranding,
  type ExportOptions,
} from '@/lib/export-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
interface RecipeDetailClientProps {
  recipe: any; // DB row shape
  versions: VersionHistoryEntry[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const DIAL_DIRECTIONS: Array<{ value: DialDirection; label: string }> = [
  { value: 'more_acid', label: 'More Acid' },
  { value: 'smokier', label: 'Smokier' },
  { value: 'more_umami', label: 'More Umami' },
  { value: 'more_heat', label: 'More Heat' },
  { value: 'lighter', label: 'Lighter' },
  { value: 'funkier', label: 'Funkier' },
  { value: 'different_region', label: 'Different Region' },
  { value: 'riff_mode', label: 'Riff Mode' },
];

// ---------------------------------------------------------------------------
// Helper: convert DB row to Recipe interface
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    title: row.title,
    fingerprint: row.fingerprint_id ?? '',
    version: row.version,
    intent: row.intent ?? {},
    flavour: row.flavour ?? {},
    components: row.components ?? [],
    timeline: row.timeline ?? [],
    variations: row.variations ?? {},
    related: row.related ?? {},
    thinking: row.thinking ?? {},
    promptSnapshot: row.prompt_used ?? {},
    complexityMode: row.complexity_mode ?? 'kitchen',
    cooked: row.cooked ?? false,
    devNotes: row.dev_notes ?? null,
    tags: row.tags ?? [],
    isPublic: row.is_public ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecipeDetailClient({
  recipe: recipeRow,
  versions,
}: RecipeDetailClientProps) {
  const router = useRouter();
  const recipe = rowToRecipe(recipeRow);

  // Editable state
  const [devNotes, setDevNotes] = useState(recipe.devNotes ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(recipe.tags);
  const [cooked, setCooked] = useState(recipe.cooked);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Dial state
  const [dialling, setDialling] = useState(false);
  const [dialError, setDialError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Version comparison state
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  // Substitution state
  const [unavailableIngredients, setUnavailableIngredients] = useState<Set<string>>(new Set());
  const [substitutionResults, setSubstitutionResults] = useState<Record<string, Substitution[]>>({});
  const [substitutionLoading, setSubstitutionLoading] = useState<string | null>(null);

  // Export state
  const [exportFormat, setExportFormat] = useState<'pdf' | 'markdown'>('pdf');
  const [exportBrandingName, setExportBrandingName] = useState('');
  const [exportBrandingBusiness, setExportBrandingBusiness] = useState('');
  const [showExportPanel, setShowExportPanel] = useState(false);

  // -------------------------------------------------------------------------
  // Dev notes save
  // -------------------------------------------------------------------------

  const handleSaveDevNotes = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const result = await addDevNotes(recipe.id, devNotes);
    setSaving(false);
    setMessage(result.success ? 'Dev notes saved.' : result.error);
  }, [recipe.id, devNotes]);

  // -------------------------------------------------------------------------
  // Tags
  // -------------------------------------------------------------------------

  const handleAddTag = useCallback(async () => {
    const newTag = tagInput.trim();
    if (!newTag || tags.includes(newTag)) return;

    const updatedTags = [...tags, newTag];
    setTags(updatedTags);
    setTagInput('');

    const result = await addTags(recipe.id, updatedTags);
    if (!result.success) {
      setMessage(result.error);
      setTags(tags); // revert
    }
  }, [recipe.id, tagInput, tags]);

  const handleRemoveTag = useCallback(
    async (tagToRemove: string) => {
      const updatedTags = tags.filter((t) => t !== tagToRemove);
      setTags(updatedTags);

      const result = await addTags(recipe.id, updatedTags);
      if (!result.success) {
        setMessage(result.error);
        setTags(tags); // revert
      }
    },
    [recipe.id, tags]
  );

  // -------------------------------------------------------------------------
  // Mark as cooked
  // -------------------------------------------------------------------------

  const handleMarkCooked = useCallback(async () => {
    setCooked(true);
    const result = await markAsCooked(recipe.id);
    if (!result.success) {
      setCooked(false);
      setMessage(result.error);
    }
  }, [recipe.id]);

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const result = await deleteRecipe(recipe.id);
    if (result.success) {
      router.push('/library');
    } else {
      setMessage(result.error);
    }
  }, [recipe.id, router]);

  // -------------------------------------------------------------------------
  // The Dial
  // -------------------------------------------------------------------------

  const handleDial = useCallback(
    async (direction: DialDirection) => {
      setDialling(true);
      setDialError(null);

      try {
        const body: Record<string, string> = {
          recipeId: recipe.id,
          direction,
          userId: '', // will be resolved server-side
        };
        if (selectedVersionId) {
          body.fromVersionId = selectedVersionId;
        }

        // Call dial API (server action would be better, but for now we refresh)
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, action: 'dial' }),
        });

        if (!response.ok) {
          setDialError('Dial failed. Please try again.');
        } else {
          // Refresh the page to show new version
          router.refresh();
        }
      } catch {
        setDialError('An error occurred. Please try again.');
      } finally {
        setDialling(false);
      }
    },
    [recipe.id, selectedVersionId, router]
  );

  // -------------------------------------------------------------------------
  // Export handler
  // -------------------------------------------------------------------------

  const handleExport = useCallback(() => {
    const options: ExportOptions = { format: exportFormat };

    if (exportBrandingName.trim()) {
      options.branding = {
        name: exportBrandingName.trim(),
        businessName: exportBrandingBusiness.trim() || undefined,
      };
    }

    if (exportFormat === 'pdf') {
      const html = exportRecipeAsPdf(recipe, options);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recipe.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const md = exportRecipeAsMarkdown(recipe, options);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recipe.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [recipe, exportFormat, exportBrandingName, exportBrandingBusiness]);

  // -------------------------------------------------------------------------
  // Substitution — mark ingredient unavailable and fetch alternatives
  // -------------------------------------------------------------------------

  const handleToggleUnavailable = useCallback(
    async (ingredientName: string, ingredient: Recipe['components'][0]['ingredients'][0]) => {
      const key = ingredientName;
      const newSet = new Set(unavailableIngredients);

      if (newSet.has(key)) {
        newSet.delete(key);
        setUnavailableIngredients(newSet);
        return;
      }

      newSet.add(key);
      setUnavailableIngredients(newSet);

      // Fetch substitutions if not already loaded
      if (!substitutionResults[key]) {
        setSubstitutionLoading(key);
        const recipeContext = `${recipe.title} — ${recipe.thinking.approach ?? ''}`;
        const result = await suggestSubstitutions(
          ingredient,
          recipeContext,
          recipe.fingerprint
        );
        setSubstitutionLoading(null);

        if (result.success) {
          setSubstitutionResults((prev) => ({ ...prev, [key]: result.data }));
        }
      }
    },
    [unavailableIngredients, substitutionResults, recipe]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{recipe.title}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span>{recipe.complexityMode} mode</span>
              <span>·</span>
              <span>
                {new Date(recipe.updatedAt).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {cooked && (
                <>
                  <span>·</span>
                  <span className="text-green-600">✓ Cooked</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!cooked && (
              <button
                type="button"
                onClick={handleMarkCooked}
                className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
              >
                Mark as Cooked
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main content — 2 columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Display Mode Switcher */}
            <DisplayModeSwitcher recipe={recipe} />

            {/* Tags */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold">Tags</h2>
              <div className="mb-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 text-blue-400 hover:text-blue-600"
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add a tag…"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Dev Notes */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold">Dev Notes</h2>
              <textarea
                value={devNotes}
                onChange={(e) => setDevNotes(e.target.value)}
                placeholder="Your development notes — what worked, what to try next…"
                rows={4}
                className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              />
              <button
                type="button"
                onClick={handleSaveDevNotes}
                disabled={saving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Notes'}
              </button>
            </div>

            {/* Ingredient Substitutions */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold">Ingredient Substitutions</h2>
              <p className="mb-3 text-xs text-gray-500">
                Mark ingredients as unavailable to see AI-suggested alternatives.
              </p>
              {recipe.components.map((comp) => (
                <div key={comp.name} className="mb-3">
                  <h3 className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {comp.name}
                  </h3>
                  <div className="space-y-1">
                    {comp.ingredients.map((ing) => {
                      const isUnavailable = unavailableIngredients.has(ing.name);
                      const subs = substitutionResults[ing.name];
                      const isLoading = substitutionLoading === ing.name;

                      return (
                        <div key={ing.name}>
                          <button
                            type="button"
                            onClick={() => handleToggleUnavailable(ing.name, ing)}
                            className={`w-full rounded-md px-2 py-1 text-left text-xs transition-colors ${
                              isUnavailable
                                ? 'bg-amber-50 text-amber-700 line-through dark:bg-amber-950 dark:text-amber-400'
                                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                          >
                            {ing.amount} {ing.unit} {ing.name}
                            {isUnavailable && ' (unavailable)'}
                          </button>
                          {isLoading && (
                            <div className="ml-4 mt-1 flex items-center gap-1 text-xs text-blue-600">
                              <div className="h-2 w-2 animate-spin rounded-full border border-blue-600 border-t-transparent" />
                              Finding alternatives…
                            </div>
                          )}
                          {isUnavailable && subs && subs.length > 0 && (
                            <div className="ml-4 mt-1 space-y-1">
                              {subs.map((sub, i) => (
                                <div
                                  key={i}
                                  className="rounded bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-950 dark:text-green-400"
                                >
                                  ↳ {sub.amount} {sub.unit} {sub.name}
                                  {sub.notes && (
                                    <span className="ml-1 text-green-500">— {sub.notes}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar — 1 column */}
          <div className="space-y-6">
            {/* The Dial */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold">The Dial</h2>
              <p className="mb-3 text-xs text-gray-500">
                Push a direction to evolve this recipe. Each push generates a new version.
              </p>

              {/* Version selector */}
              {versions.length > 0 && (
                <div className="mb-3">
                  <label htmlFor="dial-version" className="mb-1 block text-xs text-gray-500">
                    Dial from version:
                  </label>
                  <select
                    id="dial-version"
                    value={selectedVersionId ?? ''}
                    onChange={(e) =>
                      setSelectedVersionId(e.target.value || null)
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                  >
                    <option value="">Current (latest)</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNumber}
                        {v.dialDirection ? ` — ${v.dialDirection.replace(/_/g, ' ')}` : ' — original'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {DIAL_DIRECTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => handleDial(d.value)}
                    disabled={dialling}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-xs font-medium transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-950"
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {dialling && (
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Evolving recipe…
                </div>
              )}

              {dialError && (
                <p className="mt-2 text-xs text-red-600">{dialError}</p>
              )}
            </div>

            {/* Version History */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold">Version History</h2>

              {versions.length === 0 ? (
                <p className="text-xs text-gray-500">No versions yet.</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-md border border-gray-100 p-2 text-xs dark:border-gray-700"
                    >
                      <div>
                        <span className="font-medium">v{v.versionNumber}</span>
                        {v.dialDirection && (
                          <span className="ml-1 rounded bg-purple-50 px-1.5 py-0.5 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            {v.dialDirection.replace(/_/g, ' ')}
                          </span>
                        )}
                        <div className="mt-0.5 text-gray-400">
                          {new Date(v.createdAt).toLocaleDateString('en-CA', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCompareA(compareA === v.id ? null : v.id)
                          }
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            compareA === v.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCompareB(compareB === v.id ? null : v.id)
                          }
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            compareB === v.id
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          B
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comparison hint */}
              {(compareA || compareB) && (
                <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {compareA && compareB
                    ? 'Select both A and B to compare versions side by side. (Full diff view coming soon.)'
                    : 'Select both A and B versions to compare.'}
                </div>
              )}

              {/* Dial History */}
              {versions.some((v) => v.dialDirection) && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold text-gray-500">
                    Dial History
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {versions
                      .filter((v) => v.dialDirection)
                      .map((v) => (
                        <span
                          key={v.id}
                          className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                        >
                          v{v.versionNumber}: {v.dialDirection?.replace(/_/g, ' ')}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold">Export</h2>
              <button
                type="button"
                onClick={() => setShowExportPanel(!showExportPanel)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                {showExportPanel ? 'Hide Export Options' : 'Export Recipe'}
              </button>

              {showExportPanel && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label htmlFor="export-format" className="mb-1 block text-xs text-gray-500">
                      Format
                    </label>
                    <select
                      id="export-format"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'markdown')}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="pdf">PDF (HTML)</option>
                      <option value="markdown">Markdown</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="branding-name" className="mb-1 block text-xs text-gray-500">
                      Your Name (Creator/Brigade)
                    </label>
                    <input
                      id="branding-name"
                      type="text"
                      value={exportBrandingName}
                      onChange={(e) => setExportBrandingName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label htmlFor="branding-business" className="mb-1 block text-xs text-gray-500">
                      Business Name (optional)
                    </label>
                    <input
                      id="branding-business"
                      type="text"
                      value={exportBrandingBusiness}
                      onChange={(e) => setExportBrandingBusiness(e.target.value)}
                      placeholder="Business name"
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Download {exportFormat === 'pdf' ? 'HTML' : 'Markdown'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
