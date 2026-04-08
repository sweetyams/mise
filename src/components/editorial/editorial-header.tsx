'use client';

import { useRef } from 'react';

interface EditorialHeaderProps {
  title: string;
  subtitle?: string;
  occasion?: string;
  mood?: string;
  effort?: string;
  totalTime?: number;
  season?: string;
  fingerprint?: string;
  feeds?: number;
  activeTime?: number;
  prepAheadNotes?: string;
}

export function EditorialHeader({
  title,
  subtitle,
  occasion,
  mood,
  totalTime,
  fingerprint,
  feeds,
  activeTime,
  prepAheadNotes,
}: EditorialHeaderProps) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  const categoryParts: string[] = [];
  if (occasion) categoryParts.push(occasion);
  if (mood) categoryParts.push(mood);
  const categoryLabel = categoryParts.join(' · ');

  return (
    <header style={{ paddingTop: '56px', borderBottom: '2px solid var(--ed-text-primary)' }}>
      {/* Top row: fingerprint + category */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {fingerprint && (
            <span style={{
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ed-accent)',
            }}>
              {fingerprint}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {categoryLabel && (
            <span style={{
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ed-text-muted)',
            }}>
              {categoryLabel}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h1
        ref={titleRef}
        style={{
          fontFamily: 'var(--ed-font-serif)',
          fontWeight: 400,
          fontSize: 'var(--ed-fs-hero)',
          lineHeight: 1.0,
          letterSpacing: '-0.02em',
          margin: '0 0 16px',
          color: 'var(--ed-text-primary)',
        }}
      >
        {title}
      </h1>

      {/* Subtitle */}
      {subtitle && (
        <p style={{
          fontSize: 'var(--ed-fs-med)',
          color: 'var(--ed-text-secondary)',
          fontWeight: 400,
          lineHeight: 1.5,
          maxWidth: '540px',
          margin: '0 0 32px',
        }}>
          {subtitle}
        </p>
      )}

      {/* Stats bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, auto) 1fr',
        gap: 0,
        padding: '18px 0',
        borderTop: '1px solid var(--ed-border)',
      }}>
        {/* Yield */}
        <div style={{ paddingRight: '32px', borderRight: '1px solid var(--ed-border)', marginRight: '32px' }}>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
            display: 'block',
            marginBottom: '4px',
          }}>Yield</span>
          <span style={{
            fontSize: 'var(--ed-fs-body)',
            fontWeight: 500,
            color: 'var(--ed-text-primary)',
          }}>
            {feeds ? `Feeds ${feeds}` : '—'}
          </span>
        </div>

        {/* Active time */}
        <div style={{ paddingRight: '32px', borderRight: '1px solid var(--ed-border)', marginRight: '32px' }}>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
            display: 'block',
            marginBottom: '4px',
          }}>Active</span>
          <span style={{
            fontSize: 'var(--ed-fs-body)',
            fontWeight: 500,
            color: 'var(--ed-text-primary)',
          }}>
            {activeTime ? `${activeTime} min` : '—'}
          </span>
        </div>

        {/* Total time */}
        <div style={{ paddingRight: '32px', borderRight: '1px solid var(--ed-border)', marginRight: '32px' }}>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
            display: 'block',
            marginBottom: '4px',
          }}>Total</span>
          <span style={{
            fontSize: 'var(--ed-fs-body)',
            fontWeight: 500,
            color: 'var(--ed-text-primary)',
          }}>
            {totalTime ? `${totalTime} min` : '—'}
          </span>
        </div>

        {/* Ahead */}
        <div>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
            display: 'block',
            marginBottom: '4px',
          }}>Ahead</span>
          <span style={{
            fontSize: 'var(--ed-fs-body)',
            fontWeight: 500,
            color: 'var(--ed-text-primary)',
          }}>
            {prepAheadNotes || '—'}
          </span>
        </div>
      </div>
    </header>
  );
}
