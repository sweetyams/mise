// =============================================================================
// MISE Prompt Assembler — Hot Path for Recipe Generation
// =============================================================================
// Fetches all 4 prompt layers in parallel, assembles them, and streams the
// generation response. Never hits Postgres directly (only memory and Redis).
// Requirements: 5.1, 5.2, 5.3, 5.15, 5.16, 6.6, 20.2, 20.3, 20.4
// =============================================================================

import type {
  AssembledPrompt,
  ComplexityMode,
  PromptLayer,
  PromptSnapshot,
} from '@/lib/types/recipe';
import { getSystemCore } from '@/lib/system-core';
import { getFingerprint } from '@/lib/fingerprint-cache';
import { getCachedBrain } from '@/lib/brain-compiler';
import { createAIProvider } from '@/lib/ai-provider';

// ---------------------------------------------------------------------------
// Request context — built from UI state (Layer 4)
// ---------------------------------------------------------------------------

export interface RequestContext {
  dishDescription: string;
  occasion?: string;
  mood?: string;
  season?: string;
  servings?: number;
  constraints?: string[];
}

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Complexity mode instructions
// ---------------------------------------------------------------------------

const COMPLEXITY_INSTRUCTIONS: Record<ComplexityMode, string> = {
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
// buildRequestContext — constructs Layer 4 from UI state
// ---------------------------------------------------------------------------

function buildRequestContext(ctx: RequestContext): string {
  const parts: string[] = [ctx.dishDescription];

  if (ctx.occasion) parts.push(`Occasion: ${ctx.occasion}`);
  if (ctx.mood) parts.push(`Mood: ${ctx.mood}`);
  if (ctx.season) parts.push(`Season: ${ctx.season}`);
  if (ctx.servings) parts.push(`Servings: ${ctx.servings}`);
  if (ctx.constraints && ctx.constraints.length > 0) {
    parts.push(`Constraints: ${ctx.constraints.join(', ')}`);
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// assemblePrompt — parallel fetch of all 4 layers
// ---------------------------------------------------------------------------

export async function assemblePrompt(
  userId: string,
  fingerprintId: string,
  requestContext: RequestContext,
  complexityMode: ComplexityMode = 'kitchen'
): Promise<AssembledPrompt> {
  // Fetch layers 1-3 in parallel
  const [systemCore, fingerprint, brain] = await Promise.all([
    Promise.resolve(getSystemCore()),
    getFingerprint(fingerprintId),
    getCachedBrain(userId),
  ]);

  // Build Layer 2 (Fingerprint)
  const fingerprintLayer: PromptLayer = fingerprint
    ? {
        text: fingerprint.promptText,
        version: fingerprint.version,
        tokenCount: estimateTokens(fingerprint.promptText),
      }
    : { text: '', version: 0, tokenCount: 0 };

  // Build Layer 3 (Chef Brain)
  const brainLayer: PromptLayer = brain
    ? {
        text: brain.promptText,
        version: brain.version,
        tokenCount: estimateTokens(brain.promptText),
      }
    : { text: '', version: 0, tokenCount: 0 };

  // Build Layer 4 (Request Context)
  const requestText = buildRequestContext(requestContext);
  const requestLayer: PromptLayer = {
    text: requestText,
    version: 1,
    tokenCount: estimateTokens(requestText),
  };

  // Join layers 1-3 as system prompt with complexity mode
  const systemParts = [systemCore.text];
  if (fingerprintLayer.text) systemParts.push(fingerprintLayer.text);
  if (brainLayer.text) systemParts.push(brainLayer.text);
  systemParts.push(COMPLEXITY_INSTRUCTIONS[complexityMode]);

  const systemPrompt = systemParts.join('\n\n');
  const userMessage = requestLayer.text;

  return {
    systemPrompt,
    userMessage,
    layers: {
      systemCore,
      fingerprint: fingerprintLayer,
      chefBrain: brainLayer,
      requestContext: requestLayer,
    },
  };
}

// ---------------------------------------------------------------------------
// generateRecipe — assemble prompt → stream via AI Provider
// ---------------------------------------------------------------------------

export async function generateRecipe(
  userId: string,
  fingerprintId: string,
  requestContext: RequestContext,
  complexityMode: ComplexityMode = 'kitchen'
): Promise<ReadableStream<string>> {
  const assembled = await assemblePrompt(
    userId,
    fingerprintId,
    requestContext,
    complexityMode
  );

  const provider = await createAIProvider();
  return provider.generateRecipe(assembled.systemPrompt, assembled.userMessage);
}

// ---------------------------------------------------------------------------
// buildPromptSnapshot — capture all 4 layers for reproducibility
// ---------------------------------------------------------------------------

export function buildPromptSnapshot(
  assembled: AssembledPrompt,
  outputTokens: number,
  fingerprintId: string,
  fingerprintName: string,
  userId: string
): PromptSnapshot {
  const { systemCore, fingerprint, chefBrain, requestContext } = assembled.layers;

  const totalInputTokens =
    systemCore.tokenCount +
    fingerprint.tokenCount +
    chefBrain.tokenCount +
    requestContext.tokenCount;

  // Cost estimate: Sonnet pricing ~$3/M input, ~$15/M output
  const estimatedCost =
    (totalInputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;

  return {
    systemCore,
    fingerprint: {
      ...fingerprint,
      fingerprintId,
      fingerprintName,
    },
    chefBrain: {
      ...chefBrain,
      userId,
    },
    requestContext,
    totalInputTokens,
    totalOutputTokens: outputTokens,
    estimatedCost: Math.round(estimatedCost * 1_000_000) / 1_000_000, // 6 decimal places
    assembledAt: new Date().toISOString(),
  };
}
