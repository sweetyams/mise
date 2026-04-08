'use client';

import { useState, useEffect } from 'react';
import type { Recipe } from '@/lib/types/recipe';

interface EditorialCookModeProps {
  recipe: Recipe;
  currentStage: number;
  onStageChange: (stage: number) => void;
}

export function EditorialCookMode({ recipe, currentStage, onStageChange }: EditorialCookModeProps) {
  const components = recipe.components ?? [];
  const total = components.length;
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);

  const safeStage = Math.max(0, Math.min(currentStage, total - 1));
  const component = components[safeStage];

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 250);
    return () => clearTimeout(timer);
  }, [safeStage]);

  if (total === 0 || !component) return null;

  const goTo = (stage: number, dir: 'next' | 'prev') => {
    setDirection(dir);
    onStageChange(stage);
  };

  const navButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'var(--ed-font)',
    fontSize: 'var(--ed-fs-body)',
    fontWeight: 500,
    color: 'var(--ed-text-muted)',
    transition: 'opacity 150ms',
  };

  return (
    <div>
      {/* Stage counter */}
      <p style={{
        fontSize: 'var(--ed-fs-small)',
        color: 'var(--ed-text-secondary)',
        margin: '0 0 var(--ed-spacing-subsection)',
        textAlign: 'center',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Stage {safeStage + 1} of {total}
      </p>

      {/* Animated content wrapper */}
      <div style={{
        transition: 'transform 250ms ease-out, opacity 250ms ease-out',
        transform: animating
          ? direction === 'next' ? 'translateX(40px)' : 'translateX(-40px)'
          : 'translateX(0)',
        opacity: animating ? 0 : 1,
      }}>
        {/* Component header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr',
          alignItems: 'baseline',
          gap: '20px',
          paddingBottom: '28px',
          borderBottom: '1px solid var(--ed-border)',
        }}>
          <span style={{
            fontFamily: 'var(--ed-font-serif)',
            fontSize: '32px',
            fontStyle: 'italic',
            color: 'var(--ed-border)',
            lineHeight: 1,
          }}>
            {safeStage + 1}
          </span>
          <span style={{
            fontSize: 'var(--ed-fs-lg)',
            fontWeight: 600,
            color: 'var(--ed-text-primary)',
          }}>
            {component.name}
          </span>
        </div>

        {/* Ingredients */}
        {component.ingredients && component.ingredients.length > 0 && (
          <div style={{ padding: '28px 0', borderBottom: '1px solid var(--ed-border)' }}>
            <span style={{
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ed-text-muted)',
              display: 'block',
              marginBottom: '20px',
            }}>Ingredients</span>
            {component.ingredients.map((ing, idx) => (
              <div key={ing.id} style={{
                display: 'grid',
                gridTemplateColumns: '72px 1fr',
                gap: '12px',
                padding: '10px 0',
                borderBottom: idx < component.ingredients.length - 1 ? '1px solid var(--ed-border)' : 'none',
                alignItems: 'start',
              }}>
                <span style={{
                  fontSize: 'var(--ed-fs-body)',
                  fontWeight: 600,
                  color: 'var(--ed-text-primary)',
                }}>
                  {ing.amount > 0 ? `${ing.amount} ${ing.unit ?? ''}`.trim() : ing.unit || ''}
                </span>
                <div>
                  <span style={{
                    fontSize: 'var(--ed-fs-body)',
                    color: 'var(--ed-text-primary)',
                    display: 'block',
                  }}>
                    {ing.name}
                  </span>
                  {ing.function && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--ed-text-muted)',
                      fontStyle: 'italic',
                      display: 'block',
                      marginTop: '2px',
                    }}>
                      {ing.function}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Steps */}
        {component.steps && component.steps.length > 0 && (
          <div style={{ padding: '28px 0' }}>
            <span style={{
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ed-text-muted)',
              display: 'block',
              marginBottom: '20px',
            }}>Method</span>
            {component.steps.map((step, idx) => (
              <div key={step.id} style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr',
                gap: '14px',
                padding: '14px 0',
                borderBottom: idx < component.steps.length - 1 ? '1px solid var(--ed-border)' : 'none',
              }}>
                <span style={{
                  fontSize: 'var(--ed-fs-small)',
                  fontWeight: 600,
                  color: 'var(--ed-text-muted)',
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
        )}

        {/* Doneness */}
        {component.doneness_description && (
          <div style={{
            borderTop: '1px solid var(--ed-border)',
            padding: '18px 0',
          }}>
            <span style={{
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ed-text-muted)',
              display: 'block',
              marginBottom: '8px',
            }}>Doneness</span>
            <p style={{
              fontSize: 'var(--ed-fs-small)',
              color: 'var(--ed-text-secondary)',
              lineHeight: 1.65,
              margin: 0,
            }}>
              {component.doneness_description}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'var(--ed-spacing-subsection)',
        borderTop: '2px solid var(--ed-text-primary)',
        paddingTop: '16px',
      }}>
        <button
          onClick={() => goTo(safeStage - 1, 'prev')}
          disabled={safeStage === 0}
          style={{
            ...navButtonStyle,
            opacity: safeStage === 0 ? 0.3 : 0.8,
            cursor: safeStage === 0 ? 'default' : 'pointer',
          }}
        >
          ← Previous
        </button>
        <button
          onClick={() => goTo(safeStage + 1, 'next')}
          disabled={safeStage >= total - 1}
          style={{
            ...navButtonStyle,
            opacity: safeStage >= total - 1 ? 0.3 : 0.8,
            cursor: safeStage >= total - 1 ? 'default' : 'pointer',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
