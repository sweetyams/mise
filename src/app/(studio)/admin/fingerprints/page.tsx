'use client';

// =============================================================================
// MISE Admin — Chef Profile Management
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChefProfile } from '@/lib/types/fingerprint-profile';
import { parseChefCSV, exportChefCSV } from '@/lib/csv-chef-parser';

interface Fingerprint {
  id: string;
  name: string;
  slug: string | null;
  prompt_text: string;
  full_profile: ChefProfile | null;
  version: number;
  is_default: boolean;
  updated_at: string;
}

type ProfileTab = 'overview' | 'identity' | 'techniques' | 'ingredients' | 'exemplars' | 'voice' | 'negatives' | 'seasonal';

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'identity', label: 'Identity Core' },
  { key: 'negatives', label: 'Negatives' },
  { key: 'techniques', label: 'Techniques' },
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'exemplars', label: 'Dish Exemplars' },
  { key: 'voice', label: 'Voice' },
  { key: 'seasonal', label: 'Seasonal' },
];

const EMPTY_PROFILE: ChefProfile = {
  identity_core: { philosophy: '', personality: '', signature_moves: '' },
  negative_constraints: { avoid: [] },
  techniques: [],
  ingredient_lexicon: [],
  dish_exemplars: [],
  voice: { writing_style: '', tone: '', vocabulary: '', formatting: '' },
  seasonal_filters: [],
};

const DEFAULT_CHEFS = [
  { name: 'Matty Matheson', slug: 'matty-matheson', prompt_text: 'You are channelling Matty Matheson — big-hearted, loud, generous comfort food.', is_default: true },
  { name: 'Brad Leone', slug: 'brad-leone', prompt_text: 'You are channelling Brad Leone — fermentation-obsessed, outdoorsy, improvisational.', is_default: true },
  { name: 'Ottolenghi', slug: 'ottolenghi', prompt_text: 'You are channelling Yotam Ottolenghi — vibrant Middle Eastern and Mediterranean flavours.', is_default: true },
  { name: 'Samin Nosrat', slug: 'samin-nosrat', prompt_text: 'You are channelling Samin Nosrat — Salt, Fat, Acid, Heat as guiding principles.', is_default: true },
  { name: 'Claire Saffitz', slug: 'claire-saffitz', prompt_text: 'You are channelling Claire Saffitz — meticulous pastry technique meets approachable home baking.', is_default: true },
];

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------
const inputCls = 'rounded-md border border-gray-300 px-3 py-2 text-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 w-full';
const textareaCls = `${inputCls} font-mono`;
const btnPrimary = 'rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50';
const btnSecondary = 'rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800';
const btnDanger = 'rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950';

export default function ChefProfilesPage() {
  const [fps, setFps] = useState<Fingerprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Selected chef for editing
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>('overview');

  // Edit state
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editProfile, setEditProfile] = useState<ChefProfile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  const selected = fps.find((f) => f.id === selectedId) ?? null;

  // ---- Load ----
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fingerprints');
      if (!res.ok) { setError('Failed to load.'); return; }
      const data = await res.json();
      setFps(data.fingerprints ?? []);
    } catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- Select chef ----
  const selectChef = useCallback((fp: Fingerprint) => {
    setSelectedId(fp.id);
    setEditName(fp.name);
    setEditSlug(fp.slug ?? '');
    setEditPrompt(fp.prompt_text);
    setEditProfile(fp.full_profile ? { ...EMPTY_PROFILE, ...fp.full_profile } : EMPTY_PROFILE);
    setTab('overview');
    setMessage(null);
  }, []);

  // ---- Seed ----
  const handleSeed = useCallback(async () => {
    setSeeding(true); setError(null); setMessage(null);
    let failed = 0;
    for (const chef of DEFAULT_CHEFS) {
      const res = await fetch('/api/admin/fingerprints', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chef),
      });
      if (!res.ok) failed++;
    }
    if (failed) setError(`${failed} failed.`);
    else setMessage(`Seeded ${DEFAULT_CHEFS.length} chefs.`);
    await load();
    setSeeding(false);
  }, [load]);

  // ---- Create ----
  const handleCreate = useCallback(async () => {
    if (!newName.trim() || !newSlug.trim() || !newPrompt.trim()) return;
    setCreating(true); setError(null);
    const res = await fetch('/api/admin/fingerprints', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim(), prompt_text: newPrompt.trim() }),
    });
    if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error ?? 'Failed.'); }
    else { setMessage(`Created "${newName.trim()}".`); setNewName(''); setNewSlug(''); setNewPrompt(''); setShowCreate(false); await load(); }
    setCreating(false);
  }, [newName, newSlug, newPrompt, load]);

  // ---- Save ----
  const handleSave = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true); setError(null); setMessage(null);
    const res = await fetch('/api/admin/fingerprints', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedId, name: editName.trim(), slug: editSlug.trim(), prompt_text: editPrompt, full_profile: editProfile }),
    });
    if (!res.ok) { setError('Failed to save.'); }
    else { setMessage('Saved.'); await load(); }
    setSaving(false);
  }, [selectedId, editName, editSlug, editPrompt, editProfile, load]);

  // ---- Delete ----
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this chef profile?')) return;
    setError(null);
    const res = await fetch(`/api/admin/fingerprints?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { setError('Failed to delete.'); return; }
    if (selectedId === id) setSelectedId(null);
    setMessage('Deleted.');
    await load();
  }, [selectedId, load]);

  // ---- CSV Import ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleImportCSV = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setError(null); setMessage(null);
    try {
      const text = await file.text();
      const parsed = parseChefCSV(text);
      if (!parsed.name) { setError('CSV missing chef name in meta section.'); setImporting(false); return; }
      const slug = parsed.slug || parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const res = await fetch('/api/admin/fingerprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: parsed.name, slug, prompt_text: parsed.prompt_text || parsed.name }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error ?? 'Failed to create from CSV.'); setImporting(false); return; }
      const { id } = await res.json();
      // Now save the full_profile
      await fetch('/api/admin/fingerprints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, full_profile: parsed.full_profile }),
      });
      setMessage(`Imported "${parsed.name}" from CSV.`);
      await load();
    } catch { setError('Failed to parse CSV.'); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }, [load]);

  // ---- CSV Export ----
  const handleExportCSV = useCallback(() => {
    if (!selected) return;
    const profile = selected.full_profile ?? EMPTY_PROFILE;
    const csv = exportChefCSV(selected.name, selected.slug ?? '', selected.prompt_text, profile);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${selected.slug ?? selected.name.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
  }, [selected]);

  // ---- Profile updaters ----
  const updateProfile = (patch: Partial<ChefProfile>) => setEditProfile((p) => ({ ...p, ...patch }));

  // ---- Render ----
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">Chef Profiles</h1>
        <p className="mb-6 text-sm text-gray-500">Manage chef personas and their layered prompt profiles.</p>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error} <button type="button" onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            {message}
          </div>
        )}

        <div className="flex gap-6">
          {/* Left sidebar — chef list */}
          <div className="w-56 shrink-0">
            <div className="mb-3 flex gap-2">
              <button type="button" onClick={() => setShowCreate(!showCreate)} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
                {showCreate ? 'Cancel' : '+ New'}
              </button>
              {fps.length === 0 && !loading && (
                <button type="button" onClick={handleSeed} disabled={seeding} className={btnSecondary}>
                  {seeding ? 'Seeding…' : 'Seed Defaults'}
                </button>
              )}
            </div>
            <div className="mb-3">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing} className={`${btnSecondary} w-full`}>
                {importing ? 'Importing…' : '↑ Import CSV'}
              </button>
              <a href="/chef-profile-template.csv" download className={`${btnSecondary} mt-1 block w-full text-center`}>
                ↓ Template CSV
              </a>
            </div>

            {showCreate && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <input value={newName} onChange={(e) => { setNewName(e.target.value); setNewSlug(slugify(e.target.value)); }} placeholder="Name" className={`${inputCls} mb-2`} />
                <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="slug" className={`${inputCls} mb-2`} />
                <textarea value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} rows={3} placeholder="Prompt text…" className={`${textareaCls} mb-2`} />
                <button type="button" onClick={handleCreate} disabled={creating || !newName.trim() || !newSlug.trim() || !newPrompt.trim()} className={btnPrimary}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
            ) : fps.length === 0 ? (
              <p className="text-xs text-gray-500">No chefs yet.</p>
            ) : (
              <div className="space-y-1">
                {fps.map((fp) => (
                  <button
                    key={fp.id}
                    type="button"
                    onClick={() => selectChef(fp)}
                    className={`w-full rounded-md px-3 py-2 text-left text-xs transition-colors ${
                      selectedId === fp.id ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-medium">{fp.name}</div>
                    <div className={`text-[10px] ${selectedId === fp.id ? 'text-gray-300' : 'text-gray-400'}`}>
                      {fp.slug ?? 'no slug'} · v{fp.version}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel — editor */}
          <div className="min-w-0 flex-1">
            {!selected ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
                <p className="text-sm text-gray-500">Select a chef to edit, or create a new one.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                {/* Tab bar */}
                <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4 pt-3 dark:border-gray-700">
                  {TABS.map((t) => (
                    <button key={t.key} type="button" onClick={() => setTab(t.key)}
                      className={`whitespace-nowrap rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        tab === t.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* Overview tab */}
                  {tab === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Slug</label>
                          <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Flat Prompt (fallback when no profile layers)</label>
                        <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={4} className={textareaCls} />
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save All Changes'}</button>
                        <button type="button" onClick={handleExportCSV} className={btnSecondary}>↓ Export CSV</button>
                        <button type="button" onClick={() => handleDelete(selected.id)} className={btnDanger}>Delete Chef</button>
                      </div>
                    </div>
                  )}

                  {/* Identity Core tab */}
                  {tab === 'identity' && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">~200 tokens. Always loads. The chef&apos;s fundamental philosophy and personality.</p>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Philosophy</label>
                        <textarea value={editProfile.identity_core.philosophy} onChange={(e) => updateProfile({ identity_core: { ...editProfile.identity_core, philosophy: e.target.value } })} rows={3} className={textareaCls} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Personality</label>
                        <textarea value={editProfile.identity_core.personality} onChange={(e) => updateProfile({ identity_core: { ...editProfile.identity_core, personality: e.target.value } })} rows={3} className={textareaCls} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Signature Moves</label>
                        <textarea value={editProfile.identity_core.signature_moves} onChange={(e) => updateProfile({ identity_core: { ...editProfile.identity_core, signature_moves: e.target.value } })} rows={3} className={textareaCls} />
                      </div>
                      <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                  )}

                  {/* Negatives tab */}
                  {tab === 'negatives' && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">~100 tokens. Always loads with core. Specific failure modes to avoid.</p>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Avoid (one per line)</label>
                        <textarea
                          value={editProfile.negative_constraints.avoid.join('\n')}
                          onChange={(e) => updateProfile({ negative_constraints: { avoid: e.target.value.split('\n').filter(Boolean) } })}
                          rows={10} className={textareaCls}
                          placeholder={'"Season to taste" without specifying what balance to taste for\nSingle herb used as garnish only\n...'}
                        />
                      </div>
                      <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                  )}

                  {/* Techniques tab */}
                  {tab === 'techniques' && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">~200 tokens each. 2 most relevant load per generation.</p>
                      {editProfile.techniques.map((t, i) => (
                        <div key={i} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                          <div className="mb-2 flex items-center justify-between">
                            <input value={t.name} onChange={(e) => { const arr = [...editProfile.techniques]; arr[i] = { ...t, name: e.target.value }; updateProfile({ techniques: arr }); }} placeholder="Technique name (e.g. roasting)" className={`${inputCls} max-w-xs`} />
                            <button type="button" onClick={() => updateProfile({ techniques: editProfile.techniques.filter((_, j) => j !== i) })} className={btnDanger}>Remove</button>
                          </div>
                          <textarea value={t.approach} onChange={(e) => { const arr = [...editProfile.techniques]; arr[i] = { ...t, approach: e.target.value }; updateProfile({ techniques: arr }); }} rows={2} placeholder="Approach…" className={`${textareaCls} mb-2`} />
                          <textarea value={t.signature_details} onChange={(e) => { const arr = [...editProfile.techniques]; arr[i] = { ...t, signature_details: e.target.value }; updateProfile({ techniques: arr }); }} rows={2} placeholder="Signature details…" className={textareaCls} />
                        </div>
                      ))}
                      <button type="button" onClick={() => updateProfile({ techniques: [...editProfile.techniques, { name: '', approach: '', signature_details: '' }] })} className={btnSecondary}>+ Add Technique</button>
                      <div><button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button></div>
                    </div>
                  )}

                  {/* Ingredients tab */}
                  {tab === 'ingredients' && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">~120 tokens each. 3 most relevant load per generation.</p>
                      {editProfile.ingredient_lexicon.map((ing, i) => (
                        <div key={i} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                          <div className="mb-2 flex items-center justify-between">
                            <input value={ing.category} onChange={(e) => { const arr = [...editProfile.ingredient_lexicon]; arr[i] = { ...ing, category: e.target.value }; updateProfile({ ingredient_lexicon: arr }); }} placeholder="Category (e.g. tahini, lamb)" className={`${inputCls} max-w-xs`} />
                            <button type="button" onClick={() => updateProfile({ ingredient_lexicon: editProfile.ingredient_lexicon.filter((_, j) => j !== i) })} className={btnDanger}>Remove</button>
                          </div>
                          <textarea value={ing.perspective} onChange={(e) => { const arr = [...editProfile.ingredient_lexicon]; arr[i] = { ...ing, perspective: e.target.value }; updateProfile({ ingredient_lexicon: arr }); }} rows={2} placeholder="How this chef uses this ingredient…" className={`${textareaCls} mb-2`} />
                          <div className="grid grid-cols-2 gap-2">
                            <input value={ing.pairings} onChange={(e) => { const arr = [...editProfile.ingredient_lexicon]; arr[i] = { ...ing, pairings: e.target.value }; updateProfile({ ingredient_lexicon: arr }); }} placeholder="Pairings" className={inputCls} />
                            <input value={ing.rules} onChange={(e) => { const arr = [...editProfile.ingredient_lexicon]; arr[i] = { ...ing, rules: e.target.value }; updateProfile({ ingredient_lexicon: arr }); }} placeholder="Rules" className={inputCls} />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => updateProfile({ ingredient_lexicon: [...editProfile.ingredient_lexicon, { category: '', perspective: '', pairings: '', rules: '' }] })} className={btnSecondary}>+ Add Ingredient</button>
                      <div><button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button></div>
                    </div>
                  )}

                  {/* Dish Exemplars tab */}
                  {tab === 'exemplars' && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">~50 tokens each. 3 most relevant load as few-shot grounding examples. The single biggest quality improvement.</p>
                      {editProfile.dish_exemplars.map((ex, i) => (
                        <div key={i} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                          <div className="mb-2 flex items-center justify-between">
                            <input value={ex.dish} onChange={(e) => { const arr = [...editProfile.dish_exemplars]; arr[i] = { ...ex, dish: e.target.value }; updateProfile({ dish_exemplars: arr }); }} placeholder="Dish name" className={`${inputCls} max-w-md`} />
                            <button type="button" onClick={() => updateProfile({ dish_exemplars: editProfile.dish_exemplars.filter((_, j) => j !== i) })} className={btnDanger}>Remove</button>
                          </div>
                          <div className="mb-2 grid grid-cols-2 gap-2">
                            {['acid', 'fat', 'texture', 'surprise', 'spice', 'herb'].map((key) => (
                              <input key={key} value={(ex.key_decisions as Record<string, string>)[key] ?? ''} onChange={(e) => {
                                const arr = [...editProfile.dish_exemplars];
                                arr[i] = { ...ex, key_decisions: { ...ex.key_decisions, [key]: e.target.value } };
                                updateProfile({ dish_exemplars: arr });
                              }} placeholder={key} className={inputCls} />
                            ))}
                          </div>
                          <input value={ex.the_move} onChange={(e) => { const arr = [...editProfile.dish_exemplars]; arr[i] = { ...ex, the_move: e.target.value }; updateProfile({ dish_exemplars: arr }); }} placeholder="The move — the single insight that makes this dish work" className={inputCls} />
                        </div>
                      ))}
                      <button type="button" onClick={() => updateProfile({ dish_exemplars: [...editProfile.dish_exemplars, { dish: '', key_decisions: {}, the_move: '' }] })} className={btnSecondary}>+ Add Exemplar</button>
                      <div><button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button></div>
                    </div>
                  )}

                  {/* Voice tab */}
                  {tab === 'voice' && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">~400 tokens. Loads when output needs distinctive writing style.</p>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Writing Style</label>
                        <textarea value={editProfile.voice.writing_style} onChange={(e) => updateProfile({ voice: { ...editProfile.voice, writing_style: e.target.value } })} rows={3} className={textareaCls} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Tone</label>
                        <textarea value={editProfile.voice.tone} onChange={(e) => updateProfile({ voice: { ...editProfile.voice, tone: e.target.value } })} rows={2} className={textareaCls} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Vocabulary</label>
                        <textarea value={editProfile.voice.vocabulary} onChange={(e) => updateProfile({ voice: { ...editProfile.voice, vocabulary: e.target.value } })} rows={2} className={textareaCls} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Formatting</label>
                        <textarea value={editProfile.voice.formatting} onChange={(e) => updateProfile({ voice: { ...editProfile.voice, formatting: e.target.value } })} rows={2} className={textareaCls} />
                      </div>
                      <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                  )}

                  {/* Seasonal tab */}
                  {tab === 'seasonal' && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">~50 tokens each. Adjusts ingredient suggestions by season and region without changing the chef&apos;s character.</p>
                      {editProfile.seasonal_filters.map((sf, i) => (
                        <div key={i} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                          <div className="mb-2 flex items-center gap-2">
                            <input value={sf.season} onChange={(e) => { const arr = [...editProfile.seasonal_filters]; arr[i] = { ...sf, season: e.target.value }; updateProfile({ seasonal_filters: arr }); }} placeholder="Season" className={`${inputCls} max-w-[120px]`} />
                            <input value={sf.region} onChange={(e) => { const arr = [...editProfile.seasonal_filters]; arr[i] = { ...sf, region: e.target.value }; updateProfile({ seasonal_filters: arr }); }} placeholder="Region" className={`${inputCls} max-w-[120px]`} />
                            <button type="button" onClick={() => updateProfile({ seasonal_filters: editProfile.seasonal_filters.filter((_, j) => j !== i) })} className={btnDanger}>Remove</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-[10px] text-gray-400">Swap in (comma-separated)</label>
                              <input value={sf.adjust.swap_in.join(', ')} onChange={(e) => { const arr = [...editProfile.seasonal_filters]; arr[i] = { ...sf, adjust: { ...sf.adjust, swap_in: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } }; updateProfile({ seasonal_filters: arr }); }} className={inputCls} />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] text-gray-400">Swap out (comma-separated)</label>
                              <input value={sf.adjust.swap_out.join(', ')} onChange={(e) => { const arr = [...editProfile.seasonal_filters]; arr[i] = { ...sf, adjust: { ...sf.adjust, swap_out: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } }; updateProfile({ seasonal_filters: arr }); }} className={inputCls} />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => updateProfile({ seasonal_filters: [...editProfile.seasonal_filters, { season: '', region: '', adjust: { swap_in: [], swap_out: [], preserve_fingerprint: true } }] })} className={btnSecondary}>+ Add Seasonal Filter</button>
                      <div><button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
