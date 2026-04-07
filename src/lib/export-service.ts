// =============================================================================
// MISE Export Service — PDF and Markdown Export
// =============================================================================
// Renders recipes as formatted HTML (V1 PDF) and Markdown from structured
// Recipe JSON. V1: basic formatting. V2: styled HTML via Puppeteer.
// Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
// =============================================================================

import type { Recipe, Component } from '@/lib/types/recipe';
import { renderFullRecipe } from '@/lib/display-renderers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportOptions {
  format: 'pdf' | 'markdown';
  displayMode?: 'full' | 'brief' | 'shopping_list';
  includeScaling?: boolean;
  servings?: number;
  branding?: { name: string; businessName?: string };
}

// ---------------------------------------------------------------------------
// Tier check helper
// ---------------------------------------------------------------------------

export function canExport(tier: string): boolean {
  return tier !== 'free';
}

export function canUseBranding(tier: string): boolean {
  return tier === 'creator' || tier === 'brigade';
}

// ---------------------------------------------------------------------------
// exportRecipeAsPdf — V1: generate a printable HTML string
// ---------------------------------------------------------------------------

export function exportRecipeAsPdf(
  recipe: Recipe,
  options: ExportOptions
): string {
  const brandingHtml = options.branding
    ? `<div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #ddd;padding-bottom:12px;">
        <p style="font-size:18px;font-weight:bold;margin:0;">${escapeHtml(options.branding.name)}</p>
        ${options.branding.businessName ? `<p style="font-size:14px;color:#666;margin:4px 0 0;">${escapeHtml(options.branding.businessName)}</p>` : ''}
      </div>`
    : '';

  const servingsNote = options.servings
    ? `<p style="color:#666;font-size:14px;">Servings: ${options.servings}</p>`
    : '';

  const componentsHtml = recipe.components
    .map((comp) => renderComponentHtml(comp))
    .join('');

  const thinkingHtml = recipe.thinking
    ? `<div style="margin-top:24px;padding:16px;background:#f9f9f9;border-radius:8px;">
        <h2 style="font-size:18px;margin:0 0 8px;">The Thinking</h2>
        <p style="font-size:13px;margin:4px 0;"><strong>Approach:</strong> ${escapeHtml(recipe.thinking.approach)}</p>
        <p style="font-size:13px;margin:4px 0;"><strong>Architecture:</strong> ${escapeHtml(recipe.thinking.architecture)}</p>
        <p style="font-size:13px;margin:4px 0;"><strong>Pattern:</strong> ${escapeHtml(recipe.thinking.pattern)}</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(recipe.title)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 700px; margin: 0 auto; padding: 32px; color: #333; }
    h1 { font-size: 28px; margin-bottom: 4px; }
    h2 { font-size: 20px; margin-top: 24px; }
    h3 { font-size: 16px; margin-top: 16px; }
    ul, ol { padding-left: 20px; }
    li { margin-bottom: 4px; font-size: 14px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 16px; }
  </style>
</head>
<body>
  ${brandingHtml}
  <h1>${escapeHtml(recipe.title)}</h1>
  <p class="meta">
    ${escapeHtml(recipe.intent.occasion)} · ${escapeHtml(recipe.intent.mood)} · ${recipe.intent.time} min · ${escapeHtml(recipe.intent.effort)}
  </p>
  ${servingsNote}
  ${componentsHtml}
  ${thinkingHtml}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// exportRecipeAsMarkdown — well-structured Markdown
// ---------------------------------------------------------------------------

export function exportRecipeAsMarkdown(
  recipe: Recipe,
  options?: ExportOptions
): string {
  const lines: string[] = [];

  // Branding header
  if (options?.branding) {
    lines.push(`> ${options.branding.name}${options.branding.businessName ? ` — ${options.branding.businessName}` : ''}`);
    lines.push('');
  }

  // Use the full recipe renderer as the base
  lines.push(renderFullRecipe(recipe));

  // Append serving size if specified
  if (options?.servings) {
    lines.push('');
    lines.push(`---`);
    lines.push(`Servings: ${options.servings}`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderComponentHtml(comp: Component): string {
  const ingredientsList = comp.ingredients
    .map(
      (ing) =>
        `<li>${ing.amount} ${escapeHtml(ing.unit)} ${escapeHtml(ing.name)}${ing.prep ? ` <em>(${escapeHtml(ing.prep)})</em>` : ''}</li>`
    )
    .join('');

  const stepsList = comp.steps
    .map((step) => {
      let html = `<li>${escapeHtml(step.instruction)}`;
      if (step.timing) html += ` <em>(${escapeHtml(step.timing)})</em>`;
      html += '</li>';
      return html;
    })
    .join('');

  const donenessCues =
    comp.doneness_cues.length > 0
      ? `<p style="font-size:13px;color:#555;margin-top:8px;"><strong>Doneness cues:</strong> ${comp.doneness_cues.map(escapeHtml).join('; ')}</p>`
      : '';

  return `
  <h2>${escapeHtml(comp.name)} <span style="font-weight:normal;color:#888;font-size:14px;">(${escapeHtml(comp.role)})</span></h2>
  ${comp.can_prep_ahead ? `<p style="font-size:13px;color:#555;"><em>Prep ahead: ${escapeHtml(comp.prep_ahead_notes)}</em></p>` : ''}
  <h3>Ingredients</h3>
  <ul>${ingredientsList}</ul>
  <h3>Steps</h3>
  <ol>${stepsList}</ol>
  ${donenessCues}`;
}
