// =============================================================================
// MISE Decision Lock Assembler — Layer 4 of the 5-Layer Prompt Architecture
// =============================================================================
// Assembles the Decision Lock text block from a fingerprint's decision_lock
// template. Pure function with no side effects.
// =============================================================================

import type { DecisionLockQuestion } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssembledDecisionLock {
  text: string;
  questionCount: number;
  tokenEstimate: number;
}

// ---------------------------------------------------------------------------
// assembleDecisionLock — builds the Decision Lock text for the user message
// ---------------------------------------------------------------------------

export function assembleDecisionLock(
  questions: DecisionLockQuestion[] | undefined,
  dishDescription: string
): AssembledDecisionLock {
  if (!questions || questions.length === 0) {
    return { text: '', questionCount: 0, tokenEstimate: 0 };
  }

  const numberedQuestions = questions
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join('\n');

  const text = [
    'DECISION LOCK — Answer each question below before generating the recipe.',
    'Your answers are BINDING. The recipe MUST reflect every answer.',
    'Where your answers conflict with generic conventions for this dish, your answers take precedence.',
    '',
    `For: ${dishDescription}`,
    '',
    numberedQuestions,
    '',
    'Output your answers in a ## Decision Lock Answers section with numbered Q&A pairs.',
    'Then generate the recipe. Your recipe must honour every answer above.',
  ].join('\n');

  return {
    text,
    questionCount: questions.length,
    tokenEstimate: Math.ceil(text.length / 4),
  };
}
