// =============================================================================
// MISE Prompt Assembler — Hot Path for Recipe Generation
// =============================================================================
// Fetches all 4 prompt layers in parallel, assembles them, and streams the
// generation response. Uses layered fingerprint assembly when full_profile
// exists, falls back to flat prompt_text.
// =============================================================================

import type {
  AssembledPrompt,
  ComplexityMode,
  PromptLayer,
  PromptSnapshot,
} from '@/lib/types/recipe';
import type { FingerprintRecipeContext } from '@/lib/types/fingerprint-profile';
import { getSystemCore } from '@/lib/system-core';
import { getFingerprint, getFingerprintBySlug } from '@/lib/fingerprint-cache';
import { assembleFingerprint, assembleFlatFingerprint } from '@/lib/fingerprint-loader';
import { getCachedBrain } from '@/lib/brain-compiler';
import { assembleDecisionLock } from '@/lib/decision-lock-assembler';
import { createAIProvider } from '@/lib/ai-provider';
import { COMPLEXITY_INSTRUCTIONS } from '@/lib/complexity-modes';

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
  recentRecipes?: string[];
  // Hints for fingerprint layer selection
  techniques?: string[];
  ingredients?: string[];
  region?: string;
}

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// buildRequestContext — constructs Layer 4 from UI state
// ---------------------------------------------------------------------------

function buildRequestContext(ctx: RequestContext): string {
  const parts: string[] = [ctx.dishDescription];
  if (ctx.occasion) parts.push(`Occasion: ${ctx.occasion}`);
  if (ctx.mood) parts.push(`Mood: ${ctx.mood}`);
  if (ctx.season) parts.push(`Season: ${ctx.season}`);
  if (ctx.servings) parts.push(`Servings: ${ctx.servings}`);
  if (ctx.constraints?.length) parts.push(`Constraints: ${ctx.constraints.join(', ')}`);

  // Anti-repetition: tell the model what this user has already generated
  if (ctx.recentRecipes?.length) {
    parts.push('');
    parts.push('ALREADY GENERATED (do NOT repeat these — create something distinctly different in concept, technique, and flavour architecture):');
    for (const title of ctx.recentRecipes) {
      parts.push(`  × ${title}`);
    }
  }

  // Variety seed — ensures different output each generation even for identical inputs
  parts.push(`Generation seed: ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
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
  // Resolve fingerprint — try UUID first, fall back to slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fingerprintId);
  const fingerprintPromise = isUUID
    ? getFingerprint(fingerprintId)
    : getFingerprintBySlug(fingerprintId);

  // Fetch layers 1-3 in parallel
  const [systemCore, fingerprint, brain] = await Promise.all([
    Promise.resolve(getSystemCore()),
    fingerprintPromise,
    getCachedBrain(userId),
  ]);

  // Build Layer 2 (Fingerprint) — use layered assembly if full_profile exists
  let fingerprintLayer: PromptLayer;

  if (fingerprint?.fullProfile && fingerprint.fullProfile.identity_core) {
    const fpContext: FingerprintRecipeContext = {
      techniques: requestContext.techniques,
      ingredients: requestContext.ingredients,
      season: requestContext.season,
      region: requestContext.region,
      needsVoice: true,
    };
    const assembled = assembleFingerprint(fingerprint.fullProfile, fpContext);
    fingerprintLayer = {
      text: assembled.text,
      version: fingerprint.version,
      tokenCount: assembled.tokenEstimate,
    };
  } else if (fingerprint) {
    const assembled = assembleFlatFingerprint(fingerprint.promptText);
    fingerprintLayer = {
      text: assembled.text,
      version: fingerprint.version,
      tokenCount: assembled.tokenEstimate,
    };
  } else {
    fingerprintLayer = { text: '', version: 0, tokenCount: 0 };
  }

  // Build Layer 3 (Chef Brain)
  const brainLayer: PromptLayer = brain
    ? { text: brain.promptText, version: brain.version, tokenCount: estimateTokens(brain.promptText) }
    : { text: '', version: 0, tokenCount: 0 };

  // Build Layer 4 (Decision Lock) — from fingerprint's decision_lock questions
  const decisionLockQuestions = fingerprint?.fullProfile?.decision_lock;
  const decisionLock = assembleDecisionLock(decisionLockQuestions, requestContext.dishDescription);
  const decisionLockLayer: PromptLayer = {
    text: decisionLock.text,
    version: 1,
    tokenCount: decisionLock.tokenEstimate,
  };

  if (decisionLockLayer.text) {
    console.log('[MISE] Decision Lock:', decisionLock.questionCount, 'questions |', decisionLock.tokenEstimate, 'tokens');
  }

  // Build Layer 5 (Request Context)
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

  // User message: Decision Lock (if present) + Request Context
  const userMessage = decisionLockLayer.text
    ? decisionLockLayer.text + '\n\n' + requestLayer.text
    : requestLayer.text;

  return {
    systemPrompt: systemParts.join('\n\n'),
    userMessage,
    layers: {
      systemCore,
      fingerprint: fingerprintLayer,
      chefBrain: brainLayer,
      decisionLock: decisionLockLayer,
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
  const assembled = await assemblePrompt(userId, fingerprintId, requestContext, complexityMode);
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
  const { systemCore, fingerprint, chefBrain, decisionLock, requestContext } = assembled.layers;
  const totalInputTokens = systemCore.tokenCount + fingerprint.tokenCount + chefBrain.tokenCount + decisionLock.tokenCount + requestContext.tokenCount;
  const estimatedCost = (totalInputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;

  return {
    systemCore,
    fingerprint: { ...fingerprint, fingerprintId, fingerprintName },
    chefBrain: { ...chefBrain, userId },
    decisionLock,
    requestContext,
    totalInputTokens,
    totalOutputTokens: outputTokens,
    estimatedCost: Math.round(estimatedCost * 1_000_000) / 1_000_000,
    assembledAt: new Date().toISOString(),
  };
}
