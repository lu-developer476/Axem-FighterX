import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { normalizeSpriteFrame } from '../src/infrastructure/graphics/normalizeSpriteFrame.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RULES_PATH = path.join(ROOT, 'art', 'source', 'sprites', 'processing-rules.json');
const rules = JSON.parse(await fs.readFile(RULES_PATH, 'utf8'));
const RESULTS_ROOT = path.join(ROOT, 'art', 'source', 'sprites', rules.processedPolicy.directory);
const EXTENSIONS = new Set(rules.processedPolicy.extensions);
const BACKGROUND_OPTIONS = rules.processedPolicy.backgroundRemoval;

async function listImages(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listImages(absolute));
    else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolute);
    }
  }
  return files;
}

function countTransparentPixels(data) {
  let count = 0;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] === 0) count += 1;
  }
  return count;
}

async function normalizePng(file) {
  const original = await fs.readFile(file);
  const metadata = await sharp(original, { failOn: 'error' }).metadata();
  const { data, info } = await sharp(original, { failOn: 'error' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const result = normalizeSpriteFrame(
    { data: pixels, width: info.width, height: info.height },
    BACKGROUND_OPTIONS,
  );

  let output = original;
  if (result.changed) {
    output = await sharp(Buffer.from(pixels), {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    await fs.writeFile(file, output);
  }

  const verified = await sharp(output, { failOn: 'error' }).metadata();
  if (
    !verified.hasAlpha ||
    verified.width !== metadata.width ||
    verified.height !== metadata.height
  ) {
    throw new Error('Falló la verificación alfa/dimensiones de ' + path.relative(ROOT, file));
  }

  return {
    frames: 1,
    changed: result.changed,
    removedPixels: result.removedPixels,
    transparentPixels: result.transparentPixelsAfter,
    width: metadata.width,
    height: metadata.height,
  };
}

async function normalizeGif(file) {
  const original = await fs.readFile(file);
  const metadata = await sharp(original, { failOn: 'error' }).metadata();
  const { data, info } = await sharp(original, { animated: true, failOn: 'error' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pages = info.pages ?? metadata.pages ?? 1;
  const pageHeight = info.pageHeight ?? metadata.pageHeight ?? Math.floor(info.height / pages);
  const stackedHeight = pageHeight * pages;

  if (
    pages < 1 ||
    stackedHeight !== info.height ||
    data.length !== info.width * stackedHeight * 4
  ) {
    throw new Error('No se pudo separar cada fotograma de ' + path.relative(ROOT, file));
  }

  let changed = false;
  let removedPixels = 0;
  let transparentPixels = 0;
  const frameLength = info.width * pageHeight * 4;

  for (let page = 0; page < pages; page += 1) {
    const offset = page * frameLength;
    const frame = new Uint8ClampedArray(data.buffer, data.byteOffset + offset, frameLength);
    const result = normalizeSpriteFrame(
      { data: frame, width: info.width, height: pageHeight },
      BACKGROUND_OPTIONS,
    );
    changed ||= result.changed;
    removedPixels += result.removedPixels;
    transparentPixels += result.transparentPixelsAfter;
  }

  let output = original;
  if (changed) {
    const delays = Array.isArray(metadata.delay) ? metadata.delay : undefined;
    output = await sharp(Buffer.from(data), {
      raw: {
        width: info.width,
        height: stackedHeight,
        channels: 4,
        pageHeight,
      },
    })
      .gif({
        loop: metadata.loop ?? 0,
        ...(delays ? { delay: delays } : {}),
        effort: 10,
        dither: 0,
        interFrameMaxError: 0,
        interPaletteMaxError: 0,
        keepDuplicateFrames: true,
      })
      .toBuffer();
    await fs.writeFile(file, output);
  }

  const verified = await sharp(output, { animated: true, failOn: 'error' }).metadata();
  if (
    verified.format !== 'gif' ||
    !verified.hasAlpha ||
    verified.width !== metadata.width ||
    verified.pageHeight !== pageHeight ||
    verified.pages !== pages
  ) {
    throw new Error('Falló la verificación de transparencia o animación de ' + path.relative(ROOT, file));
  }

  return {
    frames: pages,
    changed,
    removedPixels,
    transparentPixels,
    width: metadata.width,
    height: pageHeight,
  };
}

async function main() {
  const files = await listImages(RESULTS_ROOT);
  if (!files.length) {
    throw new Error('No se encontraron sprites en ' + path.relative(ROOT, RESULTS_ROOT));
  }

  let changedFiles = 0;
  let frameCount = 0;
  let removedPixels = 0;

  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    const result = extension === '.gif'
      ? await normalizeGif(file)
      : await normalizePng(file);
    frameCount += result.frames;
    removedPixels += result.removedPixels;
    if (result.changed) changedFiles += 1;

    console.log(
      path.relative(ROOT, file) +
      ': transparencia validada; ' + result.width + 'x' + result.height +
      (result.frames > 1 ? ' por cuadro · ' + result.frames + ' cuadros' : '') +
      (result.changed ? ' · fondo eliminado ' + result.removedPixels + ' px' : ' · sin cambios'),
    );
  }

  console.log(
    'Biblioteca de sprites verificada: ' + files.length + ' archivos, ' +
    frameCount + ' cuadros, ' + changedFiles + ' archivos normalizados y ' +
    removedPixels + ' píxeles de fondo eliminados.',
  );
}

main().catch((error) => {
  console.error('No se pudo aplicar la regla global de sprites:', error);
  process.exitCode = 1;
});
