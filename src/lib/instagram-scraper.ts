// =============================================================================
// MISE Instagram Scraper — Extract post content from public Instagram URLs
// =============================================================================
// Fetches the public embed/oembed page for an Instagram post and extracts
// the caption text and any image URLs. Does NOT require Instagram API access.
// =============================================================================

export interface ScrapedPost {
  caption: string;
  imageUrls: string[];
  authorName: string | null;
  postUrl: string;
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

const INSTAGRAM_URL_PATTERN =
  /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels)\/[\w-]+\/?/;

export function isValidInstagramUrl(url: string): boolean {
  return INSTAGRAM_URL_PATTERN.test(url.trim());
}

/**
 * Normalize an Instagram URL to its canonical form.
 * Strips query params and trailing slashes, ensures /p/ or /reel/ format.
 */
function normalizeUrl(url: string): string {
  const parsed = new URL(url.trim());
  // Remove query params and hash
  return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`;
}

// ---------------------------------------------------------------------------
// Scraping strategies
// ---------------------------------------------------------------------------

/**
 * Strategy 1: Use Instagram's oEmbed endpoint (no auth required for public posts).
 * Returns HTML with caption embedded. Rate-limited but reliable.
 */
async function fetchViaOEmbed(postUrl: string): Promise<ScrapedPost | null> {
  const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(postUrl)}`;

  const response = await fetch(oembedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
    html?: string;
  };

  const caption = data.title || '';
  const imageUrls: string[] = [];

  if (data.thumbnail_url) {
    imageUrls.push(data.thumbnail_url);
  }

  return {
    caption,
    imageUrls,
    authorName: data.author_name || null,
    postUrl,
  };
}

/**
 * Strategy 2: Fetch the post page directly and extract from meta tags.
 * Fallback if oEmbed is rate-limited.
 */
async function fetchViaMetaTags(postUrl: string): Promise<ScrapedPost | null> {
  const response = await fetch(postUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return null;

  const html = await response.text();

  // Extract og:description (usually the caption)
  const descriptionMatch = html.match(
    /<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"/ 
  ) || html.match(
    /content="([^"]*?)"\s+(?:property|name)="og:description"/
  );

  // Extract og:image
  const imageMatch = html.match(
    /<meta\s+(?:property|name)="og:image"\s+content="([^"]*)"/ 
  ) || html.match(
    /content="([^"]*?)"\s+(?:property|name)="og:image"/
  );

  const caption = descriptionMatch?.[1]
    ? decodeHtmlEntities(descriptionMatch[1])
    : '';

  const imageUrls: string[] = [];
  if (imageMatch?.[1]) {
    imageUrls.push(decodeHtmlEntities(imageMatch[1]));
  }

  // Try to find author from title or og:title
  const titleMatch = html.match(
    /<meta\s+(?:property|name)="og:title"\s+content="([^"]*)"/
  );
  const authorName = titleMatch?.[1]?.split(' on Instagram')?.[0] || null;

  if (!caption && imageUrls.length === 0) return null;

  return {
    caption,
    imageUrls,
    authorName,
    postUrl,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Scrape an Instagram post. Tries oEmbed first, falls back to meta tag extraction.
 * Throws on invalid URLs. Returns null if both strategies fail.
 */
export async function scrapeInstagramPost(url: string): Promise<ScrapedPost | null> {
  if (!isValidInstagramUrl(url)) {
    throw new Error(`Invalid Instagram URL: ${url}`);
  }

  const normalizedUrl = normalizeUrl(url);

  // Try oEmbed first (most reliable)
  const oembedResult = await fetchViaOEmbed(normalizedUrl).catch(() => null);
  if (oembedResult && oembedResult.caption) {
    return oembedResult;
  }

  // Fallback to direct page scrape
  const metaResult = await fetchViaMetaTags(normalizedUrl).catch(() => null);
  if (metaResult) {
    return metaResult;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\\n/g, '\n')
    .replace(/\\u0026/g, '&');
}
