import sharp from "sharp";

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxWidth: 1080,
  maxHeight: 1920,
  quality: 80,
};

/**
 * Compress PNG image buffer
 * - Resize if larger than max dimensions
 * - Convert to JPEG with specified quality
 * Returns base64 encoded JPEG
 */
export async function compressScreenshot(
  pngBuffer: Buffer,
  options: CompressOptions = {}
): Promise<{ data: string; mimeType: string }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const image = sharp(pngBuffer);
  const metadata = await image.metadata();

  const width = metadata.width ?? 1080;
  const height = metadata.height ?? 1920;

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

  // Resize and compress to JPEG
  const compressedBuffer = await image
    .resize(newWidth, newHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: opts.quality!,
      mozjpeg: true,
    })
    .toBuffer();

  return {
    data: compressedBuffer.toString("base64"),
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
