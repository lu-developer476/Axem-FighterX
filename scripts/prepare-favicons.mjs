import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.join(projectRoot, 'art', 'source');
const publicDirectory = path.join(projectRoot, 'public');

const iconSize = 48;
const transparentBackground = { r: 0, g: 0, b: 0, alpha: 0 };
const resizeOptions = {
  width: iconSize,
  height: iconSize,
  fit: 'contain',
  background: transparentBackground,
  kernel: sharp.kernel.lanczos3,
};

const pngSource = path.join(sourceDirectory, 'favicon.png');
const gifSource = path.join(sourceDirectory, 'favicon.gif');
const pngOutput = path.join(publicDirectory, 'favicon.png');
const gifOutput = path.join(publicDirectory, 'favicon.gif');

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function generatePng() {
  const result = await sharp(pngSource, { failOn: 'error' })
    .resize(resizeOptions)
    .png({
      compressionLevel: 9,
      effort: 10,
      palette: true,
      quality: 100,
    })
    .toFile(pngOutput);

  if (result.width !== iconSize || result.height !== iconSize) {
    throw new Error(`PNG favicon dimensions invalid: ${result.width}x${result.height}`);
  }

  return result;
}

async function generateGif() {
  const sourceMetadata = await sharp(gifSource, { animated: true, failOn: 'error' }).metadata();

  if (sourceMetadata.format !== 'gif' || !sourceMetadata.pages || sourceMetadata.pages < 2) {
    throw new Error('art/source/favicon.gif must be a valid animated GIF with at least two frames.');
  }

  const gifOptions = {
    effort: 10,
    loop: sourceMetadata.loop ?? 0,
    keepDuplicateFrames: true,
    interFrameMaxError: 4,
    interPaletteMaxError: 8,
  };

  // Keep the original frame timings when the source provides them.
  if (Array.isArray(sourceMetadata.delay) && sourceMetadata.delay.length > 0) {
    gifOptions.delay = sourceMetadata.delay;
  }

  const result = await sharp(gifSource, { animated: true, failOn: 'error' })
    .resize(resizeOptions)
    .gif(gifOptions)
    .toFile(gifOutput);

  if (result.width !== iconSize || result.pageHeight !== iconSize || result.pages < 2) {
    throw new Error(
      `Animated GIF output invalid: ${result.width}x${result.pageHeight}, ${result.pages} frame(s)`,
    );
  }

  return result;
}

async function main() {
  await mkdir(publicDirectory, { recursive: true });

  // Generate the static fallback first so a bad GIF never breaks the app build.
  const png = await generatePng();

  let gif = null;
  try {
    // Process after the PNG to keep memory usage low while decoding animated frames.
    gif = await generateGif();
  } catch (error) {
    // Remove a stale output from a previous build so the browser can fall back to PNG.
    await rm(gifOutput, { force: true });
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`Animated favicon unavailable; using PNG fallback. ${reason}`);
  }

  const pngFile = await stat(pngOutput);
  const gifFile = gif ? await stat(gifOutput) : null;

  console.log(
    `Favicons generated at ${iconSize}x${iconSize}: ` +
    `PNG (${formatBytes(pngFile.size)}) / ` +
    (gif
      ? `GIF ${gif.pages} frames (${formatBytes(gifFile.size)}).`
      : 'GIF unavailable; PNG fallback is ready.'),
  );
}

main().catch((error) => {
  console.error('Unable to generate the PNG favicon fallback:', error);
  process.exitCode = 1;
});
