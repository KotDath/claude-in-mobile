import { Jimp } from "jimp";

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxWidth: 800,    // Safe for API limit of 2000px
  maxHeight: 1400,  // Safe for API limit of 2000px
  quality: 70,
  maxSizeBytes: 1024 * 1024, // 1MB max for base64 (safe margin for API)
};

/**
 * Compress PNG image buffer
 * - Resize if larger than max dimensions
 * - Convert to JPEG with specified quality
 * - Iteratively reduce quality if still too large
 * Returns base64 encoded JPEG
 */
export async function compressScreenshot(
  pngBuffer: Buffer,
  options: CompressOptions = {}
): Promise<{ data: string; mimeType: string }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const image = await Jimp.read(pngBuffer);
  const width = image.width;
  const height = image.height;

  // Calculate new dimensions maintaining aspect ratio
  let newWidth = width;
  let newHeight = height;

  if (width > opts.maxWidth! || height > opts.maxHeight!) {
    const widthRatio = opts.maxWidth! / width;
    const heightRatio = opts.maxHeight! / height;
    const ratio = Math.min(widthRatio, heightRatio);

    newWidth = Math.round(width * ratio);
    newHeight = Math.round(height * ratio);
  }

  // Resize if needed
  if (newWidth !== width || newHeight !== height) {
    image.resize({ w: newWidth, h: newHeight });
  }

  // Convert to JPEG with iterative quality reduction if needed
  let quality = opts.quality!;
  let jpegBuffer: Buffer;
  let attempts = 0;
  const maxAttempts = 5;

  do {
    jpegBuffer = await image.getBuffer("image/jpeg", { quality });

    // Check if size is within limit
    if (jpegBuffer.length <= opts.maxSizeBytes!) {
      break;
    }

    // Reduce quality and try again
    quality = Math.max(20, quality - 15);
    attempts++;
  } while (attempts < maxAttempts);

  // If still too large after quality reduction, resize further
  if (jpegBuffer.length > opts.maxSizeBytes!) {
    const scaleFactor = Math.sqrt(opts.maxSizeBytes! / jpegBuffer.length) * 0.9;
    const smallerWidth = Math.round(newWidth * scaleFactor);
    const smallerHeight = Math.round(newHeight * scaleFactor);

    image.resize({ w: smallerWidth, h: smallerHeight });
    jpegBuffer = await image.getBuffer("image/jpeg", { quality: 50 });
  }

  return {
    data: jpegBuffer.toString("base64"),
    mimeType: "image/jpeg",
  };
}

/**
 * Get original image as base64 PNG (no compression)
 */
export function toBase64Png(buffer: Buffer): { data: string; mimeType: string } {
  return {
    data: buffer.toString("base64"),
    mimeType: "image/png",
  };
}
