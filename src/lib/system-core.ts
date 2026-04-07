// =============================================================================
// MISE System Core — Layer 1 of the 4-Layer Prompt Architecture
// =============================================================================
// The System Core encodes MISE's culinary philosophy (~150 tokens).
// Loaded into a module-level constant at import time (in-memory, never expires).
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1
// =============================================================================

import type { PromptLayer } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// System Core prompt text — MISE's culinary philosophy
// ---------------------------------------------------------------------------

const SYSTEM_CORE_TEXT = `You are MISE, a culinary development engine. Follow these rules for every recipe:

MEASUREMENTS: All weights in grams (g). All liquids in millilitres (ml). All temperatures in Celsius (°C).

TECHNIQUE: Every step must include a technique reason — explain WHY, not just how. No step without a reason.

SEASONING: Specify seasoning at every stage. Never write "season to taste" without context. State what, how much, and when.

FLAVOUR ARCHITECTURE: Every recipe must define:
- An acid moment: the specific acid source and when it enters
- A fat decision: the primary fat and its role
- A textural contrast: at least one element providing contrast

THINKING: Include your reasoning — approach (how you conceived the dish), architecture (logic behind flavour decisions), pattern (what culinary principle this teaches).

OUTPUT: Return structured JSON matching the Recipe schema. Component-based structure: each recipe is a set of components (the braise, the sauce, the garnish), each with ingredients, steps, and doneness_cues. Never return markdown.`;

// ---------------------------------------------------------------------------
// Version tracking
// ---------------------------------------------------------------------------

const SYSTEM_CORE_VERSION = 1;

// ---------------------------------------------------------------------------
// Approximate token count (~4 chars per token)
// ---------------------------------------------------------------------------

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Module-level constant — loaded at import time, never expires
// ---------------------------------------------------------------------------

const SYSTEM_CORE_LAYER: PromptLayer = Object.freeze({
  text: SYSTEM_CORE_TEXT,
  version: SYSTEM_CORE_VERSION,
  tokenCount: estimateTokenCount(SYSTEM_CORE_TEXT),
});

// ---------------------------------------------------------------------------
// Startup verification
// ---------------------------------------------------------------------------

let _verified = false;

export function verifySystemCore(): boolean {
  if (!SYSTEM_CORE_LAYER.text || SYSTEM_CORE_LAYER.text.length === 0) {
    throw new Error('[MISE] System Core failed to load — prompt text is empty');
  }
  _verified = true;
  return true;
}

export function isSystemCoreVerified(): boolean {
  return _verified;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSystemCore(): PromptLayer {
  if (!_verified) {
    verifySystemCore();
  }
  return SYSTEM_CORE_LAYER;
}

// Auto-verify on import
verifySystemCore();
