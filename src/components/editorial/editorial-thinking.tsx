import type { Thinking } from '@/lib/types/recipe';

interface EditorialThinkingProps {
  thinking: Thinking | undefined;
}

export function EditorialThinking({ thinking }: EditorialThinkingProps) {
  if (!thinking) return null;

  const hasContent =
    thinking.architecture_logic ||
    thinking.the_pattern ||
    thinking.origin ||
    thinking.fingerprint_note;

  if (!hasContent) return null;

  return (
    <div>
      {thinking.architecture_logic && (
        <p style={{
          fontSize: 'var(--ed-fs-body)',
          lineHeight: 1.75,
          color: 'var(--ed-text-secondary)',
          margin: 0,
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
          margin: '12px 0 0',
        }}>
          <strong style={{ color: 'var(--ed-text-primary)', fontWeight: 500 }}>Pattern:</strong>{' '}
          {thinking.the_pattern}
        </p>
      )}

      {thinking.origin && (
        <p style={{
          fontSize: 'var(--ed-fs-body)',
          lineHeight: 1.75,
          color: 'var(--ed-text-secondary)',
          margin: '12px 0 0',
        }}>
          <strong style={{ color: 'var(--ed-text-primary)', fontWeight: 500 }}>Origin:</strong>{' '}
          {thinking.origin}
        </p>
      )}

      {thinking.fingerprint_note && (
        <p style={{
          fontSize: 'var(--ed-fs-body)',
          lineHeight: 1.75,
          color: 'var(--ed-text-secondary)',
          margin: '12px 0 0',
        }}>
          <strong style={{ color: 'var(--ed-text-primary)', fontWeight: 500 }}>Fingerprint:</strong>{' '}
          {thinking.fingerprint_note}
        </p>
      )}
    </div>
  );
}
