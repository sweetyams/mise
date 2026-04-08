import type { Variations } from '@/lib/types/recipe';

interface EditorialVariationsProps {
  variations: Variations | undefined;
}

interface VariationItem {
  name: string;
  description: string;
}

export function EditorialVariations({ variations }: EditorialVariationsProps) {
  if (!variations) return null;

  // Helper: safely join changes whether it's a string or array
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const joinChanges = (changes: any): string => {
    if (!changes) return '';
    if (typeof changes === 'string') return changes;
    if (Array.isArray(changes)) return changes.join(', ');
    return String(changes);
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Collect all variations into a flat list
  const allVariations: VariationItem[] = [];

  // Handle parsed format: { dietary: [{name, changes}], pantry: [{name, changes}] }
  // Handle V2 format: { dietary: [{type, changes[], impact_note}], taste_profiles: [{name, changes[]}], ... }
  if (Array.isArray(variations.dietary)) {
    variations.dietary.forEach((v: any) => {
      allVariations.push({
        name: v.type || v.name || '',
        description: [joinChanges(v.changes), v.impact_note].filter(Boolean).join('. '),
      });
    });
  }
  if (Array.isArray((variations as any).pantry)) {
    (variations as any).pantry.forEach((v: any) => {
      allVariations.push({
        name: v.name || '',
        description: joinChanges(v.changes),
      });
    });
  }
  if (Array.isArray(variations.taste_profiles)) {
    variations.taste_profiles.forEach((v: any) => {
      allVariations.push({
        name: v.name || '',
        description: joinChanges(v.changes),
      });
    });
  }
  if (Array.isArray(variations.technique)) {
    variations.technique.forEach((v: any) => {
      allVariations.push({
        name: v.name || '',
        description: [joinChanges(v.changes), v.tradeoffs].filter(Boolean).join('. '),
      });
    });
  }
  if (Array.isArray(variations.regional)) {
    variations.regional.forEach((v: any) => {
      allVariations.push({
        name: v.direction || v.name || '',
        description: [joinChanges(v.changes), v.fingerprint_note].filter(Boolean).join('. '),
      });
    });
  }

  if (allVariations.length === 0) return null;

  return (
    <div style={{ padding: '40px 0', borderBottom: '1px solid var(--ed-border)' }}>
      <div className="ed-variations-head" style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: 0,
        alignItems: 'start',
      }}>
        {/* Left label */}
        <div className="ed-variations-label" style={{
          paddingRight: '36px',
          borderRight: '1px solid var(--ed-border)',
        }}>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
          }}>Variations</span>
        </div>

        {/* Right grid of variations */}
        <div className="ed-variations-grid" style={{
          display: 'grid',
          gridTemplateColumns: allVariations.length > 1 ? '1fr 1fr' : '1fr',
          gap: 0,
          paddingLeft: '36px',
        }}>
          {allVariations.map((v, idx) => (
            <div
              key={`${v.name}-${idx}`}
              style={{
                paddingRight: idx % 2 === 0 && allVariations.length > 1 ? '32px' : 0,
                borderRight: idx % 2 === 0 && idx < allVariations.length - 1 ? '1px solid var(--ed-border)' : 'none',
                paddingLeft: idx % 2 === 1 ? '32px' : 0,
              }}
            >
              <span style={{
                fontSize: 'var(--ed-fs-body)',
                fontWeight: 600,
                color: 'var(--ed-text-primary)',
                marginBottom: '8px',
                display: 'block',
              }}>
                {v.name}
              </span>
              <p style={{
                fontSize: 'var(--ed-fs-small)',
                color: 'var(--ed-text-secondary)',
                lineHeight: 1.65,
                margin: 0,
              }}>
                {v.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .ed-variations-head { grid-template-columns: 1fr !important; }
          .ed-variations-label { border-right: none !important; padding-right: 0 !important; border-bottom: 1px solid var(--ed-border); padding-bottom: 24px; }
          .ed-variations-grid { padding-left: 0 !important; padding-top: 24px; grid-template-columns: 1fr !important; }
          .ed-variations-grid > div { border-right: none !important; padding: 0 0 20px !important; }
          .ed-variations-grid > div:last-child { padding-bottom: 0 !important; }
        }
      `}</style>
    </div>
  );
}
