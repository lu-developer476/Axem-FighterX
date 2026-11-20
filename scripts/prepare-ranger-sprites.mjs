import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { removeSpriteBackground } from '../src/infrastructure/graphics/removeSpriteBackground.js';
import { layoutSequence } from '../src/infrastructure/assets/atlasFrameDetection.js';
import { ATLAS_SEQUENCE_ROLES, ATLAS_SOURCES } from '../src/infrastructure/assets/atlasLayoutRules.js';

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
const MENU_SIZE = Object.freeze({ width: 78, height: 112 });
const MENU_POSE_REFERENCES = Object.freeze([
  SOURCE('sprites', 'results', 'male', 'preview (1).png'),
  SOURCE('sprites', 'references', 'axem-red', 'axem-red-spritesheet.png'),
]);
const TRANSPARENT = Object.freeze({ r: 0, g: 0, b: 0, alpha: 0 });
const ATLAS_FRAMES_PATH = path.join(ROOT, 'src', 'infrastructure', 'assets', 'atlasFrames.json');

async function writeResult(gender, color, relativePath, buffer) {
  const target = path.join(RESULTS(gender, color), relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  console.log('Generado ' + path.relative(ROOT, target));
}

/**
 * Una tira por grupo de cuadros de la hoja masculina. Todas las celdas de una
 * tira miden lo mismo y los pies quedan sobre la misma línea, de modo que Violet
 * y Orange comparten exactamente los mismos cuadros y solo cambia la paleta.
 */
async function writeMaleSequences(color, recoloredSheet, groups) {
  const index = [];
  for (const group of groups) {
    const { cellWidth, cellHeight, placements } = layoutSequence(group.frames, { anchor: 'feet' });
    const layers = await Promise.all(group.frames.map(async (frame, position) => ({
      input: await sharp(recoloredSheet)
        .extract({ left: frame.x, top: frame.y, width: frame.w, height: frame.h })
        .png()
        .toBuffer(),
      left: position * cellWidth + placements[position].x,
      top: placements[position].y,
    })));
    const strip = await sharp({
      create: { width: cellWidth * group.frames.length, height: cellHeight, channels: 4, background: TRANSPARENT },
    }).composite(layers).png().toBuffer();

    await writeResult('male', color, path.join('sequences', group.id + '.png'), strip);
    index.push({
      id: group.id,
      role: ATLAS_SEQUENCE_ROLES.male[group.id] ?? null,
      file: group.id + '.png',
      frameCount: group.frames.length,
      cellWidth,
      cellHeight,
      anchor: 'feet',
    });
  }
  await writeResult('male', color, path.join('sequences', 'index.json'), Buffer.from(JSON.stringify(index, null, 1) + '\n'));
}

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

async function recolorAndKey(input, gender, targetHue, toleranceOverride) {
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
    tolerance: toleranceOverride ?? (gender === 'male' ? 42 : 48),
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

/**
 * Every GIF frame uses one fixed 53×83 cell. Do not trim each frame:
 * weapons and effects may extend beyond the body and must not shrink the ranger.
 */
async function writeMaleAnimation(frames, rangerId, action) {
  const normalized = await Promise.all(frames.map((frame) =>
    sharp(frame)
      .resize(BASE_SIZE.width, BASE_SIZE.height, {
        fit: 'fill',
        kernel: 'nearest',
        background: TRANSPARENT,
      })
      .png()
      .toBuffer()
  ));
  const strip = await makeHorizontalStrip(normalized, BASE_SIZE.width, BASE_SIZE.height);
  const outputPath = path.join(GENERATED, 'axem-' + rangerId + '-' + action + '.png');
  await fs.writeFile(outputPath, strip);
  console.log('Generada animación ' + path.relative(ROOT, outputPath));
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

/**
 * Localiza figuras separadas dentro de una referencia ya procesada.
 * Descarta motas, efectos y piezas demasiado pequeñas para ser una pose.
 */
function findSpriteComponents(data, width, height) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Uint32Array(total);
  const components = [];

  for (let start = 0; start < total; start += 1) {
    if (visited[start] || data[start * 4 + 3] < 24) continue;

    let head = 0;
    let tail = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (x > 0) {
        const next = index - 1;
        if (!visited[next] && data[next * 4 + 3] >= 24) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (x + 1 < width) {
        const next = index + 1;
        if (!visited[next] && data[next * 4 + 3] >= 24) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (y > 0) {
        const next = index - width;
        if (!visited[next] && data[next * 4 + 3] >= 24) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (y + 1 < height) {
        const next = index + width;
        if (!visited[next] && data[next * 4 + 3] >= 24) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    const boundsWidth = maxX - minX + 1;
    const boundsHeight = maxY - minY + 1;
    const density = tail / (boundsWidth * boundsHeight);
    if (
      tail >= 180 &&
      boundsWidth >= 12 &&
      boundsHeight >= 28 &&
      boundsHeight / boundsWidth >= 0.48 &&
      density >= 0.035
    ) {
      components.push({
        left: minX,
        top: minY,
        width: boundsWidth,
        height: boundsHeight,
        area: tail,
      });
    }
  }

  components.sort((a, b) => b.area - a.area);
  const selected = [];
  for (const component of components) {
    const overlaps = selected.some((other) =>
      component.left < other.left + other.width &&
      component.left + component.width > other.left &&
      component.top < other.top + other.height &&
      component.top + component.height > other.top
    );
    if (!overlaps) selected.push(component);
    if (selected.length === 2) break;
  }
  return selected;
}

/** Prioriza las dos poses independientes de la referencia masculina indicada. */
async function findMenuPoseReference() {
  for (const file of MENU_POSE_REFERENCES) {
    try {
      const { data, info } = await sharp(file)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
      removeSpriteBackground({
        data: pixels,
        width: info.width,
        height: info.height,
      }, {
        tolerance: 48,
        minBorderCoverage: 0.025,
      });

      const poses = findSpriteComponents(pixels, info.width, info.height);
      if (poses.length >= 2) return { file, poses, width: info.width, height: info.height };
    } catch (error) {
      if (file === MENU_POSE_REFERENCES[MENU_POSE_REFERENCES.length - 1]) throw error;
    }
  }

  throw new Error(
    'No se encontraron dos poses masculinas separadas en las referencias de Axem Red.'
  );
}

/** Genera dos retratos laterales distintos desde las poses de Axem Red. */
async function buildMenuMalePoses() {
  const { file, poses, width: sourceWidth, height: sourceHeight } = await findMenuPoseReference();
  await fs.mkdir(GENERATED, { recursive: true });

  for (const [index, [color, targetHue]] of Object.entries(COLORS).entries()) {
    const recolored = await recolorAndKey(file, 'male', targetHue);
    const bounds = poses[index];
    const padding = 4;
    const left = Math.max(0, Math.min(sourceWidth - 1, bounds.left - padding));
    const top = Math.max(0, Math.min(sourceHeight - 1, bounds.top - padding));
    const width = Math.max(1, Math.min(sourceWidth - left, bounds.width + padding * 2));
    const height = Math.max(1, Math.min(sourceHeight - top, bounds.height + padding * 2));
    const output = await sharp(recolored)
      .extract({ left, top, width, height })
      .resize(MENU_SIZE.width, MENU_SIZE.height, {
        fit: 'contain',
        kernel: 'nearest',
        background: TRANSPARENT,
      })
      .png()
      .toBuffer();
    const outputPath = path.join(GENERATED, 'menu-ranger-male-' + color + '.png');
    await fs.writeFile(outputPath, output);
    console.log('Generada pose lateral ' + path.relative(ROOT, outputPath));
  }
}

async function buildGender(gender) {
  for (const [color, targetHue] of Object.entries(COLORS)) {
    const parts = [];
    let baseSource;

    if (gender === 'male') {
      // Use the actual checked-in Axem Red reference; legacy preview filenames are absent.
      const redReference = SOURCE('sprites', 'references', 'axem-red', 'axem-red-spritesheet.png');
      // El atlas Red trae ruido de compresión: con tolerancia 42 queda un halo verdoso.
      parts.push(await recolorAndKey(redReference, gender, targetHue, ATLAS_SOURCES.male.tolerance));

      const run = await extractGifFrames(SOURCE('axem-ranger-run.gif'), gender, targetHue);
      const bike = await extractGifFrames(SOURCE('axem-ranger-bike.gif'), gender, targetHue);
      const doubleAxe = await extractGifFrames(SOURCE('axem-ranger-double-axe.gif'), gender, targetHue);
      parts.push(await makeHorizontalStrip(run.frames, run.width, run.height));
      parts.push(await makeHorizontalStrip(bike.frames, bike.width, bike.height));
      parts.push(await makeHorizontalStrip(doubleAxe.frames, doubleAxe.width, doubleAxe.height));
      await writeResult(gender, color, 'spritesheet.png', parts[0]);
      await writeResult(gender, color, 'run.png', parts[1]);
      await writeResult(gender, color, 'bike.png', parts[2]);
      await writeResult(gender, color, 'double-axe.png', parts[3]);
      const manifest = JSON.parse(await fs.readFile(ATLAS_FRAMES_PATH, 'utf8'));
      await writeMaleSequences(color, parts[0], manifest.male.groups);
      await writeMaleAnimation(run.frames, color, 'run');
      await writeMaleAnimation(bike.frames, color, 'bike');
      await writeMaleAnimation(doubleAxe.frames, color, 'double-axe');
      baseSource = run.frames[0];
    } else {
      const pinkReference = SOURCE('sprites', 'references', 'axem-pink');
      for (const file of [
        'axem-pink-spritesheet.png',
        'axem-pink-pose.png',
        'axem-pink-battle-pose.png',
        'axem-pink-levitate.png',
      ]) {
        const recolored = await recolorAndKey(path.join(pinkReference, file), gender, targetHue);
        parts.push(recolored);
        await writeResult(gender, color, file.replace(/^axem-pink-/, ''), recolored);
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
  await buildMenuMalePoses();
}

main().catch((error) => {
  console.error('No se pudieron preparar las hojas de Axem Rangers:', error);
  process.exitCode = 1;
});
