// =============================================================================
// MISE Complexity Modes — Shared Configuration
// =============================================================================
// Three complexity modes: Foundation (learning), Kitchen (default), Riff
// (architecture only). Prompt instructions extracted here for shared use
// between prompt-assembler and UI.
// Requirements: 20.1, 20.2, 20.3, 20.4, 20.7, 20.8
// =============================================================================

import type { ComplexityMode } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Prompt instructions per mode (used by prompt-assembler)
// ---------------------------------------------------------------------------

export const COMPLEXITY_INSTRUCTIONS: Record<ComplexityMode, string> = {
  foundation: `COMPLEXITY MODE: Foundation (Learning)
- Provide extra explanation at each step
- Include doneness cues at every stage
- Use conservative seasoning amounts
- Proactively suggest substitutions for uncommon ingredients
- Explain technique reasons in detail`,

  kitchen: `COMPLEXITY MODE: Kitchen (Professional)
- Professional but approachable tone
- Standard detail level
- Assume competent home cook`,

  riff: `COMPLEXITY MODE: Riff (Architecture Only)
- Provide architecture and intention only
- No precise amounts — use ratios and feel
- Minimal step-by-step instructions
- Focus on flavour logic and technique principles`,
};

// ---------------------------------------------------------------------------
// UI configuration per mode
// ---------------------------------------------------------------------------

export interface ComplexityModeConfig {
  value: ComplexityMode;
  label: string;
  description: string;
}

export const COMPLEXITY_MODE_OPTIONS: ComplexityModeConfig[] = [
  {
    value: 'foundation',
    label: 'Foundation',
    description: 'Learning mode — extra explanation, doneness cues at every stage, conservative seasoning',
  },
  {
    value: 'kitchen',
    label: 'Kitchen',
    description: 'Professional but approachable — the default for everyday cooking',
  },
  {
    value: 'riff',
    label: 'Riff',
    description: 'Architecture only — for experienced cooks who want the idea, not the prescription',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isValidComplexityMode(mode: string): mode is ComplexityMode {
  return mode === 'foundation' || mode === 'kitchen' || mode === 'riff';
}

export function getComplexityLabel(mode: ComplexityMode): string {
  const config = COMPLEXITY_MODE_OPTIONS.find((c) => c.value === mode);
  return config?.label ?? 'Kitchen';
}
