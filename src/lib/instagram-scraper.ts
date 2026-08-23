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
 * Build a ScrapingBee proxied URL if API key is available.
 * Falls back to direct fetch if not configured.
 */
function buildFetchUrl(targetUrl: string, opts?: { renderJs?: boolean }): { url: string; headers: Record<string, string> } {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (apiKey) {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: targetUrl,
      render_js: opts?.renderJs ? 'true' : 'false',
      premium_proxy: 'true',
    });
    return {
      url: `https://app.scrapingbee.com/api/v1/?${params.toString()}`,
      headers: {},
    };
  }

  // Fallback: direct fetch (may be blocked by Instagram)
  return {
    url: targetUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  };
}

/**
 * Strategy 1: Use Instagram's oEmbed endpoint.
 * Returns HTML with caption embedded. Works well through proxies.
 */
async function fetchViaOEmbed(postUrl: string): Promise<ScrapedPost | null> {
  const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(postUrl)}`;
  const { url, headers } = buildFetchUrl(oembedUrl);

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) return null;

  const text = await response.text();
  let data: {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
    html?: string;
  };

  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

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
 * Fallback if oEmbed is rate-limited. Uses ScrapingBee for reliable access.
 */
async function fetchViaMetaTags(postUrl: string): Promise<ScrapedPost | null> {
  const { url, headers } = buildFetchUrl(postUrl);

  const response = await fetch(url, {
    headers: {
      ...headers,
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
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
