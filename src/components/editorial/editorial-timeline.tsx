import type { Timeline } from '@/lib/types/recipe';

interface EditorialTimelineProps {
  timeline: Timeline | undefined;
}

interface NormalizedStage {
  label: string;
  duration_minutes: number;
  is_passive: boolean;
  advance_prep: boolean;
}

function normalizeTimeline(raw: unknown): { stages: NormalizedStage[]; total: number; serve_time: string | null; parallel_notes: string } {
  if (!raw) return { stages: [], total: 0, serve_time: null, parallel_notes: '' };

  // Already a Timeline object with stages
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const t = raw as any;
  if (t.stages && Array.isArray(t.stages) && t.stages.length > 0) {
    const stages = t.stages.map((s: any) => ({
      label: s.label || s.name || '',
      duration_minutes: s.duration_minutes || s.duration || 0,
      is_passive: s.is_passive || s.parallel || false,
      advance_prep: s.advance_prep || false,
    }));
    return { stages, total: t.total_duration_minutes || stages.reduce((sum: number, s: NormalizedStage) => sum + s.duration_minutes, 0), serve_time: t.serve_time || null, parallel_notes: t.parallel_notes || '' };
  }

  // Parsed array format [{name, duration, parallel, description}]
  if (Array.isArray(raw) && raw.length > 0) {
    const stages = (raw as any[]).map((s) => ({
      label: s.name || s.label || '',
      duration_minutes: s.duration || s.duration_minutes || 0,
      is_passive: s.parallel || s.is_passive || false,
      advance_prep: s.advance_prep || false,
    }));
    return { stages, total: stages.reduce((sum, s) => sum + s.duration_minutes, 0), serve_time: null, parallel_notes: '' };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return { stages: [], total: 0, serve_time: null, parallel_notes: '' };
}

export function EditorialTimeline({ timeline }: EditorialTimelineProps) {
  const { stages, total, serve_time, parallel_notes } = normalizeTimeline(timeline);
  if (stages.length === 0) return null;

  // Build cells from timeline data — up to 4 cells for the bake-bar style
  const cells: { label: string; value: string; isAccent?: boolean }[] = [];

  // Total duration
  cells.push({
    label: 'Total',
    value: `${total} min`,
    isAccent: true,
  });

  // Active stages (non-passive)
  const activeMinutes = stages
    .filter((s) => !s.is_passive)
    .reduce((sum, s) => sum + s.duration_minutes, 0);
  if (activeMinutes > 0) {
    cells.push({ label: 'Active', value: `${activeMinutes} min` });
  }

  // Passive stages
  const passiveMinutes = stages
    .filter((s) => s.is_passive)
    .reduce((sum, s) => sum + s.duration_minutes, 0);
  if (passiveMinutes > 0) {
    cells.push({ label: 'Passive', value: `${passiveMinutes} min` });
  }

  // Serve time
  if (serve_time) {
    cells.push({ label: 'Serve', value: serve_time });
  }

  // Pad to 4 cells if we have fewer
  while (cells.length < 4 && stages.length > cells.length) {
    const stage = stages[cells.length - 1];
    if (stage) {
      cells.push({ label: stage.label, value: `${stage.duration_minutes} min` });
    } else {
      break;
    }
  }

  return (
    <div>
      <div className="ed-bake-bar" style={{
        borderTop: '2px solid var(--ed-text-primary)',
        borderBottom: '2px solid var(--ed-text-primary)',
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(cells.length, 4)}, 1fr)`,
      }}>
        {cells.slice(0, 4).map((cell, idx) => (
          <div key={idx} style={{
            padding: '24px 28px',
            borderRight: idx < Math.min(cells.length, 4) - 1 ? '1px solid var(--ed-border)' : 'none',
          }}>
            <span style={{
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ed-text-muted)',
              display: 'block',
              marginBottom: '8px',
            }}>{cell.label}</span>
            <div style={{
              fontFamily: 'var(--ed-font-serif)',
              fontSize: '28px',
              fontWeight: 400,
              color: cell.isAccent ? 'var(--ed-accent)' : 'var(--ed-text-primary)',
              lineHeight: 1,
            }}>{cell.value}</div>
          </div>
        ))}
      </div>

      {/* Parallel notes below the bar */}
      {parallel_notes && (
        <p style={{
          margin: '12px 0 0',
          fontSize: 'var(--ed-fs-body)',
          color: 'var(--ed-text-muted)',
          lineHeight: 1.6,
        }}>
          {parallel_notes}
        </p>
      )}

      {/* Stage-based timeline grid — visual progress layout */}
      {stages.length > 0 && (() => {
        // Find the shortest (critical) stage index
        const displayStages = stages.slice(0, 4);
        const minDuration = Math.min(...displayStages.map((s) => s.duration_minutes));
        const criticalIdx = displayStages.findIndex((s) => s.duration_minutes === minDuration);

        return (
          <div className="ed-timeline-stages" style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: 0,
            borderBottom: '1px solid var(--ed-border)',
            marginTop: '24px',
          }}>
            <div className="ed-timeline-stages-label" style={{
              paddingRight: '36px',
              borderRight: '1px solid var(--ed-border)',
              display: 'flex',
              alignItems: 'flex-start',
              paddingTop: '24px',
              paddingBottom: '24px',
            }}>
              <span style={{
                fontSize: 'var(--ed-fs-micro)',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ed-text-muted)',
              }}>Timeline</span>
            </div>
            <div className="ed-timeline-stages-grid" style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${displayStages.length}, 1fr)`,
              gap: 0,
              paddingLeft: '36px',
            }}>
              {displayStages.map((stage, idx) => {
                const isCritical = idx === criticalIdx;
                return (
                  <div key={idx} style={{
                    padding: '24px 16px 24px 0',
                    borderRight: idx < displayStages.length - 1 ? '1px solid var(--ed-border)' : 'none',
                    paddingLeft: idx > 0 ? '16px' : 0,
                    borderTop: idx === 0 ? '2px solid var(--ed-text-primary)' : isCritical ? '2px solid var(--ed-accent, var(--ed-text-primary))' : '2px solid transparent',
                    position: 'relative',
                  }}>
                    {/* Stage number — italic serif */}
                    <span style={{
                      fontFamily: 'var(--ed-font-serif)',
                      fontSize: '13px',
                      fontStyle: 'italic',
                      color: 'var(--ed-text-muted)',
                      display: 'block',
                      marginBottom: '6px',
                    }}>{idx + 1}</span>
                    {/* Stage label */}
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--ed-text-primary)',
                      display: 'block',
                      marginBottom: '8px',
                    }}>{stage.label}</span>
                    {/* Duration — larger serif value */}
                    <span style={{
                      fontFamily: 'var(--ed-font-serif)',
                      fontSize: '28px',
                      fontWeight: 400,
                      color: isCritical ? 'var(--ed-accent, var(--ed-text-primary))' : 'var(--ed-text-primary)',
                      display: 'block',
                      marginBottom: '8px',
                      lineHeight: 1,
                    }}>{stage.duration_minutes} min</span>
                    {/* Note — italic muted */}
                    <span style={{
                      fontSize: '11px',
                      fontStyle: 'italic',
                      color: 'var(--ed-text-muted)',
                      display: 'block',
                    }}>{stage.is_passive ? 'Passive' : 'Active'}{stage.advance_prep ? ' · Prep ahead' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px) {
          .ed-bake-bar { grid-template-columns: 1fr 1fr !important; }
          .ed-timeline-stages { grid-template-columns: 1fr !important; }
          .ed-timeline-stages-label { border-right: none !important; border-bottom: 1px solid var(--ed-border); padding-right: 0 !important; }
          .ed-timeline-stages-grid { padding-left: 0 !important; grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
