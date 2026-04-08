'use client';

// =============================================================================
// MISE Display Mode Switcher — Editorial Seven Views
// =============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Recipe } from '@/lib/types/recipe';
import {
  EditorialHeader,
  EditorialThinking,
  EditorialFlavourPanel,
  EditorialComponentCard,
  EditorialTimeline,
  EditorialVariations,
  EditorialBrief,
  EditorialCookMode,
  EditorialShoppingList,
  EditorialRiff,
  EditorialSection,
} from '@/components/editorial';

type DisplayMode = 'full' | 'brief' | 'cook' | 'flavour-map' | 'shopping' | 'timeline' | 'riff';

interface DisplayModeSwitcherProps {
  recipe: Recipe;
  userPantry?: string[];
  serveTime?: Date;
}

const MODE_TABS: Array<{ value: DisplayMode; label: string }> = [
  { value: 'full', label: 'Full Recipe' },
  { value: 'brief', label: 'Brief' },
  { value: 'cook', label: 'Cook' },
  { value: 'flavour-map', label: 'Flavour Map' },
  { value: 'shopping', label: 'Shopping List' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'riff', label: 'Riff' },
];

function EditorialFullView({ recipe }: { recipe: Recipe }) {
  return (
    <div>
      <EditorialHeader
        title={recipe.title}
        subtitle={recipe.subtitle}
        occasion={recipe.intent?.occasion}
        mood={recipe.intent?.mood}
        effort={recipe.intent?.effort}
        totalTime={recipe.intent?.total_time_minutes}
        season={recipe.intent?.season}
        fingerprint={recipe.fingerprint_id}
        feeds={recipe.intent?.feeds}
        activeTime={recipe.intent?.active_time_minutes}
        prepAheadNotes={recipe.intent?.prep_ahead_notes}
      />

      {/* Intro: Thinking + Flavour side by side */}
      <div className="ed-intro" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
        borderBottom: '1px solid var(--ed-border)',
      }}>
        <div style={{
          padding: '40px 48px 40px 0',
          borderRight: '1px solid var(--ed-border)',
        }}>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
            display: 'block',
            marginBottom: '14px',
          }}>The Thinking</span>
          <EditorialThinking thinking={recipe.thinking} />
        </div>
        <div style={{ padding: '40px 0 40px 48px' }}>
          <span style={{
            fontSize: 'var(--ed-fs-micro)',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ed-text-muted)',
            display: 'block',
            marginBottom: '14px',
          }}>Flavour Architecture</span>
          <EditorialFlavourPanel flavour={recipe.flavour} />
        </div>
      </div>

      {/* Timeline as bake bar */}
      <EditorialTimeline timeline={recipe.timeline} />

      {/* Components with index numbers */}
      {recipe.components && recipe.components.length > 0 && (
        <>
          {recipe.components.map((comp, idx) => (
            <EditorialComponentCard
              key={comp.id || comp.name || idx}
              component={comp}
              componentIndex={idx + 1}
            />
          ))}
        </>
      )}

      {/* Variations */}
      <EditorialVariations variations={recipe.variations} />

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px) {
          .ed-intro { grid-template-columns: 1fr !important; }
          .ed-intro > div:first-child { border-right: none !important; border-bottom: 1px solid var(--ed-border); padding: 28px 0 !important; }
          .ed-intro > div:last-child { padding: 28px 0 !important; }
        }
      `}</style>
    </div>
  );
}

export default function DisplayModeSwitcher({
  recipe,
  userPantry = [],
  serveTime,
}: DisplayModeSwitcherProps) {
  const [mode, setMode] = useState<DisplayMode>('full');
  const [cookStage, setCookStage] = useState(0);
  const [visible, setVisible] = useState(true);

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  const measureUnderline = useCallback(() => {
    const container = tabContainerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>('[data-active="true"]');
    if (!activeBtn) return;
    setUnderlineStyle({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, []);

  useEffect(() => { measureUnderline(); }, [mode, measureUnderline]);
  useEffect(() => {
    window.addEventListener('resize', measureUnderline);
    return () => window.removeEventListener('resize', measureUnderline);
  }, [measureUnderline]);

  const handleModeChange = (newMode: DisplayMode) => {
    if (newMode === mode) return;
    setVisible(false);
    setTimeout(() => {
      setMode(newMode);
      setVisible(true);
    }, 200);
  };

  const renderContent = () => {
    switch (mode) {
      case 'full':
        return <EditorialFullView recipe={recipe} />;
      case 'brief':
        return <EditorialBrief recipe={recipe} />;
      case 'cook':
        return (
          <EditorialCookMode
            recipe={recipe}
            currentStage={cookStage}
            onStageChange={setCookStage}
          />
        );
      case 'flavour-map':
        return <EditorialFlavourPanel flavour={recipe.flavour} />;
      case 'shopping':
        return <EditorialShoppingList shoppingList={recipe.shopping_list} components={recipe.components} />;
      case 'timeline':
        return <EditorialTimeline timeline={recipe.timeline} />;
      case 'riff':
        return <EditorialRiff recipe={recipe} />;
    }
  };

  return (
    <div className="editorial">
      {/* Mode tabs */}
      <div
        ref={tabContainerRef}
        style={{
          position: 'relative',
          display: 'flex',
          gap: '24px',
          marginBottom: 'var(--ed-spacing-subsection)',
          borderBottom: '1px solid var(--ed-border)',
          paddingBottom: '12px',
        }}
      >
        {MODE_TABS.map((tab) => {
          const isActive = mode === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              data-active={isActive ? 'true' : 'false'}
              onClick={() => handleModeChange(tab.value)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0 0 4px',
                cursor: 'pointer',
                fontFamily: 'var(--ed-font)',
                fontSize: 'var(--ed-fs-small)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--ed-text-primary)' : 'var(--ed-text-muted)',
                transition: 'color 200ms, font-weight 200ms',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}

        {/* Animated underline */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: underlineStyle.left,
            width: underlineStyle.width,
            height: '1px',
            background: 'var(--ed-text-primary)',
            transition: 'left 200ms ease-out, width 200ms ease-out',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Content with cross-fade */}
      <div style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease-out',
      }}>
        {renderContent()}
      </div>
    </div>
  );
}
