'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

function useScrollReveal(): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip animation for elements already in viewport on mount
    if (!mounted.current) {
      mounted.current = true;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add('ed-visible');
        return;
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('ed-visible');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

interface EditorialSectionProps {
  label: string;
  showDivider?: boolean;
  children: ReactNode;
}

export function EditorialSection({ label, showDivider = true, children }: EditorialSectionProps) {
  const ref = useScrollReveal();

  return (
    <section
      ref={ref}
      className="ed-reveal"
      style={{ marginTop: 'var(--ed-spacing-section)' }}
    >
      {showDivider && (
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--ed-border)',
            margin: 0,
            marginBottom: 'var(--ed-spacing-subsection)',
          }}
        />
      )}
      <h2
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontSize: 'var(--ed-fs-micro)',
          fontWeight: 600,
          color: 'var(--ed-text-muted)',
          margin: 0,
          marginBottom: 'var(--ed-spacing-subsection)',
        }}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}
