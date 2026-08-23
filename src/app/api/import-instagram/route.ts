// =============================================================================
// MISE Import Instagram API — POST /api/import-instagram
// =============================================================================
// Accepts an Instagram URL, scrapes the post, calls Claude to extract a
// structured recipe, and saves it to the user's library.
// Supports both caption-based and image-based (Vision) extraction.
// Auth: Bearer token (IMPORT_API_TOKEN) or Supabase session.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { scrapeInstagramPost, isValidInstagramUrl } from '@/lib/instagram-scraper';
import {
  RECIPE_IMPORT_SYSTEM_PROMPT,
  RECIPE_IMPORT_VISION_PROMPT,
  buildImportUserMessage,
  buildVisionUserMessage,
} from '@/lib/recipe-import-prompt';
import { downloadImages, toVisionContentBlocks } from '@/lib/image-downloader';

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

// Captions shorter than this are considered "image-only" posts
const MIN_CAPTION_LENGTH = 80;

// ---------------------------------------------------------------------------
// Helper: log a failed import attempt for retry
// ---------------------------------------------------------------------------

type SupabaseClient = ReturnType<typeof createServiceClient>;

async function logFailedAttempt(
  supabase: SupabaseClient,
  userId: string,
  sourceUrl: string,
  method: 'text' | 'vision',
  errorMessage: string
): Promise<void> {
  try {
    await supabase.from('import_attempts').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      source: 'instagram',
      source_url: sourceUrl,
      status: 'failed',
      method,
      error_message: errorMessage,
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal — don't block the response
  }
}

// ---------------------------------------------------------------------------
// Auth helper — supports bearer token (iOS Shortcut) or session (web UI)
// ---------------------------------------------------------------------------

async function authenticateRequest(request: NextRequest): Promise<{ valid: boolean; userId?: string }> {
  // Strategy 1: Bearer token (iOS Shortcut / external callers)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = process.env.IMPORT_API_TOKEN;
    if (!token) {
      console.error('[MISE Import] IMPORT_API_TOKEN not configured');
      return { valid: false };
    }
    const provided = authHeader.slice(7);
    if (provided === token) {
      return { valid: true };
    }
    return { valid: false };
  }

  // Strategy 2: Supabase session (web UI)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return { valid: true, userId: user.id };
  }

  return { valid: false };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const auth = await authenticateRequest(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse request body
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: 'Missing "url" field' }, { status: 400 });
  }

  if (!isValidInstagramUrl(url)) {
    return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 });
  }

  // 3. Scrape the Instagram post
  let scraped;
  try {
    scraped = await scrapeInstagramPost(url);
  } catch (err) {
    console.error('[MISE Import] Scrape error:', err);
    return NextResponse.json({ error: 'Failed to scrape Instagram post' }, { status: 502 });
  }

  if (!scraped) {
    return NextResponse.json(
      { error: 'Could not extract content from this post. It may be private.' },
      { status: 422 }
    );
  }

  // 4. Resolve the user and set up service client (needed for error logging too)
  const supabase = createServiceClient();
  let userId: string;

  if (auth.userId) {
    userId = auth.userId;
  } else {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json({ error: 'ADMIN_EMAIL not configured' }, { status: 500 });
    }
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }
    userId = userData.id;
  }

  // 5. Call Claude to extract recipe
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey });
  const captionIsShort = !scraped.caption || scraped.caption.length < MIN_CAPTION_LENGTH;
  const hasImages = scraped.imageUrls.length > 0;

  // Decide extraction strategy: vision (images) or text (caption)
  const useVision = hasImages && captionIsShort;

  let recipeJson: Record<string, unknown>;

  try {
    if (useVision) {
      // --- Vision path: download images and send to Claude ---
      console.log(`[MISE Import] Using vision path for ${url} (${scraped.imageUrls.length} images)`);
      const images = await downloadImages(scraped.imageUrls);

      if (images.length === 0) {
        return NextResponse.json(
          { error: 'Could not download images from this post.' },
          { status: 422 }
        );
      }

      const imageBlocks = toVisionContentBlocks(images);
      const textMessage = buildVisionUserMessage({
        caption: scraped.caption,
        authorName: scraped.authorName,
        imageCount: images.length,
      });

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: RECIPE_IMPORT_VISION_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              ...imageBlocks,
              { type: 'text', text: textMessage },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
      }
      recipeJson = JSON.parse(textBlock.text);
    } else {
      // --- Text path: use caption ---
      if (!scraped.caption) {
        return NextResponse.json(
          { error: 'No caption or images could be extracted from this post.' },
          { status: 422 }
        );
      }

      console.log(`[MISE Import] Using text path for ${url}`);
      const userMessage = buildImportUserMessage({
        caption: scraped.caption,
        authorName: scraped.authorName,
      });

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: RECIPE_IMPORT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
      }
      recipeJson = JSON.parse(textBlock.text);
    }
  } catch (err) {
    console.error('[MISE Import] Claude error:', err);
    // Log failed attempt for retry
    await logFailedAttempt(supabase, userId, url, useVision ? 'vision' : 'text', 'AI extraction failed');
    return NextResponse.json({ error: 'AI extraction failed' }, { status: 502 });
  }

  // Check if Claude indicated no recipe found
  if ('error' in recipeJson) {
    await logFailedAttempt(supabase, userId, url, useVision ? 'vision' : 'text', recipeJson.error as string);
    return NextResponse.json(
      { error: recipeJson.error as string, source_url: url },
      { status: 422 }
    );
  }

  // 6. Log import attempt
  const attemptId = crypto.randomUUID();
  await supabase.from('import_attempts').insert({
    id: attemptId,
    user_id: userId,
    source: 'instagram',
    source_url: url,
    status: 'processing',
    method: useVision ? 'vision' : 'text',
    attempts: 1,
    last_attempt_at: new Date().toISOString(),
  });

  // 7. Save recipe to database
  const id = crypto.randomUUID();
  const title = (recipeJson.title as string) || 'Imported Recipe';

  const insertPayload = {
    id,
    user_id: userId,
    title,
    version: 1,
    source: 'instagram',
    source_url: url,
    intent: recipeJson.intent ?? {},
    flavour: recipeJson.flavour ?? {},
    components: recipeJson.components ?? [],
    timeline: recipeJson.timeline ?? [],
    variations: recipeJson.variations ?? { dietary: [], pantry: [], scale: { min: 2, max: 8, notes: '' }, profiles: [] },
    related: recipeJson.related ?? { sub_recipes: [], pairs_with: [], next_level: '' },
    thinking: recipeJson.thinking ?? {},
    prompt_used: {
      source: 'instagram-import',
      source_url: url,
      author: scraped.authorName,
      method: useVision ? 'vision' : 'text',
      imported_at: new Date().toISOString(),
    },
    complexity_mode: 'kitchen' as const,
    cooked: false,
    dev_notes: `Imported from Instagram: ${url}\nAuthor: ${scraped.authorName || 'Unknown'}\nMethod: ${useVision ? 'Vision (image OCR)' : 'Text (caption)'}\n\n---\nOriginal caption:\n${scraped.caption || '(no caption)'}`,
    tags: JSON.stringify(['imported', 'instagram']),
    is_public: false,
  };

  const { error: dbError } = await supabase.from('recipes').insert(insertPayload);

  if (dbError) {
    console.error('[MISE Import] DB save failed:', dbError.message);
    // Mark attempt as failed
    await supabase.from('import_attempts')
      .update({ status: 'failed', error_message: dbError.message, updated_at: new Date().toISOString() })
      .eq('id', attemptId);
    return NextResponse.json({ error: 'Failed to save recipe', detail: dbError.message }, { status: 500 });
  }

  // Mark attempt as successful
  await supabase.from('import_attempts')
    .update({ status: 'success', recipe_id: id, updated_at: new Date().toISOString() })
    .eq('id', attemptId);

  // 8. Return success
  return NextResponse.json({
    success: true,
    id,
    title,
    source_url: url,
    author: scraped.authorName,
    method: useVision ? 'vision' : 'text',
  });
}
