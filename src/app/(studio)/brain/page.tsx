'use client';

// =============================================================================
// MISE Chef Brain — Page with Visual Dashboard
// =============================================================================
// Displays visual dashboard (charts, top ingredients, activity timeline) above
// the existing collapsible brain prompt text sections. Uses editorial design
// system (--ed-* CSS custom properties, inline styles).
// Requirements: 4.1–4.8
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { getBrainStats, getBrainSnapshots } from './actions';
import type { BrainSnapshot } from './actions';
import type { BrainStats } from '@/lib/recipe-utils';
import { computeBrainDiff, type DiffLine } from '@/lib/recipe-utils';

interface BrainData {
  promptText: string;
  version: number;
  compiledAt: string;
}

// ---------------------------------------------------------------------------
// SVG Bar Chart — horizontal bars for distribution data
// ---------------------------------------------------------------------------

function BarChart({ data, label }: { data: Record<string, number>; label: string }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div>
        <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 12 }}>
          {label}
        </div>
        <div style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)' }}>No data yet</div>
      </div>
    );
  }

  const maxCount = Math.max(...entries.map(([, v]) => v));
  const barHeight = 20;
  const labelWidth = 120;
  const chartWidth = 300;
  const gap = 6;
  const svgHeight = entries.length * (barHeight + gap);

  return (
    <div>
      <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 12 }}>
        {label}
      </div>
      <svg width="100%" viewBox={`0 0 ${labelWidth + chartWidth + 40} ${svgHeight}`} style={{ overflow: 'visible' }}>
        {entries.map(([name, count], i) => {
          const y = i * (barHeight + gap);
          const barWidth = maxCount > 0 ? (count / maxCount) * chartWidth : 0;
          return (
            <g key={name}>
              <text
                x={labelWidth - 8}
                y={y + barHeight / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                style={{ fontSize: 11, fill: 'var(--ed-text-muted)', fontFamily: 'var(--ed-font)' }}
              >
                {name}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={barWidth}
                height={barHeight}
                style={{ fill: 'var(--ed-text-primary)', opacity: 0.15 }}
              />
              <text
                x={labelWidth + barWidth + 6}
                y={y + barHeight / 2 + 1}
                dominantBaseline="middle"
                style={{ fontSize: 11, fill: 'var(--ed-text-secondary)', fontFamily: 'var(--ed-font)' }}
              >
                {count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Top Ingredients — numbered list with frequency counts
// ---------------------------------------------------------------------------

function TopIngredients({ ingredients }: { ingredients: Array<{ name: string; count: number }> }) {
  if (ingredients.length === 0) {
    return (
      <div>
        <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 12 }}>
          Top Ingredients
        </div>
        <div style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)' }}>No data yet</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 12 }}>
        Top Ingredients
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {ingredients.map((item, i) => (
          <li
            key={item.name}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              padding: '4px 0',
              borderBottom: i < ingredients.length - 1 ? '1px solid var(--ed-border)' : 'none',
              fontSize: 'var(--ed-fs-body)',
              fontFamily: 'var(--ed-font)',
            }}
          >
            <span style={{ color: 'var(--ed-text-muted)', fontSize: 'var(--ed-fs-small)', minWidth: 20, textAlign: 'right' }}>
              {i + 1}.
            </span>
            <span style={{ color: 'var(--ed-text-primary)', flex: 1 }}>{item.name}</span>
            <span style={{ color: 'var(--ed-text-muted)', fontSize: 'var(--ed-fs-small)' }}>
              {item.count}×
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Timeline — vertical bar chart showing recipe counts per month
// ---------------------------------------------------------------------------

function ActivityTimeline({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) {
    return (
      <div>
        <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 12 }}>
          Activity Timeline
        </div>
        <div style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)' }}>No data yet</div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));
  const barWidth = 32;
  const gap = 8;
  const chartHeight = 100;
  const svgWidth = data.length * (barWidth + gap);
  const labelHeight = 20;

  const formatMonth = (dateStr: string) => {
    const [, month] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(month, 10) - 1] ?? month;
  };

  return (
    <div>
      <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 12 }}>
        Activity Timeline
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={svgWidth} height={chartHeight + labelHeight + 16} style={{ overflow: 'visible' }}>
          {data.map((entry, i) => {
            const x = i * (barWidth + gap);
            const barH = maxCount > 0 ? (entry.count / maxCount) * chartHeight : 0;
            const y = chartHeight - barH;
            return (
              <g key={entry.date}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  style={{ fill: 'var(--ed-text-primary)', opacity: 0.15 }}
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  style={{ fontSize: 10, fill: 'var(--ed-text-secondary)', fontFamily: 'var(--ed-font)' }}
                >
                  {entry.count}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 14}
                  textAnchor="middle"
                  style={{ fontSize: 10, fill: 'var(--ed-text-muted)', fontFamily: 'var(--ed-font)' }}
                >
                  {formatMonth(entry.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Main Brain Page
// ---------------------------------------------------------------------------

export default function BrainPage() {
  const [brain, setBrain] = useState<BrainData | null>(null);
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [snapshots, setSnapshots] = useState<BrainSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<BrainSnapshot | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recompiling, setRecompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  // -------------------------------------------------------------------------
  // Load brain data + stats
  // -------------------------------------------------------------------------

  const loadBrain = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [brainRes, statsResult, snapshotsResult] = await Promise.all([
        fetch('/api/brain'),
        getBrainStats(),
        getBrainSnapshots(),
      ]);

      if (!brainRes.ok) {
        setError('Failed to load Chef Brain data.');
        setLoading(false);
        return;
      }

      const brainData = await brainRes.json();
      setBrain(brainData);

      if (statsResult.success) {
        setStats(statsResult.data);
      }

      if (snapshotsResult.success) {
        setSnapshots(snapshotsResult.data);
      }
    } catch {
      setError('Failed to load Chef Brain data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrain();
  }, [loadBrain]);

  // -------------------------------------------------------------------------
  // Recompile
  // -------------------------------------------------------------------------

  const handleRecompile = useCallback(async () => {
    setRecompiling(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/brain', { method: 'POST' });
      if (!res.ok) {
        setError('Recompilation failed. Please try again.');
        setRecompiling(false);
        return;
      }
      const data = await res.json();
      setBrain(data);
      setMessage('Chef Brain recompiled successfully.');
      setSelectedSnapshot(null);
      setShowDiff(false);

      // Refresh stats and snapshots after recompile
      const [statsResult, snapshotsResult] = await Promise.all([
        getBrainStats(),
        getBrainSnapshots(),
      ]);
      if (statsResult.success) {
        setStats(statsResult.data);
      }
      if (snapshotsResult.success) {
        setSnapshots(snapshotsResult.data);
      }
    } catch {
      setError('Recompilation failed. Please try again.');
    } finally {
      setRecompiling(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Toggle collapsible sections
  // -------------------------------------------------------------------------

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Determine display text (current or selected snapshot) and compute diff
  // -------------------------------------------------------------------------

  const displayText = selectedSnapshot ? selectedSnapshot.promptText : (brain?.promptText ?? '');
  const displaySections = parseBrainSections(displayText);

  // Compute diff between current brain and most recent previous snapshot
  const previousSnapshot = snapshots.length > 0 ? snapshots[0] : null;
  const diffLines: DiffLine[] = (showDiff && brain && previousSnapshot)
    ? computeBrainDiff(brain.promptText, previousSnapshot.promptText)
    : [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const showDashboard = stats && stats.totalRecipes >= 2;
  const showEncouragement = stats && stats.totalRecipes < 2;

  return (
    <div className="editorial" style={{ minHeight: '100vh', background: 'var(--ed-bg)' }}>
      <div style={{ maxWidth: 'var(--ed-content-width)', margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--ed-font-serif)', fontSize: 'var(--ed-fs-xl)', fontWeight: 400, color: 'var(--ed-text-primary)', margin: 0 }}>
              Chef Brain
            </h1>
            <p style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', marginTop: 4 }}>
              Your personalised cooking identity — compiled from your preferences, dev logs, and tasting notes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRecompile}
            disabled={recompiling}
            className="btn"
            style={{ opacity: recompiling ? 0.5 : 1, cursor: recompiling ? 'not-allowed' : 'pointer' }}
          >
            {recompiling ? 'Recompiling…' : 'Recompile'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: 12, border: '1px solid var(--ed-border)', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-accent)' }}>
            {error}
          </div>
        )}

        {/* Success message */}
        {message && (
          <div style={{ marginBottom: 16, padding: 12, border: '1px solid var(--ed-border)', fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-secondary)' }}>
            {message}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', fontFamily: 'var(--ed-font)', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
              Loading…
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Encouragement message for < 2 recipes */}
            {showEncouragement && (
              <div style={{ padding: 24, border: '1px solid var(--ed-border)', marginBottom: 32, textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--ed-font-serif)', fontSize: 'var(--ed-fs-lg)', color: 'var(--ed-text-primary)', margin: '0 0 8px' }}>
                  Your dashboard is waiting
                </p>
                <p style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-body)', color: 'var(--ed-text-muted)', margin: 0 }}>
                  Generate at least 2 recipes to see your cooking patterns, flavour preferences, and activity timeline.
                </p>
              </div>
            )}

            {/* Visual Dashboard */}
            {showDashboard && (
              <div style={{ marginBottom: 48 }}>
                <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 24, paddingBottom: 8, borderBottom: '1px solid var(--ed-border)' }}>
                  Dashboard · {stats.totalRecipes} recipes
                </div>

                {/* Distribution charts — 2-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
                  <BarChart data={stats.flavourDistribution} label="Flavour Distribution" />
                  <BarChart data={stats.occasionDistribution} label="Occasion Distribution" />
                  <BarChart data={stats.moodDistribution} label="Mood Distribution" />
                  <BarChart data={stats.complexityDistribution} label="Complexity Distribution" />
                </div>

                {/* Top Ingredients — full width */}
                <div style={{ marginBottom: 32 }}>
                  <TopIngredients ingredients={stats.topIngredients} />
                </div>

                {/* Activity Timeline — full width */}
                <div style={{ marginBottom: 32 }}>
                  <ActivityTimeline data={stats.activityTimeline} />
                </div>
              </div>
            )}

            {/* Brain metadata */}
            {brain && (
              <div style={{ display: 'flex', gap: 16, fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', fontFamily: 'var(--ed-font)', marginBottom: 24 }}>
                <span>Version {brain.version}</span>
                <span>·</span>
                <span>
                  Last compiled{' '}
                  {new Date(brain.compiledAt).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {/* Version History */}
            {snapshots.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--ed-border)' }}>
                  Version History
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {/* Current button */}
                  <button
                    type="button"
                    onClick={() => { setSelectedSnapshot(null); setShowDiff(false); }}
                    style={{
                      padding: '6px 12px',
                      background: !selectedSnapshot && !showDiff ? 'var(--ed-text-primary)' : 'none',
                      color: !selectedSnapshot && !showDiff ? 'var(--ed-bg)' : 'var(--ed-text-secondary)',
                      border: '1px solid var(--ed-border)',
                      cursor: 'pointer',
                      fontFamily: 'var(--ed-font)',
                      fontSize: 'var(--ed-fs-small)',
                      fontWeight: !selectedSnapshot && !showDiff ? 600 : 400,
                    }}
                  >
                    Current (v{brain?.version ?? 0})
                  </button>
                  {/* Compare button — only when there's at least one previous snapshot */}
                  {previousSnapshot && (
                    <button
                      type="button"
                      onClick={() => { setSelectedSnapshot(null); setShowDiff(!showDiff); }}
                      style={{
                        padding: '6px 12px',
                        background: showDiff ? 'var(--ed-text-primary)' : 'none',
                        color: showDiff ? 'var(--ed-bg)' : 'var(--ed-text-secondary)',
                        border: '1px solid var(--ed-border)',
                        cursor: 'pointer',
                        fontFamily: 'var(--ed-font)',
                        fontSize: 'var(--ed-fs-small)',
                        fontWeight: showDiff ? 600 : 400,
                      }}
                    >
                      Compare
                    </button>
                  )}
                  {/* Snapshot version buttons */}
                  {snapshots.map((snap) => (
                    <button
                      key={snap.id}
                      type="button"
                      onClick={() => { setSelectedSnapshot(snap); setShowDiff(false); }}
                      style={{
                        padding: '6px 12px',
                        background: selectedSnapshot?.id === snap.id ? 'var(--ed-text-primary)' : 'none',
                        color: selectedSnapshot?.id === snap.id ? 'var(--ed-bg)' : 'var(--ed-text-secondary)',
                        border: '1px solid var(--ed-border)',
                        cursor: 'pointer',
                        fontFamily: 'var(--ed-font)',
                        fontSize: 'var(--ed-fs-small)',
                        fontWeight: selectedSnapshot?.id === snap.id ? 600 : 400,
                      }}
                    >
                      v{snap.version} · {new Date(snap.compiledAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Diff comparison view */}
            {showDiff && diffLines.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--ed-border)' }}>
                  Changes from v{previousSnapshot?.version} → v{brain?.version}
                </div>
                <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-body)', lineHeight: 1.6 }}>
                  {diffLines.map((line, i) => {
                    let style: React.CSSProperties = { padding: '2px 8px', whiteSpace: 'pre-wrap' };
                    if (line.type === 'added') {
                      style = {
                        ...style,
                        background: 'rgba(0, 128, 0, 0.06)',
                        borderLeft: '3px solid rgba(0, 128, 0, 0.3)',
                      };
                    } else if (line.type === 'removed') {
                      style = {
                        ...style,
                        background: 'rgba(200, 0, 0, 0.06)',
                        borderLeft: '3px solid rgba(200, 0, 0, 0.3)',
                      };
                    }
                    return (
                      <div key={i} style={style}>
                        <span style={{ color: line.type === 'added' ? 'rgba(0, 128, 0, 0.7)' : line.type === 'removed' ? 'rgba(200, 0, 0, 0.7)' : 'var(--ed-text-secondary)', marginRight: 8, userSelect: 'none', display: 'inline-block', width: 14 }}>
                          {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                        </span>
                        <span style={{ color: line.type === 'unchanged' ? 'var(--ed-text-secondary)' : 'var(--ed-text-primary)' }}>
                          {line.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Brain metadata */}
            {brain && (
              <div style={{ display: 'flex', gap: 16, fontSize: 'var(--ed-fs-small)', color: 'var(--ed-text-muted)', fontFamily: 'var(--ed-font)', marginBottom: 24 }}>
                {selectedSnapshot ? (
                  <>
                    <span>Viewing snapshot v{selectedSnapshot.version}</span>
                    <span>·</span>
                    <span>
                      Compiled{' '}
                      {new Date(selectedSnapshot.compiledAt).toLocaleDateString('en-CA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Version {brain.version}</span>
                    <span>·</span>
                    <span>
                      Last compiled{' '}
                      {new Date(brain.compiledAt).toLocaleDateString('en-CA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Collapsible brain prompt text sections */}
            {brain && !showDiff && displaySections.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--ed-border)' }}>
                  {selectedSnapshot ? `Brain Prompt (v${selectedSnapshot.version})` : 'Brain Prompt'}
                </div>
                {displaySections.map((section, i) => {
                  const isExpanded = expandedSections.has(i);
                  return (
                    <div key={i} style={{ borderBottom: '1px solid var(--ed-border)' }}>
                      <button
                        type="button"
                        onClick={() => toggleSection(i)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '12px 0',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--ed-font)',
                          fontSize: 'var(--ed-fs-body)',
                          fontWeight: 600,
                          color: 'var(--ed-text-primary)',
                          textAlign: 'left',
                        }}
                      >
                        <span>{section.title}</span>
                        <span style={{ color: 'var(--ed-text-muted)', fontSize: 'var(--ed-fs-small)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                          ▸
                        </span>
                      </button>
                      {isExpanded && (
                        <div style={{ padding: '0 0 16px', fontSize: 'var(--ed-fs-body)', color: 'var(--ed-text-secondary)', fontFamily: 'var(--ed-font)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {section.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Raw brain text fallback when no sections parsed */}
            {brain && !showDiff && displaySections.length === 0 && (
              <div style={{ padding: 24, border: '1px solid var(--ed-border)' }}>
                <div style={{ fontFamily: 'var(--ed-font)', fontSize: 'var(--ed-fs-micro)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ed-text-muted)', marginBottom: 12 }}>
                  {selectedSnapshot ? `Raw Brain Prompt (v${selectedSnapshot.version})` : 'Raw Brain Prompt'}
                </div>
                <p style={{ fontSize: 'var(--ed-fs-body)', color: 'var(--ed-text-secondary)', fontFamily: 'var(--ed-font)', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>
                  {displayText || 'No Chef Brain compiled yet. Add some dev logs or tasting notes, then recompile.'}
                </p>
              </div>
            )}

            {/* No brain data at all */}
            {!brain && !error && (
              <div style={{ padding: 24, border: '1px solid var(--ed-border)', textAlign: 'center' }}>
                <p style={{ fontSize: 'var(--ed-fs-body)', color: 'var(--ed-text-muted)', fontFamily: 'var(--ed-font)', margin: 0 }}>
                  No Chef Brain data yet. Start generating recipes and adding dev notes to build your cooking identity.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parse brain text into labelled sections
// ---------------------------------------------------------------------------

interface BrainSection {
  title: string;
  content: string;
}

function parseBrainSections(text: string): BrainSection[] {
  if (!text.trim()) return [];

  const sectionLabels = [
    'Flavour Biases',
    'Pantry Constants',
    'Technique Comfort',
    'Avoid List',
    'Cooking Context',
    'Recent Dev Notes',
    'Development Notes',
  ];

  const sections: BrainSection[] = [];
  const lines = text.split('\n');
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const matchedLabel = sectionLabels.find(
      (label) =>
        line.toLowerCase().includes(label.toLowerCase()) &&
        (line.startsWith('#') || line.endsWith(':') || line.startsWith('**'))
    );

    if (matchedLabel) {
      if (currentTitle && currentContent.length > 0) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      }
      currentTitle = matchedLabel;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentTitle && currentContent.length > 0) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  }

  return sections;
}
