// =============================================================================
// MISE Image Downloader — Fetch images as base64 for Claude Vision API
// =============================================================================
// Downloads image URLs and converts them to base64 data URIs suitable for
// the Anthropic Vision API content blocks.
// =============================================================================

export interface DownloadedImage {
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  url: string;
}

// Supported media types for Claude Vision
const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// Max image size (20MB per Anthropic docs)
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

// Max images to process per post (avoid hitting token limits)
const MAX_IMAGES = 5;

/**
 * Infer media type from Content-Type header or URL extension.
 */
function inferMediaType(
  contentType: string | null,
  url: string
): DownloadedImage['mediaType'] | null {
  // Try Content-Type header first
  if (contentType) {
    const normalized = contentType.split(';')[0].trim().toLowerCase();
    if (SUPPORTED_TYPES.has(normalized)) {
      return normalized as DownloadedImage['mediaType'];
    }
  }

  // Fallback to URL extension
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      // Instagram images are almost always JPEG
      return 'image/jpeg';
  }
}

/**
 * Download a single image and convert to base64.
 * Returns null if the download fails or the image is unsupported/too large.
 */
async function downloadSingleImage(url: string): Promise<DownloadedImage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.warn(`[MISE Image] Failed to download: ${url} (${response.status})`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    const mediaType = inferMediaType(contentType, url);
    if (!mediaType) {
      console.warn(`[MISE Image] Unsupported type: ${contentType} for ${url}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      console.warn(`[MISE Image] Too large: ${buffer.byteLength} bytes for ${url}`);
      return null;
    }

    const base64 = Buffer.from(buffer).toString('base64');

    return { base64, mediaType, url };
  } catch (err) {
    console.warn(`[MISE Image] Download error for ${url}:`, err);
    return null;
  }
}

/**
 * Download multiple images in parallel, up to MAX_IMAGES.
 * Skips failed downloads silently.
 */
export async function downloadImages(urls: string[]): Promise<DownloadedImage[]> {
  const toDownload = urls.slice(0, MAX_IMAGES);

  const results = await Promise.allSettled(
    toDownload.map((url) => downloadSingleImage(url))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<DownloadedImage> =>
        r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value);
}

/**
 * Convert downloaded images to Anthropic Vision API content blocks.
 */
export function toVisionContentBlocks(
  images: DownloadedImage[]
): Array<{
  type: 'image';
  source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string };
}> {
  return images.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mediaType,
      data: img.base64,
    },
  }));
}
