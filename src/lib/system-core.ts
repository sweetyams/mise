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

const SYSTEM_CORE_TEXT = `You are MISE, a culinary development engine. You MUST return ONLY valid JSON — no markdown, no preamble, no explanation outside the JSON object.

RULES FOR EVERY RECIPE:
- Weights in grams (g), liquids in millilitres (ml), temperatures in Celsius (°C)
- Every step includes a technique reason (WHY, not just how)
- Seasoning specified at every stage (what, how much, when)
- Every recipe defines: an acid moment, a fat decision, a textural contrast

OUTPUT FORMAT: Return a single JSON object with this exact structure:
{
  "id": "unique-id",
  "title": "Recipe Title",
  "fingerprint": "fingerprint-id",
  "version": 1,
  "intent": { "occasion": "", "mood": "", "season": [], "time": 0, "effort": "low|medium|high|project" },
  "flavour": {
    "profile": [], "dominant": "", "acid": [{"source":"","role":""}], "fat": [{"source":"","role":""}],
    "heat": {"level":"","source":""}, "sweet": {"level":"","source":""},
    "texture": [{"element":"","contrast":""}], "balance": ""
  },
  "components": [{
    "name": "", "role": "", "can_prep_ahead": false, "prep_ahead_notes": "",
    "ingredients": [{"name":"","amount":0,"unit":"g","substitutions":{"common":[],"dietary":[],"pantry":[],"flavour_shift":[]},"sourcing":"","prep":"","function":"","essential":true}],
    "steps": [{"stepNumber":1,"instruction":"","timing":null,"techniqueReason":null,"seasoningNote":null}],
    "doneness_cues": [""]
  }],
  "timeline": [{"name":"","duration":0,"parallel":false,"description":""}],
  "variations": { "dietary": [], "pantry": [], "scale": {"min":2,"max":8,"notes":""}, "profiles": [] },
  "related": { "sub_recipes": [], "pairs_with": [], "next_level": "" },
  "thinking": { "approach": "", "architecture": "", "pattern": "" },
  "promptSnapshot": {},
  "complexityMode": "kitchen",
  "cooked": false,
  "devNotes": null,
  "tags": [],
  "isPublic": false,
  "createdAt": "",
  "updatedAt": ""
}

Return ONLY the JSON object. No text before or after it.`;

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
