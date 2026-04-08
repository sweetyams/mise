import type { Recipe } from '@/lib/types/recipe';

interface EditorialBriefProps {
  recipe: Recipe;
}

export function EditorialBrief({ recipe }: EditorialBriefProps) {
  const metaParts: string[] = [];
  if (recipe.intent?.occasion) metaParts.push(recipe.intent.occasion);
  if (recipe.intent?.mood) metaParts.push(recipe.intent.mood);
  if (recipe.intent?.effort) metaParts.push(recipe.intent.effort);
  if (recipe.intent?.total_time_minutes) metaParts.push(`${recipe.intent.total_time_minutes} min`);
  if (recipe.intent?.season) metaParts.push(recipe.intent.season);

  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--ed-font-serif)',
        fontWeight: 400,
        fontSize: 'var(--ed-fs-hero)',
        letterSpacing: '-0.02em',
        lineHeight: 1.0,
        margin: 0,
        color: 'var(--ed-text-primary)',
      }}>
        {recipe.title}
      </h1>

      {metaParts.length > 0 && (
        <p style={{
          fontSize: 'var(--ed-fs-body)',
          color: 'var(--ed-text-secondary)',
          margin: '12px 0 0',
        }}>
          {metaParts.join(' · ')}
        </p>
      )}

      {recipe.components && recipe.components.length > 0 && (
        <div style={{ marginTop: 'var(--ed-spacing-subsection)' }}>
          {recipe.components.map((comp) => (
            <div
              key={comp.id}
              style={{
                marginTop: '20px',
                borderTop: '1px solid var(--ed-border)',
                paddingTop: '16px',
              }}
            >
              <p style={{
                fontWeight: 600,
                fontSize: 'var(--ed-fs-med)',
                margin: 0,
                color: 'var(--ed-text-primary)',
              }}>
                {comp.name}
              </p>
              {comp.ingredients && comp.ingredients.length > 0 && (
                <p style={{
                  fontSize: 'var(--ed-fs-body)',
                  color: 'var(--ed-text-secondary)',
                  margin: '6px 0 0',
                  lineHeight: 1.6,
                }}>
                  {comp.ingredients.map((ing) => ing.name).join(', ')}
                </p>
              )}
              {comp.steps && comp.steps.length > 0 && (
                <ol style={{
                  margin: '10px 0 0',
                  paddingLeft: '20px',
                  fontSize: 'var(--ed-fs-body)',
                  lineHeight: 1.65,
                  color: 'var(--ed-text-primary)',
                }}>
                  {comp.steps.map((step) => (
                    <li key={step.id} style={{ marginBottom: '4px' }}>{step.instruction}</li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
