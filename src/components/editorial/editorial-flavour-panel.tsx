import type { FlavourArchitecture } from '@/lib/types/recipe';

interface EditorialFlavourPanelProps {
  flavour: FlavourArchitecture | undefined;
}

export function EditorialFlavourPanel({ flavour }: EditorialFlavourPanelProps) {
  if (!flavour) return null;

  // Support both V2 (dominant_element) and parsed (dominant) field names
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const f = flavour as any;
  const dominantRaw: string = f.dominant_element || f.dominant || '';
  if (!dominantRaw) return null;

  const profileTags: string[] = f.flavour_profile || f.profile || [];
  const balanceNote: string = f.balance_note || f.balance || '';
  const theMove: string = f.the_move || '';

  // Build prose from whatever shape we have
  const proseParts: string[] = [];
  const dominant = dominantRaw.replace(/-/g, ' ');
  proseParts.push(`${dominant.charAt(0).toUpperCase() + dominant.slice(1)}`);

  // V2 shape: fat.primary_fat
  if (f.fat?.primary_fat) {
    proseParts.push(f.fat.primary_fat + (f.fat.character ? `, ${f.fat.character}` : ''));
  }
  // Parsed shape: fat as array [{source, role}]
  else if (Array.isArray(f.fat) && f.fat.length > 0) {
    proseParts.push(f.fat.map((x: any) => x.source).join(', '));
  }

  // V2 shape: acid.present + acid.sources
  if (f.acid?.present && Array.isArray(f.acid.sources) && f.acid.sources.length > 0) {
    proseParts.push(f.acid.sources.join(' and ') + (f.acid.character ? ` (${f.acid.character})` : ''));
  }
  // Parsed shape: acid as array [{source, role}]
  else if (Array.isArray(f.acid) && f.acid.length > 0) {
    proseParts.push(f.acid.map((x: any) => x.source).join(' and '));
  }

  if (balanceNote) proseParts.push(balanceNote);
  const proseDescription = proseParts.join('. ') + (proseParts.length > 0 ? '.' : '');

  // Texture contrasts — V2 or parsed
  const textureContrasts: Array<{element_a?: string; element_b?: string; element?: string; contrast?: string}> =
    f.texture_contrasts || (Array.isArray(f.texture) ? f.texture : []);

  const dominantTag = dominantRaw.replace(/-/g, ' ');
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div>
      {/* Prose description */}
      <p style={{
        fontSize: 'var(--ed-fs-body)',
        lineHeight: 1.75,
        color: 'var(--ed-text-secondary)',
        margin: 0,
      }}>
        {proseDescription}
      </p>

      {/* Texture contrasts as prose */}
      {textureContrasts.length > 0 && (
        <p style={{
          fontSize: 'var(--ed-fs-body)',
          lineHeight: 1.75,
          color: 'var(--ed-text-secondary)',
          margin: '12px 0 0',
        }}>
          {textureContrasts.map((tc) => {
            if (tc.element_a && tc.element_b) return `${tc.element_a} against ${tc.element_b}`;
            if (tc.element && tc.contrast) return `${tc.element} against ${tc.contrast}`;
            return '';
          }).filter(Boolean).join('. ')}.
        </p>
      )}

      {/* Flavour tags */}
      {profileTags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: '16px',
        }}>
          {/* Dominant tag with accent */}
          <span style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            padding: '4px 10px',
            border: '1px solid var(--ed-accent)',
            color: 'var(--ed-accent)',
            background: 'none',
          }}>
            {dominantTag}
          </span>
          {/* Profile tags */}
          {profileTags.map((tag) => (
            <span key={tag} style={{
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.06em',
              padding: '4px 10px',
              border: '1px solid var(--ed-border)',
              color: 'var(--ed-text-secondary)',
              background: 'none',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* The Move */}
      {theMove && (
        <p style={{
          fontSize: 'var(--ed-fs-body)',
          lineHeight: 1.75,
          color: 'var(--ed-text-secondary)',
          margin: '16px 0 0',
          fontStyle: 'italic',
        }}>
          <strong style={{ color: 'var(--ed-text-primary)', fontWeight: 500, fontStyle: 'normal' }}>The Move:</strong>{' '}
          {theMove}
        </p>
      )}
    </div>
  );
}
