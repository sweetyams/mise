'use client';

// =============================================================================
// MISE Display Mode Switcher — Seven Views from One Recipe
// =============================================================================
// Reusable component with tabs for all 7 display modes.
// Switching modes renders immediately from stored JSON — no API call.
// Requirements: 19.1, 19.9
// =============================================================================

import { useState, useMemo } from 'react';
import type { Recipe, ShoppingListView } from '@/lib/types/recipe';
import {
  renderFullRecipe,
  renderBrief,
  renderCookMode,
  renderFlavourMap,
  renderShoppingList,
  renderTimeline,
  renderRiff,
} from '@/lib/display-renderers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shopping List Renderer (structured view)
// ---------------------------------------------------------------------------

function ShoppingListDisplay({ data }: { data: ShoppingListView }) {
  return (
    <div className="space-y-6">
      {/* Quality Highlight */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
          🌟 {data.theOneThingWorthGetting}
        </p>
      </div>

      {/* Already have */}
      {data.alreadyHave.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Already in your pantry</h3>
          <p className="text-sm text-gray-400">{data.alreadyHave.join(', ')}</p>
        </div>
      )}

      {/* Sections */}
      {data.sections.map((section) => (
        <div key={section.section}>
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {section.section}
          </h3>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li
                key={item.name}
                className={`text-sm ${item.checkStock ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {item.amount} {item.unit} {item.name}
                {item.checkStock && ' ✓'}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DisplayModeSwitcher({
  recipe,
  userPantry = [],
  serveTime,
}: DisplayModeSwitcherProps) {
  const [mode, setMode] = useState<DisplayMode>('full');
  const [cookStage, setCookStage] = useState(0);

  // Memoised renders — pure functions, so safe to cache by mode
  const renderedContent = useMemo(() => {
    switch (mode) {
      case 'full':
        return renderFullRecipe(recipe);
      case 'brief':
        return renderBrief(recipe);
      case 'cook':
        return renderCookMode(recipe, cookStage);
      case 'flavour-map':
        return renderFlavourMap(recipe);
      case 'timeline':
        return renderTimeline(recipe, serveTime ?? new Date());
      case 'riff':
        return renderRiff(recipe);
      case 'shopping':
        return null; // handled separately as structured data
    }
  }, [mode, recipe, cookStage, serveTime]);

  const shoppingData = useMemo(() => {
    if (mode === 'shopping') {
      return renderShoppingList(recipe, userPantry);
    }
    return null;
  }, [mode, recipe, userPantry]);

  return (
    <div>
      {/* Mode tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setMode(tab.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === tab.value
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cook mode stage navigation */}
      {mode === 'cook' && recipe.components.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCookStage(Math.max(0, cookStage - 1))}
            disabled={cookStage === 0}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-500">
            Stage {cookStage + 1} of {recipe.components.length}
          </span>
          <button
            type="button"
            onClick={() => setCookStage(Math.min(recipe.components.length - 1, cookStage + 1))}
            disabled={cookStage >= recipe.components.length - 1}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {mode === 'shopping' && shoppingData ? (
          <ShoppingListDisplay data={shoppingData} />
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {renderedContent}
          </pre>
        )}
      </div>
    </div>
  );
}
