import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PICKUP_ASSET_STANDARD } from '../src/infrastructure/assets/pickupAssetStandard.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PICKUP_DIRECTORY = path.join(ROOT, 'art/source/pickups');
const CHECK_ONLY = process.argv.includes('--check');
const { canvas, artwork } = PICKUP_ASSET_STANDARD;

function visibleBounds(data, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < artwork.visibleAlphaThreshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }

  return right < left || bottom < top
    ? null
    : { left, top, right, bottom, width: right - left, height: bottom - top };
}

function hasTransparentMargin(data, width, height) {
  const padding = artwork.minTransparentPadding;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= padding && x < width - padding &&
          y >= padding && y < height - padding) continue;
      if (data[(y * width + x) * 4 + 3] !== 0) return false;
    }
  }
  return true;
}

function hasCleanArtworkBounds(data, width, height, bounds) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= bounds.left && x < bounds.right &&
          y >= bounds.top && y < bounds.bottom) continue;
      if (data[(y * width + x) * 4 + 3] !== 0) return false;
    }
  }
  return true;
}

function isStandard(metadata, bounds, data) {
  if (!bounds || metadata.width !== canvas.width || metadata.height !== canvas.height) return false;
  if (bounds.width > artwork.maxWidth || bounds.height > artwork.maxHeight) return false;
  if (bounds.left < artwork.minTransparentPadding || bounds.top < artwork.minTransparentPadding) return false;
  if (canvas.width - bounds.right < artwork.minTransparentPadding ||
      canvas.height - bounds.bottom < artwork.minTransparentPadding) return false;
  if (Math.abs((bounds.left + bounds.right) / 2 - canvas.width / 2) > artwork.centeringTolerance ||
      Math.abs((bounds.top + bounds.bottom) / 2 - canvas.height / 2) > artwork.centeringTolerance) return false;
  return hasTransparentMargin(data, canvas.width, canvas.height) &&
    hasCleanArtworkBounds(data, canvas.width, canvas.height, bounds);
}

async function standardizeFile(filename) {
  const metadata = await sharp(filename).metadata();
  if (metadata.format !== canvas.format || !metadata.hasAlpha) {
    throw new Error(
      path.relative(ROOT, filename) +
      ' debe ser PNG RGBA con transparencia real. No se elimina un fondo opaco automáticamente.',
    );
  }

  const { data, info } = await sharp(filename)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparentPixels = 0;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] === 0) transparentPixels += 1;
  }
  if (!transparentPixels) {
    throw new Error(path.relative(ROOT, filename) + ' no contiene píxeles transparentes.');
  }

  const bounds = visibleBounds(data, info.width, info.height);
  if (!bounds) throw new Error(path.relative(ROOT, filename) + ' no contiene arte visible.');

  if (isStandard(metadata, bounds, data)) return false;
  if (CHECK_ONLY) {
    throw new Error(path.relative(ROOT, filename) + ' no cumple el estándar de pickups.');
  }

  const scale = Math.min(
    artwork.maxWidth / bounds.width,
    artwork.maxHeight / bounds.height,
  );
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  const left = Math.floor((canvas.width - width) / 2);
  const top = Math.floor((canvas.height - height) / 2);

  const resizedArtwork = await sharp(filename)
    .ensureAlpha()
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
    .resize({
      width,
      height,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer();

  const normalized = await sharp({
    create: {
      width: canvas.width,
      height: canvas.height,
      channels: canvas.channels,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedArtwork, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(filename, normalized);
  console.log(
    'Pickup normalizado:',
    path.relative(ROOT, filename),
    info.width + 'x' + info.height,
    '->',
    canvas.width + 'x' + canvas.height,
  );
  return true;
}

const files = (await fs.readdir(PICKUP_DIRECTORY, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
  .map((entry) => path.join(PICKUP_DIRECTORY, entry.name))
  .sort();

if (!files.length) throw new Error('No se encontraron PNG en art/source/pickups/.');

let changed = 0;
for (const filename of files) {
  if (await standardizeFile(filename)) changed += 1;
}

console.log(
  CHECK_ONLY
    ? 'Todos los pickups cumplen el estándar.'
    : changed
      ? changed + ' pickup(s) normalizado(s).'
      : 'Los pickups ya cumplen el estándar.',
);
