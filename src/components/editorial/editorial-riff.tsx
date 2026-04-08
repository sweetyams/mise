import type { Recipe } from '@/lib/types/recipe';

interface EditorialRiffProps {
  recipe: Recipe;
}

export function EditorialRiff({ recipe }: EditorialRiffProps) {
  const thinking = recipe.thinking;
  const flavour = recipe.flavour;
  const components = recipe.components ?? [];

  return (
    <div>
      {/* Thinking section */}
      {thinking && (
        <div style={{ marginBottom: 'var(--ed-spacing-subsection)' }}>
          {thinking.origin && (
            <p style={{
              fontSize: 'var(--ed-fs-body)',
              lineHeight: 1.75,
              color: 'var(--ed-text-secondary)',
              margin: '0 0 12px',
            }}>
              <strong style={{ color: 'var(--ed-text-primary)', fontWeight: 500 }}>Origin:</strong>{' '}
              {thinking.origin}
            </p>
          )}
          {thinking.architecture_logic && (
            <p style={{
              fontSize: 'var(--ed-fs-body)',
              lineHeight: 1.75,
              color: 'var(--ed-text-secondary)',
              margin: '0 0 12px',
            }}>
              <strong style={{ color: 'var(--ed-text-primary)', fontWeight: 500 }}>Architecture:</strong>{' '}
              {thinking.architecture_logic}
            </p>
          )}
          {thinking.the_pattern && (
            <p style={{
              fontSize: 'var(--ed-fs-body)',
              lineHeight: 1.75,
              color: 'var(--ed-text-secondary)',
              margin: 0,
            }}>
              <strong style={{ color: 'var(--ed-text-primary)', fontWeight: 500 }}>Pattern:</strong>{' '}
              {thinking.the_pattern}
            </p>
          )}
        </div>
      )}

      {/* Flavour architecture */}
      {flavour && (
        <div style={{
          borderTop: '1px solid var(--ed-border)',
          paddingTop: 'var(--ed-spacing-subsection)',
          marginBottom: 'var(--ed-spacing-subsection)',
        }}>
          {flavour.dominant_element && (
            <p style={{
              fontFamily: 'var(--ed-font-serif)',
              fontWeight: 400,
              fontSize: 'var(--ed-fs-xl)',
              color: 'var(--ed-text-primary)',
              margin: '0 0 12px',
              lineHeight: 1.2,
            }}>
              {flavour.dominant_element}
            </p>
          )}
          {flavour.flavour_profile && flavour.flavour_profile.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '12px',
            }}>
              {flavour.flavour_profile.map((tag) => (
                <span key={tag} style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  padding: '4px 10px',
                  border: '1px solid var(--ed-border)',
                  color: 'var(--ed-text-secondary)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          {flavour.balance_note && (
            <p style={{
              fontSize: 'var(--ed-fs-body)',
              fontStyle: 'italic',
              color: 'var(--ed-text-secondary)',
              lineHeight: 1.75,
              margin: 0,
            }}>
              {flavour.balance_note}
            </p>
          )}
        </div>
      )}

      {/* Technique direction — components without amounts */}
      {components.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--ed-border)',
          paddingTop: 'var(--ed-spacing-subsection)',
        }}>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
            display: 'block',
            marginBottom: '16px',
          }}>Technique Direction</span>
          {components.map((comp) => (
            <div key={comp.id} style={{ marginBottom: '20px' }}>
              <p style={{
                fontWeight: 600,
                fontSize: 'var(--ed-fs-med)',
                margin: 0,
                color: 'var(--ed-text-primary)',
              }}>
                {comp.name}
                {comp.role && (
                  <span style={{
                    fontWeight: 400,
                    color: 'var(--ed-text-muted)',
                    fontSize: 'var(--ed-fs-body)',
                  }}>
                    {' '}— {comp.role}
                  </span>
                )}
              </p>

              {comp.ingredients && comp.ingredients.length > 0 && (
                <p style={{
                  fontSize: 'var(--ed-fs-body)',
                  color: 'var(--ed-text-secondary)',
                  margin: '4px 0 0',
                  lineHeight: 1.65,
                }}>
                  {comp.ingredients.map((ing) => ing.name).join(', ')}
                </p>
              )}

              {comp.steps && comp.steps.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {comp.steps.map((step) => (
                    <p key={step.id} style={{
                      margin: '4px 0 0',
                      fontSize: 'var(--ed-fs-body)',
                      lineHeight: 1.65,
                      color: 'var(--ed-text-primary)',
                    }}>
                      {step.instruction}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
