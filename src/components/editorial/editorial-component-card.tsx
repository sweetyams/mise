import type { Component } from '@/lib/types/recipe';

interface EditorialComponentCardProps {
  component: Component;
  componentIndex?: number;
}

export function EditorialComponentCard({ component, componentIndex }: EditorialComponentCardProps) {
  const {
    name,
    prep_ahead_notes,
    ingredients,
    steps,
    doneness_description,
  } = component;

  const indexDisplay = componentIndex !== undefined ? componentIndex : '';

  return (
    <div style={{ borderBottom: '1px solid var(--ed-border)' }}>
      {/* Component header: number | name | prep notes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto',
        alignItems: 'baseline',
        gap: '20px',
        padding: '32px 0 28px',
        borderBottom: '1px solid var(--ed-border)',
      }}>
        <span style={{
          fontFamily: 'var(--ed-font-serif)',
          fontSize: '32px',
          fontStyle: 'italic',
          color: 'var(--ed-border)',
          lineHeight: 1,
        }}>
          {indexDisplay}
        </span>
        <span style={{
          fontSize: 'var(--ed-fs-lg)',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--ed-text-primary)',
        }}>
          {name}
        </span>
        {prep_ahead_notes && (
          <span style={{
            fontSize: 'var(--ed-fs-small)',
            color: 'var(--ed-text-muted)',
            textAlign: 'right',
            lineHeight: 1.5,
          }}>
            {prep_ahead_notes}
          </span>
        )}
      </div>

      {/* Component body: ingredients left | method right */}
      <div className="ed-component-body" style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: 0,
      }}>
        {/* Ingredients column */}
        <div className="ed-ingredients-col" style={{
          borderRight: '1px solid var(--ed-border)',
          padding: '28px 36px 28px 0',
        }}>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
            display: 'block',
            marginBottom: '20px',
          }}>Ingredients</span>

          {ingredients && ingredients.length > 0 && ingredients.map((ing, idx) => (
            <div
              key={ing.id || idx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '12px',
                padding: '10px 0',
                borderBottom: idx < ingredients.length - 1 ? '1px solid var(--ed-border)' : 'none',
                alignItems: 'start',
              }}
            >
              <span style={{
                fontSize: 'var(--ed-fs-body)',
                fontWeight: 600,
                color: 'var(--ed-text-primary)',
                paddingTop: '1px',
                whiteSpace: 'nowrap',
                minWidth: '56px',
              }}>
                {ing.amount > 0 ? `${ing.amount} ${ing.unit ?? ''}`.trim() : ing.unit || ''}
              </span>
              <div>
                <span style={{
                  fontSize: 'var(--ed-fs-body)',
                  color: 'var(--ed-text-primary)',
                  lineHeight: 1.4,
                  display: 'block',
                }}>
                  {ing.name}{ing.preparation ? `, ${ing.preparation}` : ''}
                </span>
                {ing.function && (
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--ed-text-muted)',
                    marginTop: '2px',
                    display: 'block',
                    fontStyle: 'italic',
                  }}>
                    {ing.function}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Method column */}
        <div className="ed-method-col" style={{
          padding: '28px 0 28px 36px',
        }}>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
            display: 'block',
            marginBottom: '20px',
          }}>Method</span>

          {steps && steps.length > 0 && steps.map((step, idx) => (
            <div
              key={step.id || idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr',
                gap: '14px',
                padding: '14px 0',
                borderBottom: idx < steps.length - 1 ? '1px solid var(--ed-border)' : 'none',
              }}
            >
              <span style={{
                fontSize: 'var(--ed-fs-small)',
                fontWeight: 600,
                color: 'var(--ed-text-muted)',
                paddingTop: '1px',
              }}>
                {String(step.sequence ?? idx + 1).padStart(2, '0')}
              </span>
              <div>
                <p style={{
                  fontSize: 'var(--ed-fs-body)',
                  lineHeight: 1.65,
                  color: 'var(--ed-text-primary)',
                  margin: '0 0 5px',
                }}>
                  {step.instruction}
                  {step.timing && step.timing.duration_minutes > 0 && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--ed-accent)',
                      letterSpacing: '0.06em',
                      marginLeft: '4px',
                    }}>
                      {step.timing.duration_minutes} min
                    </span>
                  )}
                </p>
                {step.technique_note && (
                  <p style={{
                    fontSize: 'var(--ed-fs-small)',
                    lineHeight: 1.55,
                    color: 'var(--ed-text-muted)',
                    fontStyle: 'italic',
                    margin: 0,
                  }}>
                    {step.technique_note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Doneness row */}
        {doneness_description && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            borderTop: '1px solid var(--ed-border)',
          }}
          className="ed-doneness"
          >
            <div className="ed-doneness-label-col" style={{
              padding: '18px 36px 18px 0',
              borderRight: '1px solid var(--ed-border)',
              display: 'flex',
              alignItems: 'center',
            }}>
              <span style={{
                fontSize: 'var(--ed-fs-micro)',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ed-text-muted)',
              }}>Doneness</span>
            </div>
            <div className="ed-doneness-cues-col" style={{
              padding: '18px 0 18px 36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '6px',
            }}>
              {doneness_description.split(/[.;]\s*/).filter(Boolean).map((cue, i) => (
                <p key={i} style={{
                  fontSize: 'var(--ed-fs-small)',
                  color: 'var(--ed-text-secondary)',
                  lineHeight: 1.5,
                  paddingLeft: '14px',
                  position: 'relative',
                  margin: 0,
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    color: 'var(--ed-text-muted)',
                  }}>—</span>
                  {cue.trim()}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .ed-component-body { grid-template-columns: 1fr !important; }
          .ed-ingredients-col { border-right: none !important; border-bottom: 1px solid var(--ed-border); padding: 28px 0 !important; }
          .ed-method-col { padding: 28px 0 !important; }
          .ed-doneness { grid-template-columns: 1fr !important; }
          .ed-doneness-label-col { border-right: none !important; border-bottom: 1px solid var(--ed-border); }
          .ed-doneness-cues-col { padding-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
