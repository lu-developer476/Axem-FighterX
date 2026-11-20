import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { removeSpriteBackground } from '../src/infrastructure/graphics/removeSpriteBackground.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = (...parts) => path.join(ROOT, 'art', 'source', ...parts);
const RESULTS = (...parts) => path.join(ROOT, 'art', 'source', 'sprites', 'results', ...parts);
const GENERATED = path.join(ROOT, 'public', 'generated');
const COLORS = Object.freeze({ violet: 273, orange: 22 });
const PALETTE_SOURCES = Object.freeze({
  male: [[0, 25], [335, 360]],
  female: [[300, 360]],
});
const BASE_SIZE = Object.freeze({ width: 53, height: 83 });
const TRANSPARENT = Object.freeze({ r: 0, g: 0, b: 0, alpha: 0 });

function hueMatches(hue, ranges) {
  return ranges.some(([min, max]) => hue >= min && hue <= max);
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min);

    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
  }

  return [hue, saturation, lightness];
}

function hslToRgb(hue, saturation, lightness) {
  const h = (((hue % 360) + 360) % 360) / 360;
  if (saturation === 0) {
    const gray = Math.round(lightness * 255);
    return [gray, gray, gray];
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const hueToRgb = (value) => {
    let t = value;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return [
    Math.round(hueToRgb(h + 1 / 3) * 255),
    Math.round(hueToRgb(h) * 255),
    Math.round(hueToRgb(h - 1 / 3) * 255),
  ];
}

async function recolorAndKey(input, gender, targetHue) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

  removeSpriteBackground({
    data: pixels,
    width: info.width,
    height: info.height,
  }, {
    tolerance: gender === 'male' ? 42 : 48,
    minBorderCoverage: 0.025,
  });

  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] < 16) continue;
    const [hue, saturation, lightness] = rgbToHsl(
      pixels[offset],
      pixels[offset + 1],
      pixels[offset + 2],
    );
    if (saturation < 0.28 || !hueMatches(hue, PALETTE_SOURCES[gender])) continue;
    const [red, green, blue] = hslToRgb(targetHue, saturation, lightness);
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

async function extractGifFrames(file, gender, targetHue) {
  const metadata = await sharp(file, { animated: true }).metadata();
  const pageHeight = metadata.pageHeight || metadata.height;
  const pageCount = Math.max(1, metadata.pages || 1);
  const frames = [];

  for (let page = 0; page < pageCount; page += 1) {
    const frame = await sharp(file, { page, pages: 1 }).png().toBuffer();
    frames.push(await recolorAndKey(frame, gender, targetHue));
  }

  return { frames, width: metadata.width, height: pageHeight };
}

async function makeHorizontalStrip(frames, width, height) {
  const layers = frames.map((input, index) => ({
    input,
    left: index * width,
    top: 0,
  }));
  return sharp({
    create: {
      width: Math.max(1, width * frames.length),
      height: Math.max(1, height),
      channels: 4,
      background: TRANSPARENT,
    },
  }).composite(layers).png().toBuffer();
}

async function makeVerticalAtlas(parts) {
  const metadata = await Promise.all(parts.map((input) => sharp(input).metadata()));
  const width = Math.max(...metadata.map((item) => item.width));
  const gap = 12;
  const height = metadata.reduce((sum, item) => sum + item.height, 0) + gap * (parts.length - 1);
  const layers = [];
  let top = 0;

  parts.forEach((input, index) => {
    layers.push({ input, left: 0, top });
    top += metadata[index].height + gap;
  });

  return sharp({
    create: { width, height, channels: 4, background: TRANSPARENT },
  }).composite(layers).png().toBuffer();
}

async function buildGender(gender) {
  for (const [color, targetHue] of Object.entries(COLORS)) {
    const parts = [];
    let baseSource;

    if (gender === 'male') {
      const redReference = SOURCE('sprites', 'references', 'axem-red');
      for (const file of ['preview.png', 'preview (2).png']) {
        parts.push(await recolorAndKey(path.join(redReference, file), gender, targetHue));
      }

      const run = await extractGifFrames(SOURCE('axem-ranger-run.gif'), gender, targetHue);
      const bike = await extractGifFrames(SOURCE('axem-ranger-bike.gif'), gender, targetHue);
      const doubleAxe = await extractGifFrames(SOURCE('axem-ranger-double-axe.gif'), gender, targetHue);
      parts.push(await makeHorizontalStrip(run.frames, run.width, run.height));
      parts.push(await makeHorizontalStrip(bike.frames, bike.width, bike.height));
      parts.push(await makeHorizontalStrip(doubleAxe.frames, doubleAxe.width, doubleAxe.height));
      baseSource = run.frames[0];
    } else {
      const pinkReference = SOURCE('sprites', 'references', 'axem-pink');
      for (const file of [
        'axem-pink-spritesheet.png',
        'axem-pink-pose.png',
        'axem-pink-battle-pose.png',
        'axem-pink-levitate.png',
      ]) {
        parts.push(await recolorAndKey(path.join(pinkReference, file), gender, targetHue));
      }
      baseSource = parts[1];
    }

    const atlas = await makeVerticalAtlas(parts);
    const resultsDirectory = RESULTS(gender);
    await fs.mkdir(resultsDirectory, { recursive: true });
    const atlasPath = path.join(resultsDirectory, 'axem-ranger-' + color + '.png');
    await fs.writeFile(atlasPath, atlas);

    const basePath = path.join(GENERATED, 'ranger-' + gender + '-' + color + '.png');
    const baseSprite = await sharp(baseSource)
      .trim({ background: TRANSPARENT, threshold: 1 })
      .resize(BASE_SIZE.width, BASE_SIZE.height, {
        fit: 'contain',
        kernel: 'nearest',
        background: TRANSPARENT,
      })
      .png()
      .toBuffer();
    await fs.writeFile(basePath, baseSprite);

    console.log('Generado ' + path.relative(ROOT, atlasPath));
    console.log('Generado ' + path.relative(ROOT, basePath));
  }
}

async function main() {
  await fs.mkdir(GENERATED, { recursive: true });
  await buildGender('male');
  await buildGender('female');
}

main().catch((error) => {
  console.error('No se pudieron preparar las hojas de Axem Rangers:', error);
  process.exitCode = 1;
});
