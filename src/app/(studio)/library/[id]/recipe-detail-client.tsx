'use client';

// =============================================================================
// MISE Recipe Detail — Client Component (Editorial V2 — 3-Panel Layout)
// =============================================================================

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DisplayModeSwitcher from '@/components/display-mode-switcher';
import {
  EditorialHeader,
  EditorialSection,
  EditorialThinking,
  EditorialFlavourPanel,
  EditorialComponentCard,
  EditorialTimeline,
  EditorialVariations,
} from '@/components/editorial';
import type { Recipe, DialDirection } from '@/lib/types/recipe';
import type { VersionHistoryEntry } from '@/lib/version-store';
import {
  addDevNotes,
  addTags,
  markAsCooked,
  deleteRecipe,
  getRecipeVersion,
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
  recipe: any;
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
];

// ---------------------------------------------------------------------------
// Helper: convert DB row to Recipe interface
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || '',
    fingerprint_id: row.fingerprint_id ?? '',
    fingerprint_version: row.fingerprint_version ?? 0,
    complexity_mode: row.complexity_mode ?? 'kitchen',
    version: row.version ?? 1,
    parent_id: row.parent_id ?? null,
    root_id: row.root_id ?? null,
    created_at: row.created_at ?? '',
    generated_by: row.generated_by ?? '',
    chef_brain_version: row.chef_brain_version ?? 0,
    intent: row.intent ?? {},
    flavour: row.flavour ?? {},
    components: row.components ?? [],
    timeline: Array.isArray(row.timeline)
      ? { total_duration_minutes: 0, serve_time: null, stages: row.timeline.map((s: any) => ({ label: s.name || s.label || '', duration_minutes: s.duration || s.duration_minutes || 0, is_passive: s.parallel || s.is_passive || false, advance_prep: s.advance_prep || false, component_ids: [], offset_from_start: 0 })), parallel_possible: false, parallel_notes: '', critical_path: [] }
      : (row.timeline ?? { total_duration_minutes: 0, serve_time: null, stages: [], parallel_possible: false, parallel_notes: '', critical_path: [] }),
    scaling: row.scaling ?? { base_serves: 4, min_serves: 1, max_serves: 12, non_linear_notes: [], equipment_notes: '', batch_notes: '' },
    variations: row.variations ?? {},
    relationships: row.related ?? {},
    thinking: {
      origin: row.thinking?.origin || row.thinking?.approach || '',
      architecture_logic: row.thinking?.architecture_logic || row.thinking?.architecture || '',
      the_pattern: row.thinking?.the_pattern || row.thinking?.pattern || '',
      fingerprint_note: row.thinking?.fingerprint_note || '',
    },
    decision_lock_answers: row.decision_lock_answers ?? undefined,
    shopping_list: row.shopping_list ?? { grouped_by_section: [], pantry_assumed: [], the_one_thing: '' },
    development_log: row.development_log ?? [],
    meta: row.meta ?? { is_public: false, public_slug: '', share_card_generated: false, times_generated: 0, times_cooked: 0, tags: [], source_prompt: '', token_usage: { input_tokens: 0, output_tokens: 0, fingerprint_layers_loaded: [] }, language: 'en' },
    // Legacy compat fields used by some components
    fingerprint: row.fingerprint_id ?? '',
    complexityMode: row.complexity_mode ?? 'kitchen',
    cooked: row.cooked ?? false,
    devNotes: row.dev_notes ?? null,
    tags: row.tags ?? [],
    isPublic: row.is_public ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as any; // Cast needed because we include legacy compat fields
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Inline styles — editorial tokens (V2)
// ---------------------------------------------------------------------------

const sectionLabelStyle: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontSize: 'var(--ed-fs-micro)',
  fontWeight: 600,
  color: 'var(--ed-text-muted)',
  margin: '0 0 16px',
};

const panelSectionStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--ed-border)',
  padding: '24px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--ed-border)',
  padding: '8px 0',
  fontSize: 'var(--ed-fs-body)',
  fontFamily: 'var(--ed-font)',
  color: 'var(--ed-text-primary)',
  outline: 'none',
  transition: 'border-color 200ms',
};

const textBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: 'var(--ed-font)',
  fontSize: 'var(--ed-fs-small)',
  color: 'var(--ed-text-muted)',
  opacity: 0.8,
  transition: 'opacity 150ms',
};

const dialBtnStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  padding: '9px 8px',
  border: '1px solid var(--ed-border)',
  background: 'transparent',
  color: 'var(--ed-text-secondary)',
  cursor: 'pointer',
  fontFamily: 'var(--ed-font)',
  textTransform: 'uppercase',
  transition: 'border-color 200ms, opacity 150ms',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecipeDetailClient({
  recipe: recipeRow,
  versions,
}: RecipeDetailClientProps) {
  const router = useRouter();
  const baseRecipe = rowToRecipe(recipeRow);

  // Version viewing state
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
  const [versionRecipe, setVersionRecipe] = useState<ReturnType<typeof rowToRecipe> | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);

  // The displayed recipe — either the base or a loaded version
  const recipe = versionRecipe ?? baseRecipe;

  const hasStructuredData = recipe.components?.length > 0 && recipe.components[0]?.ingredients?.length > 0;

  // Editable state
  const [devNotes, setDevNotes] = useState(recipe.devNotes ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(recipe.tags);
  const [cooked, setCooked] = useState(recipe.cooked);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [decisionLockOpen, setDecisionLockOpen] = useState(false);
  const [dialling, setDialling] = useState(false);
  const [dialError, setDialError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [unavailableIngredients, setUnavailableIngredients] = useState<Set<string>>(new Set());
  const [substitutionResults, setSubstitutionResults] = useState<Record<string, Substitution[]>>({});
  const [substitutionLoading, setSubstitutionLoading] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'markdown'>('pdf');
  const [exportBrandingName, setExportBrandingName] = useState('');
  const [exportBrandingBusiness, setExportBrandingBusiness] = useState('');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [customDialPrompt, setCustomDialPrompt] = useState('');

  // Version switching handler
  const handleViewVersion = useCallback(async (versionId: string | null) => {
    if (!versionId) {
      // Switch back to current (base) recipe
      setViewingVersionId(null);
      setVersionRecipe(null);
      return;
    }
    if (versionId === viewingVersionId) return;
    setLoadingVersion(true);
    try {
      const result = await getRecipeVersion(versionId);
      if (result.success) {
        setViewingVersionId(versionId);
        setVersionRecipe(rowToRecipe(result.data));
      }
    } catch {
      // Failed to load version — stay on current
    } finally {
      setLoadingVersion(false);
    }
  }, [viewingVersionId]);

  const handleSaveDevNotes = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const result = await addDevNotes(recipe.id, devNotes);
    setSaving(false);
    setMessage(result.success ? 'Dev notes saved.' : result.error);
  }, [recipe.id, devNotes]);

  const handleAddTag = useCallback(async () => {
    const newTag = tagInput.trim();
    if (!newTag || tags.includes(newTag)) return;
    const updatedTags = [...tags, newTag];
    setTags(updatedTags);
    setTagInput('');
    const result = await addTags(recipe.id, updatedTags);
    if (!result.success) { setMessage(result.error); setTags(tags); }
  }, [recipe.id, tagInput, tags]);

  const handleRemoveTag = useCallback(async (tagToRemove: string) => {
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    setTags(updatedTags);
    const result = await addTags(recipe.id, updatedTags);
    if (!result.success) { setMessage(result.error); setTags(tags); }
  }, [recipe.id, tags]);

  const handleMarkCooked = useCallback(async () => {
    setCooked(true);
    const result = await markAsCooked(recipe.id);
    if (!result.success) { setCooked(false); setMessage(result.error); }
  }, [recipe.id]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const result = await deleteRecipe(recipe.id);
    if (result.success) { router.push('/library'); } else { setMessage(result.error); }
  }, [recipe.id, router]);

  const handleDial = useCallback(async (direction: DialDirection, promptText?: string) => {
    setDialling(true);
    setDialError(null);
    try {
      const body: Record<string, string> = { recipeId: recipe.id, direction, userId: '' };
      if (selectedVersionId) body.fromVersionId = selectedVersionId;
      if (direction === 'custom_prompt' && promptText) body.customPrompt = promptText;
      const response = await fetch('/api/dial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        setDialError(errData?.error || 'Dial failed. Please try again.');
      } else {
        const data = await response.json();
        const label = direction === 'custom_prompt' ? 'custom evolution' : direction.replace(/_/g, ' ');
        setMessage(`Dialled ${label}. ${data.changes || ''}`);
        if (direction === 'custom_prompt') setCustomDialPrompt('');
        router.refresh();
      }
    } catch { setDialError('An error occurred. Please try again.'); }
    finally { setDialling(false); }
  }, [recipe.id, selectedVersionId, router]);

  const handleExport = useCallback(() => {
    const options: ExportOptions = { format: exportFormat };
    if (exportBrandingName.trim()) {
      options.branding = { name: exportBrandingName.trim(), businessName: exportBrandingBusiness.trim() || undefined };
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

  const handleToggleUnavailable = useCallback(
    async (ingredientName: string, ingredient: Recipe['components'][0]['ingredients'][0]) => {
      const key = ingredientName;
      const newSet = new Set(unavailableIngredients);
      if (newSet.has(key)) { newSet.delete(key); setUnavailableIngredients(newSet); return; }
      newSet.add(key);
      setUnavailableIngredients(newSet);
      if (!substitutionResults[key]) {
        setSubstitutionLoading(key);
        const recipeContext = `${recipe.title} — ${recipe.thinking.approach ?? ''}`;
        const result = await suggestSubstitutions(ingredient, recipeContext, recipe.fingerprint);
        setSubstitutionLoading(null);
        if (result.success) { setSubstitutionResults((prev) => ({ ...prev, [key]: result.data })); }
      }
    },
    [unavailableIngredients, substitutionResults, recipe]
  );

  const title = recipe.title;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="editorial" style={{ minHeight: '100vh' }}>

      {/* ===== TOP BAR ===== */}
      <div className="ed-topbar" style={{
        padding: '20px 48px',
        borderBottom: '1px solid var(--ed-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        background: 'var(--ed-bg)',
        zIndex: 10,
      }}>
        <div>
          <span style={{
            fontSize: 'var(--ed-fs-body)',
            fontWeight: 600,
            color: 'var(--ed-text-primary)',
          }}>{title}</span>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            color: 'var(--ed-text-muted)',
            letterSpacing: '0.04em',
            fontFamily: 'monospace',
            display: 'block',
            marginTop: '4px',
          }}>{recipe.id}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            style={{
              fontFamily: 'var(--ed-font)',
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '8px 16px',
              border: '1px solid #DDD0CE',
              background: 'transparent',
              color: '#B03A2A',
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >Delete</button>
          {!cooked && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleMarkCooked}
              style={{
                fontFamily: 'var(--ed-font)',
                fontSize: 'var(--ed-fs-micro)',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '8px 16px',
                border: '1px solid var(--ed-text-primary)',
                background: 'var(--ed-text-primary)',
                color: 'var(--ed-bg)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >Mark Cooked</button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '12px 48px',
          borderBottom: '1px solid var(--ed-border)',
          fontSize: 'var(--ed-fs-body)',
          color: 'var(--ed-text-secondary)',
        }}>
          {message}
        </div>
      )}

      {/* ===== APP LAYOUT: content + side panel ===== */}
      <div className="ed-app-layout" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: 0,
        alignItems: 'start',
      }}>

        {/* ===== MAIN CONTENT (left, scrollable) ===== */}
        <div className="ed-main-content" style={{ padding: '0 48px 100px', overflow: 'auto' }}>

          {/* Editorial Header */}
          <EditorialHeader
            title={recipe.title}
            subtitle={recipe.subtitle}
            occasion={recipe.intent?.occasion}
            mood={recipe.intent?.mood}
            effort={recipe.intent?.effort}
            totalTime={recipe.intent?.total_time_minutes}
            season={recipe.intent?.season}
            fingerprint={recipe.fingerprint}
            feeds={recipe.intent?.feeds}
            activeTime={recipe.intent?.active_time_minutes}
            prepAheadNotes={recipe.intent?.prep_ahead_notes}
          />

          {hasStructuredData ? (
            <>
              {/* Decision Lock Answers — collapsible */}
              {recipe.decision_lock_answers && recipe.decision_lock_answers.length > 0 && (
                <div style={{ marginTop: 'var(--ed-spacing-section)' }}>
                  <button
                    type="button"
                    onClick={() => setDecisionLockOpen(!decisionLockOpen)}
                    style={{
                      ...textBtnStyle,
                      display: 'flex',
                      width: '100%',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 'var(--ed-fs-body)',
                      color: 'var(--ed-text-primary)',
                      fontWeight: 600,
                      opacity: 1,
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--ed-border)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <span>Decision Lock Answers ({recipe.decision_lock_answers.length})</span>
                    <span style={{ color: 'var(--ed-text-muted)', fontSize: 'var(--ed-fs-small)' }}>
                      {decisionLockOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  <div style={{
                    display: 'grid',
                    gridTemplateRows: decisionLockOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 200ms ease-out',
                  }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ paddingTop: 'var(--ed-spacing-subsection)' }}>
                        {recipe.decision_lock_answers.map((dla: { question: string; answer: string }, i: number) => (
                          <div key={i} style={{ marginBottom: '16px' }}>
                            <p style={{ fontSize: 'var(--ed-fs-body)', fontWeight: 600, color: 'var(--ed-text-primary)', margin: 0 }}>
                              Q: {dla.question}
                            </p>
                            <p style={{ fontSize: 'var(--ed-fs-body)', color: 'var(--ed-text-secondary)', margin: '4px 0 0' }}>
                              A: {dla.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Intro: Thinking + Flavour Architecture side by side */}
              <div className="ed-intro" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 0,
                borderBottom: '1px solid var(--ed-border)',
                marginBottom: 0,
              }}>
                <div style={{
                  padding: '40px 48px 40px 0',
                  borderRight: '1px solid var(--ed-border)',
                }}>
                  <span style={{
                    fontSize: 'var(--ed-fs-micro)',
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--ed-text-muted)',
                    display: 'block',
                    marginBottom: '14px',
                  }}>The Thinking</span>
                  <EditorialThinking thinking={recipe.thinking} />
                </div>
                <div style={{ padding: '40px 0 40px 48px' }}>
                  <span style={{
                    fontSize: 'var(--ed-fs-micro)',
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--ed-text-muted)',
                    display: 'block',
                    marginBottom: '14px',
                  }}>Flavour Architecture</span>
                  <EditorialFlavourPanel flavour={recipe.flavour} />
                </div>
              </div>

              {/* Timeline as bake bar */}
              {recipe.timeline?.stages?.length > 0 && (
                <EditorialTimeline timeline={recipe.timeline} />
              )}

              {/* Component Cards with index numbers */}
              {recipe.components.map((comp: Recipe['components'][0], idx: number) => (
                <EditorialComponentCard
                  key={comp.id || comp.name}
                  component={comp}
                  componentIndex={idx + 1}
                />
              ))}

              {/* Variations */}
              <EditorialVariations variations={recipe.variations} />

              {/* Pairs With */}
              {recipe.related?.pairs_with && recipe.related.pairs_with.length > 0 && (
                <div style={{ padding: '40px 0', borderBottom: '1px solid var(--ed-border)' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '280px 1fr',
                    gap: 0,
                    alignItems: 'start',
                  }}>
                    <div style={{ paddingRight: '36px', borderRight: '1px solid var(--ed-border)' }}>
                      <span style={{
                        fontSize: 'var(--ed-fs-micro)',
                        fontWeight: 500,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--ed-text-muted)',
                      }}>Pairs With</span>
                    </div>
                    <div style={{ paddingLeft: '36px' }}>
                      <p style={{
                        fontSize: 'var(--ed-fs-body)',
                        color: 'var(--ed-text-secondary)',
                        lineHeight: 1.65,
                        margin: 0,
                      }}>
                        {recipe.related.pairs_with.join(' · ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scale Notes */}
              {recipe.scaling?.non_linear_notes && recipe.scaling.non_linear_notes.length > 0 && (
                <div style={{ padding: '40px 0', borderBottom: '1px solid var(--ed-border)' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '280px 1fr',
                    gap: 0,
                    alignItems: 'start',
                  }}>
                    <div style={{ paddingRight: '36px', borderRight: '1px solid var(--ed-border)' }}>
                      <span style={{
                        fontSize: 'var(--ed-fs-micro)',
                        fontWeight: 500,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--ed-text-muted)',
                      }}>Scale Notes</span>
                    </div>
                    <div style={{ paddingLeft: '36px' }}>
                      {recipe.scaling.non_linear_notes.map((note: string, i: number) => (
                        <p key={i} style={{
                          fontSize: 'var(--ed-fs-body)',
                          color: 'var(--ed-text-secondary)',
                          lineHeight: 1.65,
                          margin: i > 0 ? '8px 0 0' : 0,
                        }}>
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ marginTop: 'var(--ed-spacing-section)' }}>
              <DisplayModeSwitcher recipe={recipe} />
            </div>
          )}

          {/* Footer */}
          <footer style={{
            padding: '32px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--ed-text-muted)',
            }}>
              <span style={{ color: 'var(--ed-text-primary)' }}>MISE</span>
              {recipe.fingerprint ? ` · ${recipe.fingerprint}` : ''}
              {recipe.complexityMode ? ` · ${recipe.complexityMode}` : ''}
            </span>
            {recipe.intent?.occasion && (
              <span style={{
                fontSize: 'var(--ed-fs-micro)',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ed-text-muted)',
              }}>
                {recipe.intent.occasion}
              </span>
            )}
          </footer>
        </div>

        {/* ===== SIDE PANEL (right, sticky) ===== */}
        <aside className="ed-side-panel" style={{
          borderLeft: '1px solid var(--ed-border)',
          position: 'sticky',
          top: '61px',
          height: 'calc(100vh - 61px)',
          overflowY: 'auto',
        }}>

          {/* The Dial */}
          <div style={panelSectionStyle}>
            <h3 style={sectionLabelStyle}>The Dial</h3>
            {versions.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="dial-version" style={{ display: 'block', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', marginBottom: '4px' }}>
                  Dial from version:
                </label>
                <select id="dial-version" value={selectedVersionId ?? ''} onChange={(e) => setSelectedVersionId(e.target.value || null)}
                  style={{ ...inputStyle, cursor: 'pointer', fontSize: 'var(--ed-fs-small)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ed-text-primary)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ed-border)'; }}>
                  <option value="">Current (latest)</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber}{v.dialDirection ? ` — ${v.dialDirection.replace(/_/g, ' ')}` : ' — original'}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {DIAL_DIRECTIONS.map((d) => (
                <button key={d.value} type="button" onClick={() => handleDial(d.value)} disabled={dialling}
                  style={{ ...dialBtnStyle, opacity: dialling ? 0.4 : 1 }}
                  onMouseEnter={(e) => { if (!dialling) { e.currentTarget.style.borderColor = 'var(--ed-text-primary)'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ed-border)'; }}>
                  {d.label}
                </button>
              ))}
            </div>
            {/* Riff Mode — full width */}
            <button type="button" onClick={() => handleDial('riff_mode')} disabled={dialling}
              style={{
                ...dialBtnStyle,
                width: '100%',
                marginTop: '8px',
                fontWeight: 600,
                borderColor: 'var(--ed-text-primary)',
                color: 'var(--ed-text-primary)',
                opacity: dialling ? 0.4 : 1,
              }}
              onMouseEnter={(e) => { if (!dialling) { e.currentTarget.style.opacity = '0.7'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = dialling ? '0.4' : '1'; }}>
              Riff Mode
            </button>
            {/* Custom prompt input */}
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--ed-border)', paddingTop: '12px' }}>
              <textarea
                value={customDialPrompt}
                onChange={(e) => setCustomDialPrompt(e.target.value)}
                placeholder="Describe how you want to modify this recipe…"
                rows={3}
                disabled={dialling}
                style={{
                  width: '100%',
                  background: 'none',
                  border: '1px solid var(--ed-border)',
                  padding: '8px 10px',
                  fontSize: '11px',
                  fontFamily: 'var(--ed-font)',
                  color: 'var(--ed-text-primary)',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.6,
                  transition: 'border-color 200ms',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ed-text-primary)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ed-border)'; }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && customDialPrompt.trim()) {
                    handleDial('custom_prompt', customDialPrompt.trim());
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleDial('custom_prompt', customDialPrompt.trim())}
                disabled={dialling || !customDialPrompt.trim()}
                style={{
                  ...dialBtnStyle,
                  width: '100%',
                  marginTop: '6px',
                  fontWeight: 600,
                  borderColor: customDialPrompt.trim() ? 'var(--ed-text-primary)' : 'var(--ed-border)',
                  color: customDialPrompt.trim() ? 'var(--ed-text-primary)' : 'var(--ed-text-muted)',
                  opacity: dialling || !customDialPrompt.trim() ? 0.4 : 1,
                }}
                onMouseEnter={(e) => { if (!dialling && customDialPrompt.trim()) e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = (dialling || !customDialPrompt.trim()) ? '0.4' : '1'; }}
              >
                Evolve Recipe
              </button>
              <p style={{ fontSize: '10px', color: 'var(--ed-text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                ⌘+Enter to submit
              </p>
            </div>
            {dialling && <p style={{ marginTop: '8px', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-secondary)' }}>Evolving recipe…</p>}
            {dialError && <p style={{ marginTop: '8px', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-primary)' }}>{dialError}</p>}
          </div>

          {/* Ingredient Substitutions */}
          <div style={panelSectionStyle}>
            <h3 style={sectionLabelStyle}>Substitutions</h3>
            {recipe.components.map((comp: Recipe['components'][0]) => (
              <div key={comp.name} style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: 'var(--ed-fs-small)', fontWeight: 600, color: 'var(--ed-text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                  {comp.name}
                </h4>
                <div>
                  {comp.ingredients.map((ing: Recipe['components'][0]['ingredients'][0]) => {
                    const isUnavailable = unavailableIngredients.has(ing.name);
                    const subs = substitutionResults[ing.name];
                    const isLoading = substitutionLoading === ing.name;
                    return (
                      <div key={ing.name} style={{ marginBottom: '4px' }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: 'var(--ed-fs-small)',
                          color: isUnavailable ? 'var(--ed-text-muted)' : 'var(--ed-text-primary)',
                          cursor: 'pointer',
                          textDecoration: isUnavailable ? 'line-through' : 'none',
                        }}>
                          <input
                            type="checkbox"
                            checked={isUnavailable}
                            onChange={() => handleToggleUnavailable(ing.name, ing)}
                            style={{
                              width: '16px',
                              height: '16px',
                              border: '1px solid var(--ed-border)',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              accentColor: 'var(--ed-text-primary)',
                            }}
                          />
                          {ing.name}
                        </label>
                        {isLoading && (
                          <div style={{ marginLeft: '24px', marginTop: '2px', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-secondary)' }}>
                            Finding alternatives…
                          </div>
                        )}
                        {isUnavailable && subs && subs.length > 0 && (
                          <div style={{ marginLeft: '24px', marginTop: '2px' }}>
                            {subs.map((sub, i) => (
                              <div key={i} style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-secondary)', padding: '1px 0' }}>
                                ↳ {sub.amount} {sub.unit} {sub.name}
                                {sub.notes && <span style={{ color: 'var(--ed-text-muted)' }}> — {sub.notes}</span>}
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

          {/* Tags */}
          <div style={panelSectionStyle}>
            <h3 style={sectionLabelStyle}>Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {tags.map((tag) => (
                <span key={tag} style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}
                    style={{ ...textBtnStyle, fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                    aria-label={`Remove tag ${tag}`}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} placeholder="Add a tag…"
                style={{ ...inputStyle, fontSize: 'var(--ed-fs-small)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ed-text-primary)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ed-border)'; }} />
              <button type="button" onClick={handleAddTag} style={{ ...textBtnStyle, fontSize: 'var(--ed-fs-small)' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}>Add</button>
            </div>
          </div>

          {/* Version History */}
          <div style={panelSectionStyle}>
            <h3 style={sectionLabelStyle}>Version History</h3>
            {loadingVersion && (
              <p style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-secondary)', marginBottom: '8px' }}>Loading version…</p>
            )}
            {/* Current (base) version — always shown */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid var(--ed-border)',
              fontSize: 'var(--ed-fs-small)',
              background: !viewingVersionId ? 'var(--ed-bg-warm)' : 'transparent',
              marginLeft: !viewingVersionId ? '-24px' : 0,
              marginRight: !viewingVersionId ? '-24px' : 0,
              paddingLeft: !viewingVersionId ? '24px' : 0,
              paddingRight: !viewingVersionId ? '24px' : 0,
            }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--ed-text-primary)' }}>Current</span>
                <div style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', marginTop: '1px' }}>
                  Latest saved version
                </div>
              </div>
              {viewingVersionId && (
                <button
                  type="button"
                  onClick={() => handleViewVersion(null)}
                  disabled={loadingVersion}
                  style={{
                    ...textBtnStyle,
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--ed-accent)',
                    opacity: loadingVersion ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { if (!loadingVersion) e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = loadingVersion ? '0.4' : '1'; }}
                >
                  View
                </button>
              )}
              {!viewingVersionId && (
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ed-accent)' }}>
                  Viewing
                </span>
              )}
            </div>
            {versions.length === 0 ? (
              <p style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', margin: '8px 0 0' }}>No dial versions yet.</p>
            ) : (
              <div>
                {versions.map((v) => {
                  const isViewing = viewingVersionId === v.id;
                  return (
                    <div key={v.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--ed-border)',
                      fontSize: 'var(--ed-fs-small)',
                      background: isViewing ? 'var(--ed-bg-warm)' : 'transparent',
                      marginLeft: isViewing ? '-24px' : 0,
                      marginRight: isViewing ? '-24px' : 0,
                      paddingLeft: isViewing ? '24px' : 0,
                      paddingRight: isViewing ? '24px' : 0,
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--ed-text-primary)' }}>v{v.versionNumber}</span>
                        {v.dialDirection && (
                          <span style={{ marginLeft: '6px', color: isViewing ? 'var(--ed-accent)' : 'var(--ed-text-secondary)' }}>
                            {v.dialDirection.replace(/_/g, ' ')}
                          </span>
                        )}
                        <div style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', marginTop: '1px' }}>
                          {new Date(v.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewVersion(isViewing ? null : v.id)}
                        disabled={loadingVersion}
                        style={{
                          ...textBtnStyle,
                          fontSize: '10px',
                          fontWeight: 600,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: isViewing ? 'var(--ed-accent)' : 'var(--ed-text-muted)',
                          opacity: loadingVersion ? 0.4 : 1,
                        }}
                        onMouseEnter={(e) => { if (!loadingVersion) e.currentTarget.style.opacity = '0.7'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = loadingVersion ? '0.4' : '1'; }}
                      >
                        {isViewing ? 'Viewing' : 'View'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {versions.some((v) => v.dialDirection) && (
              <div style={{ marginTop: '12px' }}>
                <h4 style={{ ...sectionLabelStyle, fontSize: 'var(--ed-fs-micro)', marginBottom: '8px' }}>Dial History</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {versions.filter((v) => v.dialDirection).map((v) => (
                    <span key={v.id} style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-secondary)' }}>
                      v{v.versionNumber}: {v.dialDirection?.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dev Notes */}
          <div style={panelSectionStyle}>
            <h3 style={sectionLabelStyle}>Dev Notes</h3>
            <textarea value={devNotes} onChange={(e) => setDevNotes(e.target.value)}
              placeholder="What worked, what to try next…" rows={3}
              style={{ ...inputStyle, borderBottom: '1px solid var(--ed-border)', resize: 'vertical', lineHeight: 1.6, fontSize: 'var(--ed-fs-small)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ed-text-primary)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ed-border)'; }} />
            <button type="button" onClick={handleSaveDevNotes} disabled={saving}
              style={{ ...textBtnStyle, marginTop: '8px', fontSize: 'var(--ed-fs-small)', opacity: saving ? 0.4 : 0.8 }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { if (!saving) e.currentTarget.style.opacity = '0.8'; }}>
              {saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>

          {/* Export */}
          <div style={panelSectionStyle}>
            <h3 style={sectionLabelStyle}>Export</h3>
            <button type="button" onClick={() => setShowExportPanel(!showExportPanel)}
              style={{
                width: '100%',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                padding: '9px 8px',
                border: '1px solid var(--ed-text-primary)',
                background: 'transparent',
                color: 'var(--ed-text-primary)',
                cursor: 'pointer',
                fontFamily: 'var(--ed-font)',
                textTransform: 'uppercase',
                transition: 'opacity 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
              {showExportPanel ? 'Hide Export Options' : 'Export Recipe'}
            </button>
            <div style={{ display: 'grid', gridTemplateRows: showExportPanel ? '1fr' : '0fr', transition: 'grid-template-rows 200ms ease-out' }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ paddingTop: '16px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="export-format" style={{ display: 'block', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', marginBottom: '4px' }}>Format</label>
                    <select id="export-format" value={exportFormat} onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'markdown')}
                      style={{ ...inputStyle, cursor: 'pointer', fontSize: 'var(--ed-fs-small)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ed-text-primary)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ed-border)'; }}>
                      <option value="pdf">PDF (HTML)</option>
                      <option value="markdown">Markdown</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="branding-name" style={{ display: 'block', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', marginBottom: '4px' }}>Your Name</label>
                    <input id="branding-name" type="text" value={exportBrandingName} onChange={(e) => setExportBrandingName(e.target.value)}
                      placeholder="Your name" style={{ ...inputStyle, fontSize: 'var(--ed-fs-small)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ed-text-primary)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ed-border)'; }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="branding-business" style={{ display: 'block', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', marginBottom: '4px' }}>Business Name (optional)</label>
                    <input id="branding-business" type="text" value={exportBrandingBusiness} onChange={(e) => setExportBrandingBusiness(e.target.value)}
                      placeholder="Business name" style={{ ...inputStyle, fontSize: 'var(--ed-fs-small)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ed-text-primary)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ed-border)'; }} />
                  </div>
                  <button type="button" onClick={handleExport}
                    style={{
                      width: '100%',
                      fontSize: '11px',
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      padding: '9px 8px',
                      border: '1px solid var(--ed-border)',
                      background: 'transparent',
                      color: 'var(--ed-text-secondary)',
                      cursor: 'pointer',
                      fontFamily: 'var(--ed-font)',
                      textTransform: 'uppercase',
                      transition: 'border-color 200ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ed-text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ed-border)'; }}>
                    Download {exportFormat === 'pdf' ? 'HTML' : 'Markdown'}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .ed-app-layout { grid-template-columns: 1fr !important; }
          .ed-side-panel { position: static !important; height: auto !important; border-left: none !important; border-top: 2px solid var(--ed-text-primary) !important; }
          .ed-main-content { padding: 0 24px 60px !important; }
          .ed-topbar { padding: 16px 24px !important; }
          .ed-intro { grid-template-columns: 1fr !important; }
          .ed-intro > div:first-child { border-right: none !important; border-bottom: 1px solid var(--ed-border); padding: 28px 0 !important; }
          .ed-intro > div:last-child { padding: 28px 0 !important; }
        }
      `}</style>
    </div>
  );
}
