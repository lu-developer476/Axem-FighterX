import { mkdir, stat } from 'node:fs/promises';
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

  return { result, sourceMetadata };
}

async function main() {
  await mkdir(publicDirectory, { recursive: true });

  // Process sequentially to keep peak memory usage low when decoding animated frames.
  const gif = await generateGif();
  const png = await generatePng();

  const [gifFile, pngFile] = await Promise.all([stat(gifOutput), stat(pngOutput)]);

  console.log(
    `Favicons generated at ${iconSize}x${iconSize}: ` +
    `GIF ${gif.result.pages} frames (${formatBytes(gifFile.size)}) / ` +
    `PNG (${formatBytes(pngFile.size)}).`,
  );
}

main().catch((error) => {
  console.error('Unable to generate favicons:', error);
  process.exitCode = 1;
});
