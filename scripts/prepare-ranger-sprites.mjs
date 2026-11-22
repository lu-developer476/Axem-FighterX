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
const ASSET_STANDARDS = JSON.parse(await fs.readFile(SOURCE('sprites', 'asset-standards.json'), 'utf8'));
const COLORS = Object.freeze({ violet: 273, orange: 22 });
const PALETTE_SOURCES = Object.freeze({
  male: [[0, 25], [335, 360]],
  female: [[300, 360]],
});
// Estas salidas femeninas contienen correcciones manuales de paleta validadas.
// Se preservan desde el repositorio para que pretest/prebuild no las regenere
// desde Axem Pink y sobrescriba los ajustes de Orange y Violet.
const FEMALE_PRESERVED_PALETTE_ASSETS = new Set(['spritesheet.png']);
const BASE_SIZE = Object.freeze({ width: ASSET_STANDARDS.categories.combatTexture.width, height: ASSET_STANDARDS.categories.combatTexture.height });
const ACTION_GIF_SIZE = Object.freeze({ width: ASSET_STANDARDS.categories.actionGif.width, height: ASSET_STANDARDS.categories.actionGif.height });
const SEQUENCE_GIF_SCALE = 1.75;
const SEQUENCE_GIF_FEET_MARGIN = 4;
/** Altura visible estándar del personaje de pie, común a todas las animaciones masculinas. */
const STANDARD_STANDING_HEIGHT = 78;
const MENU_SIZE = Object.freeze({ width: ASSET_STANDARDS.categories.menuPortrait.width, height: ASSET_STANDARDS.categories.menuPortrait.height });
const TRANSPARENT = Object.freeze({ r: 0, g: 0, b: 0, alpha: 0 });
const ATLAS_FRAMES_PATH = path.join(ROOT, 'src', 'infrastructure', 'assets', 'atlasFrames.json');
const KI_AURA_SHEET_PATH = path.join(
  ROOT, 'art', 'source', 'effects', 'dragon-ball-style', 'super-saiyan-aura.webp',
);
const KI_AURA_GRID = Object.freeze({ columns: 2, rows: 2, cellWidth: 64, cellHeight: 64 });
const KI_AURA_HOLD_DELAY = 180;

async function writeResult(gender, color, relativePath, buffer) {
  const target = path.join(RESULTS(gender, color), relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  console.log('Generado ' + path.relative(ROOT, target));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
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
      anchorX: Math.max(...group.frames.map((frame) => frame.pivotX ?? Math.round(frame.w / 2))),
      anchor: 'feet',
    });
  }
  await writeResult('male', color, path.join('sequences', 'index.json'), Buffer.from(JSON.stringify(index, null, 1) + '\n'));
  return index;
}

/**
 * Exporta las siluetas y poses masculinas fuera de las 14 secuencias.
 * Cada recurso ocupa una celda propia en una tira compacta por renglón.
 */
async function writeMaleSupplemental(color, recoloredSheet, groups) {
  const outputDirectory = RESULTS('male', color, 'supplemental');
  await fs.rm(outputDirectory, { recursive: true, force: true });
  const index = [];

  for (const group of groups) {
    const { cellWidth, cellHeight, placements } = layoutSequence(group.assets, { anchor: 'center' });
    const layers = await Promise.all(group.assets.map(async (asset, position) => ({
      input: await sharp(recoloredSheet)
        .extract({ left: asset.x, top: asset.y, width: asset.w, height: asset.h })
        .png()
        .toBuffer(),
      left: position * cellWidth + placements[position].x,
      top: placements[position].y,
    })));
    const strip = await sharp({
      create: {
        width: cellWidth * group.assets.length,
        height: cellHeight,
        channels: 4,
        background: TRANSPARENT,
      },
    }).composite(layers).png().toBuffer();

    await writeResult('male', color, path.join('supplemental', group.id + '.png'), strip);
    index.push({
      id: group.id,
      row: group.row,
      role: group.role,
      file: group.id + '.png',
      assetCount: group.assets.length,
      cellWidth,
      cellHeight,
      sourceBounds: group.bounds,
      assets: group.assets.map((asset, position) => ({
        position,
        sourceRegion: asset.index,
        bounds: [asset.x, asset.y, asset.w, asset.h],
      })),
    });
  }

  await writeResult(
    'male',
    color,
    path.join('supplemental', 'index.json'),
    Buffer.from(JSON.stringify(index, null, 1) + '\n'),
  );
  return index;
}


/**
 * Exporta las siete franjas de Axem Pink sin convertirlas en animaciones
 * artificiales: cada PNG conserva el ancho completo del atlas y todos los
 * píxeles comprendidos entre los extremos de sus regiones asignadas.
 */
/**
 * Exporta cada región femenina como una celda independiente, agrupada por la
 * fila original del atlas. Las poses forman sequences/group-XX; efectos, armas,
 * íconos y siluetas se conservan aparte en supplemental/group-XX.
 */
async function writeFemaleStrip(color, recoloredSheet, frames, relativePath) {
  if (!frames.length) return null;
  const { cellWidth, cellHeight, placements } = layoutSequence(frames, { anchor: 'center' });
  const layers = await Promise.all(frames.map(async (frame, position) => ({
    input: await sharp(recoloredSheet)
      .extract({ left: frame.x, top: frame.y, width: frame.w, height: frame.h })
      .png()
      .toBuffer(),
    left: position * cellWidth + placements[position].x,
    top: placements[position].y,
  })));
  const strip = await sharp({
    create: { width: cellWidth * frames.length, height: cellHeight, channels: 4, background: TRANSPARENT },
  }).composite(layers).png().toBuffer();
  await writeResult('female', color, relativePath, strip);
  return { frameCount: frames.length, cellWidth, cellHeight };
}

async function writeFemaleSequences(color, recoloredSheet, groups) {
  const index = [];
  for (const group of groups) {
    const sequencePath = path.join(RESULTS('female', color), 'sequences', group.id + '.png');
    const supplementalPath = path.join(RESULTS('female', color), 'supplemental', group.id + '.png');
    const sequenceLayout = await writeFemaleStrip(
      color, recoloredSheet, group.frames, path.join('sequences', group.id + '.png'),
    );
    const supplementalLayout = await writeFemaleStrip(
      color, recoloredSheet, group.assets, path.join('supplemental', group.id + '.png'),
    );
    if (!sequenceLayout) await fs.rm(sequencePath, { force: true });
    if (!supplementalLayout) await fs.rm(supplementalPath, { force: true });

    index.push({
      id: group.id,
      row: group.row,
      role: group.role,
      sequence: sequenceLayout ? {
        file: group.id + '.png',
        ...sequenceLayout,
        frames: group.frames.map((frame, position) => ({
          position,
          sourceRegion: frame.regionIndex,
          ...(frame.segment !== undefined ? { segment: frame.segment } : {}),
          ...(frame.splitFrom !== undefined ? { splitFrom: frame.splitFrom } : {}),
          bounds: [frame.x, frame.y, frame.w, frame.h],
          ...(frame.review ? { review: frame.review } : {}),
        })),
      } : null,
      supplemental: supplementalLayout ? {
        file: group.id + '.png',
        ...supplementalLayout,
        items: group.assets.map((asset, position) => ({
          position,
          sourceRegion: asset.regionIndex,
          bounds: [asset.x, asset.y, asset.w, asset.h],
          ...(asset.review ? { review: asset.review } : {}),
        })),
      } : null,
      frameCount: group.frameCount,
      assetCount: group.assetCount,
      regionCount: group.regionCount,
      reviewCount: group.reviewCount,
      regionIndices: group.regionIndices,
    });
  }

  await writeResult(
    'female', color, path.join('sequences', 'index.json'),
    Buffer.from(JSON.stringify(index, null, 1) + '\n'),
  );
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


function hueDistance(left, right) {
  const distance = Math.abs(left - right) % 360;
  return Math.min(distance, 360 - distance);
}

function isMaleHairPixel(red, green, blue) {
  const [hue, saturation, lightness] = rgbToHsl(red, green, blue);
  return hue >= 24 && hue <= 80 && saturation >= 0.20 && lightness >= 0.12;
}

/**
 * Conserva el cabello negro y aplica mechas californianas marrones solo en las
 * puntas de los mechones dorados identificados junto a la cabeza. La distancia
 * geodésica desde la raíz evita teñir casco, armadura, armas o efectos.
 */
function shadeMaleHairWithBrownTips(pixels, width, height, targetHue) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const componentQueue = new Uint32Array(total);
  const distanceQueue = new Uint32Array(total);
  const distances = new Int32Array(total);
  let blackPixels = 0;
  let brownPixels = 0;

  // El cabello rubio puede quedar separado del casco/cara en algunas poses.
  // Por eso no se exige proximidad a la máscara de cabeza: se recorren todos
  // los componentes del tono rubio de la hoja, pose por pose.
  for (let start = 0; start < total; start += 1) {
    const startOffset = start * 4;
    if (
      visited[start] ||
      pixels[startOffset + 3] < 24 ||
      !isMaleHairPixel(pixels[startOffset], pixels[startOffset + 1], pixels[startOffset + 2])
    ) continue;

    let head = 0;
    let tail = 0;
    let minY = height;
    visited[start] = 1;
    componentQueue[tail++] = start;

    while (head < tail) {
      const index = componentQueue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      minY = Math.min(minY, y);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (visited[next] || pixels[next * 4 + 3] < 24) continue;
          const nextOffset = next * 4;
          if (!isMaleHairPixel(pixels[nextOffset], pixels[nextOffset + 1], pixels[nextOffset + 2])) continue;
          visited[next] = 1;
          componentQueue[tail++] = next;
        }
      }
    }

    // La raíz es el extremo superior del mechón. Desde allí se calcula
    // distancia geodésica para que las puntas, incluso en mechones separados,
    // reciban el marrón y no quede ningún parche rubio en poses aisladas.
    let distanceHead = 0;
    let distanceTail = 0;
    let maxDistance = 0;
    for (let position = 0; position < tail; position += 1) {
      const index = componentQueue[position];
      distances[index] = -1;
      if (Math.floor(index / width) === minY) {
        distances[index] = 0;
        distanceQueue[distanceTail++] = index;
      }
    }

    while (distanceHead < distanceTail) {
      const index = distanceQueue[distanceHead++];
      const nextDistance = distances[index] + 1;
      const x = index % width;
      const y = Math.floor(index / width);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (distances[next] !== -1) continue;
          const nextOffset = next * 4;
          if (
            pixels[nextOffset + 3] < 24 ||
            !isMaleHairPixel(pixels[nextOffset], pixels[nextOffset + 1], pixels[nextOffset + 2])
          ) continue;
          distances[next] = nextDistance;
          maxDistance = Math.max(maxDistance, nextDistance);
          distanceQueue[distanceTail++] = next;
        }
      }
    }

    const tipStart = Math.max(1, Math.floor(maxDistance * 0.58));
    for (let position = 0; position < tail; position += 1) {
      const index = componentQueue[position];
      const distance = distances[index];
      const offset = index * 4;
      const [, , lightness] = rgbToHsl(
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
      );

      if (maxDistance > 0 && distance >= tipStart) {
        const progress = maxDistance === tipStart
          ? 1
          : (distance - tipStart) / (maxDistance - tipStart);
        const brownLightness = Math.max(0.20, Math.min(0.40,
          0.23 + progress * 0.15 + (lightness - 0.5) * 0.06,
        ));
        const [red, green, blue] = hslToRgb(25, 0.48, brownLightness);
        pixels[offset] = red;
        pixels[offset + 1] = green;
        pixels[offset + 2] = blue;
        brownPixels += 1;
      } else {
        const blackShade = Math.max(5, Math.min(29, Math.round(4 + lightness * 24)));
        pixels[offset] = blackShade;
        pixels[offset + 1] = blackShade;
        pixels[offset + 2] = blackShade;
        blackPixels += 1;
      }
    }
  }

  return { blackPixels, brownPixels };
}

/**
 * Los resultados femeninos canónicos usan un subtraje azul marino, no el
 * turquesa de la hoja fuente. El cambio se limita a esa familia cromática y
 * conserva el sombreado de cada píxel; los metales y efectos neutros quedan intactos.
 */
async function harmonizeFemalePalette(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] < 16) continue;
    const [hue, saturation, lightness] = rgbToHsl(
      pixels[offset],
      pixels[offset + 1],
      pixels[offset + 2],
    );

    // Solo la tela turquesa/cian saturada de Axem Pink: no los grises del arma.
    if (hue < 158 || hue > 205 || saturation < 0.22 || lightness < 0.12) continue;
    const navyLightness = Math.max(0.10, Math.min(0.34, lightness * 0.58));
    const [red, green, blue] = hslToRgb(226, Math.min(0.9, saturation * 1.18), navyLightness);
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
  }

  // Algunas fuentes tienen motas rosadas de baja fidelidad dibujadas sobre el sprite.
  // Se identifican como pequeños componentes y se rellenan con el color dominante
  // del borde, evitando agujeros transparentes y conservando el pixel-art.
  const original = new Uint8ClampedArray(pixels);
  const isResidualPink = (index) => {
    const offset = index * 4;
    if (original[offset + 3] < 16) return false;
    const [hue, saturation, lightness] = rgbToHsl(
      original[offset],
      original[offset + 1],
      original[offset + 2],
    );
    return saturation >= 0.18 && lightness >= 0.48 &&
      ((hue >= 300 && hue <= 360) || hue <= 8);
  };

  const totalPixels = info.width * info.height;
  const visited = new Uint8Array(totalPixels);
  const queue = new Uint32Array(totalPixels);

  for (let startIndex = 0; startIndex < totalPixels; startIndex += 1) {
    if (visited[startIndex] || !isResidualPink(startIndex)) continue;

    let head = 0;
    let tail = 0;
    visited[startIndex] = 1;
    queue[tail++] = startIndex;

    while (head < tail) {
      const index = queue[head++];
      const x = index % info.width;
      const y = Math.floor(index / info.width);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height) continue;
          const next = ny * info.width + nx;
          if (visited[next] || !isResidualPink(next)) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    // Las áreas grandes son efectos intencionales, no motas sobre el personaje.
    if (tail > 180) continue;

    const borderColors = new Map();
    for (let position = 0; position < tail; position += 1) {
      const index = queue[position];
      const x = index % info.width;
      const y = Math.floor(index / info.width);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height) continue;
          const neighbor = ny * info.width + nx;
          if (isResidualPink(neighbor)) continue;
          const offset = neighbor * 4;
          if (original[offset + 3] < 16) continue;
          const key = (original[offset] << 16) |
            (original[offset + 1] << 8) |
            original[offset + 2];
          borderColors.set(key, (borderColors.get(key) ?? 0) + 1);
        }
      }
    }

    let replacementColor = null;
    let highestCount = 0;
    for (const [key, count] of borderColors) {
      if (count > highestCount) {
        highestCount = count;
        replacementColor = key;
      }
    }
    if (replacementColor === null) continue;

    for (let position = 0; position < tail; position += 1) {
      const offset = queue[position] * 4;
      pixels[offset] = (replacementColor >> 16) & 255;
      pixels[offset + 1] = (replacementColor >> 8) & 255;
      pixels[offset + 2] = replacementColor & 255;
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
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

    // En el resultado canónico Orange el manto es rojo; la fuente Pink lo trae marrón.
    // Se cambia solo el marrón medio del manto antes de recolorear la armadura rosa.
    if (
      gender === 'female' &&
      targetHue === COLORS.orange &&
      hue >= 14 && hue <= 32 &&
      saturation >= 0.24 && saturation <= 0.62 &&
      lightness >= 0.30 && lightness <= 0.58
    ) {
      const [red, green, blue] = hslToRgb(
        1,
        Math.min(0.96, saturation * 1.55),
        Math.max(0.22, lightness * 0.9),
      );
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      continue;
    }

    const minPaletteSaturation = gender === 'female' ? 0.14 : 0.28;
    if (saturation < minPaletteSaturation || !hueMatches(hue, PALETTE_SOURCES[gender])) continue;
    const [red, green, blue] = hslToRgb(targetHue, saturation, lightness);
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
  }

  if (gender === 'male') {
    const hair = shadeMaleHairWithBrownTips(pixels, info.width, info.height, targetHue);
    console.log(
      'Cabello negro con mechas marrones: ' +
      hair.blackPixels + ' píxeles negros, ' +
      hair.brownPixels + ' píxeles marrones',
    );
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

  return { frames, width: metadata.width, height: pageHeight, delay: metadata.delay, loop: metadata.loop ?? 0 };
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
async function writeMaleAnimation(frames, rangerId, action, frameDelays, loop = 0) {
  // La tira PNG de combate conserva sus celdas compactas de 53×83 px.
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
  const outputPaths = [
    path.join(GENERATED, 'axem-' + rangerId + '-' + action + '.png'),
    path.join(GENERATED, 'axem-male-' + rangerId + '-' + action + '.png'),
  ];
  await Promise.all(outputPaths.map((outputPath) => fs.writeFile(outputPath, strip)));
  console.log('Generada animación masculina ' + rangerId + '/' + action);

  // Los GIF de referencia usan lienzo 150×100. La corrida original mide 101×100:
  // se centra sobre transparencia para llegar al mismo tamaño sin deformar el sprite.
  const gifFrames = await Promise.all(frames.map((frame) =>
    sharp(frame)
      .resize(ACTION_GIF_SIZE.width, ACTION_GIF_SIZE.height, {
        fit: 'contain',
        position: 'centre',
        kernel: 'nearest',
        background: TRANSPARENT,
      })
      .png()
      .toBuffer()
  ));

  // Sharp une los PNG de cada cuadro como una animación real, conservando la transparencia.
  const delays = Array.isArray(frameDelays) && frameDelays.length === gifFrames.length
    ? frameDelays
    : 80;
  const gif = await sharp(gifFrames, { join: { animated: true } })
    .gif({
      loop,
      delay: delays,
      colours: 256,
      dither: 0,
      effort: 10,
      keepDuplicateFrames: true,
    })
    .toBuffer();
  await writeResult('male', rangerId, action + '.gif', gif);
}

/**
 * Lee cada celda de una tira de secuencia manteniendo el pivote horizontal
 * común y la línea de pies calculada durante la generación del atlas.
 */
async function readMaleSequenceFrames(color, entry) {
  const strip = await fs.readFile(RESULTS('male', color, 'sequences', entry.file));
  const frames = [];

  for (let frameIndex = 0; frameIndex < entry.frameCount; frameIndex += 1) {
    const input = await sharp(strip)
      .extract({
        left: frameIndex * entry.cellWidth,
        top: 0,
        width: entry.cellWidth,
        height: entry.cellHeight,
      })
      .png()
      .toBuffer();

    frames.push({
      input,
      cellWidth: entry.cellWidth,
      cellHeight: entry.cellHeight,
      anchorX: entry.anchorX,
    });
  }

  return frames;
}

/**
 * Compone cada cuadro sobre un lienzo transparente de 150×100 px.
 * El escalado nearest-neighbor preserva el pixel-art; el pivote de los pies
 * queda centrado y la línea de suelo permanece constante entre fotogramas.
 */
async function writeMaleSequenceGif(frames, color, filename, delay = 100) {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error('La animación ' + filename + ' no contiene fotogramas.');
  }

  const gifFrames = await Promise.all(frames.map(async (frame) => {
    const width = Math.round(frame.cellWidth * SEQUENCE_GIF_SCALE);
    const height = Math.round(frame.cellHeight * SEQUENCE_GIF_SCALE);
    if (width > ACTION_GIF_SIZE.width || height + SEQUENCE_GIF_FEET_MARGIN > ACTION_GIF_SIZE.height) {
      throw new Error('La celda excede el lienzo de 150×100 px en ' + filename);
    }

    const sprite = await sharp(frame.input)
      .resize(width, height, { fit: 'fill', kernel: 'nearest' })
      .png()
      .toBuffer();
    const left = Math.round(ACTION_GIF_SIZE.width / 2 - frame.anchorX * SEQUENCE_GIF_SCALE);
    const top = ACTION_GIF_SIZE.height - SEQUENCE_GIF_FEET_MARGIN - height;

    if (left < 0 || left + width > ACTION_GIF_SIZE.width || top < 0) {
      throw new Error('El pivote de ' + filename + ' queda fuera del lienzo.');
    }

    return sharp({
      create: {
        width: ACTION_GIF_SIZE.width,
        height: ACTION_GIF_SIZE.height,
        channels: 4,
        background: TRANSPARENT,
      },
    })
      .composite([{ input: sprite, left, top }])
      .png()
      .toBuffer();
  }));

  const gif = await sharp(gifFrames, { join: { animated: true } })
    .gif({
      loop: 0,
      delay,
      colours: 256,
      dither: 0,
      effort: 10,
      keepDuplicateFrames: true,
    })
    .toBuffer();

  await writeResult('male', color, filename + '.gif', gif);
}

/**
 * Animaciones adicionales del masculino naranja. El orden de los grupos y
 * los rangos de group-13 siguen la clasificación manual del spritesheet.
 */
async function buildMaleActionGifs(color, sequenceIndex) {
  const groups = new Map();
  for (const entry of sequenceIndex) {
    groups.set(entry.id, await readMaleSequenceFrames(color, entry));
  }

  const frames = (...ids) => ids.flatMap((id) => {
    const group = groups.get(id);
    if (!group) throw new Error('No existe ' + id + ' para generar GIFs.');
    return group;
  });

  // idle.gif conserva sus ocho cuadros maestros; no se reemplaza por el atlas completo.

  await writeMaleSequenceGif(frames('group-03'), color, 'punch-01', 90);
  await writeMaleSequenceGif(frames('group-04'), color, 'punch-02', 90);
  await writeMaleSequenceGif(frames('group-05'), color, 'punch-03', 90);

  // battle-pose.gif y teleport.gif mantienen sus GIF maestros completos.

  await writeMaleSequenceGif(frames('group-10'), color, 'run', 80);
  await writeMaleSequenceGif(frames('group-11'), color, 'dash', 80);
  await writeMaleSequenceGif(frames('group-12'), color, 'jump', 100);

  await writeMaleSequenceGif(groups.get('group-13').slice(0, 2), color, 'hit', 120);
  await writeMaleSequenceGif(groups.get('group-13').slice(3, 6), color, 'hurt', 150);

}


/**
 * Separa los sprites consecutivos de una tira PNG de secuencia por sus columnas
 * opacas. Los cuadros conservan sus píxeles originales y se recortan solo por
 * transparencia, sin deformar el personaje ni perder efectos asociados.
 */
async function extractMaleStripFrames(color, groupId, frameCount) {
  const file = RESULTS('male', color, 'sequences', groupId + '.png');
  const metadata = await sharp(file).metadata();
  if (!metadata.width || !metadata.height || metadata.width % frameCount !== 0) {
    throw new Error('La tira ' + groupId + '.png no se divide en ' + frameCount + ' celdas iguales.');
  }

  // Los grupos 15–19 están compuestos por celdas de ancho fijo y no por
  // componentes separados: algunos elementos de las poses se superponen.
  const cellWidth = metadata.width / frameCount;
  const frames = [];
  for (let index = 0; index < frameCount; index++) {
    const input = await sharp(file)
      .extract({
        left: index * cellWidth,
        top: 0,
        width: cellWidth,
        height: metadata.height,
      })
      .png()
      .toBuffer();
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let left = info.width;
    let top = info.height;
    let right = -1;
    let bottom = -1;
    let pixels = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] < 24) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
        pixels += 1;
      }
    }

    if (pixels < 100 || right < left || bottom < top) {
      throw new Error('La celda ' + (index + 1) + ' de ' + groupId + '.png está vacía.');
    }
    frames.push({
      input,
      bounds: [index * cellWidth + left, top, right - left + 1, bottom - top + 1],
      pixels,
    });
  }

  console.log(
    'Secuencia violeta ' + groupId + ': ' + frames.length + ' fotogramas ' +
    JSON.stringify(frames.map((frame) => frame.bounds)),
  );
  return frames;
}

async function normalizeMaleActionFrame(input, addAura = false, targetHeight = null, options = {}) {
  const { targetScale = null, auraColor = { r: 195, g: 70, b: 255 } } = options;
  const trimmed = await sharp(input)
    .trim({ background: TRANSPARENT, threshold: 1 })
    .png()
    .toBuffer();
  const metadata = await sharp(trimmed).metadata();
  const scale = targetScale !== null
    ? targetScale
    : targetHeight === null
      ? Math.min(1.3, 142 / metadata.width, 92 / metadata.height)
      : targetHeight / metadata.height;
  const width = Math.max(1, Math.round(metadata.width * scale));
  const height = targetScale === null && targetHeight !== null
    ? targetHeight
    : Math.max(1, Math.round(metadata.height * scale));
  if (width > 142 || height > 92) {
    throw new Error('El fotograma normalizado excede el espacio disponible en el lienzo de 150×100 px.');
  }
  const sprite = await sharp(trimmed)
    .resize(width, height, { fit: 'fill', kernel: 'nearest' })
    .png()
    .toBuffer();
  const left = Math.round((ACTION_GIF_SIZE.width - width) / 2);
  const top = ACTION_GIF_SIZE.height - SEQUENCE_GIF_FEET_MARGIN - height;

  const layers = [];
  if (addAura) {
    // Amplía y difumina la silueta para que el aura violeta se distinga
    // claramente del personaje incluso con la paleta limitada del formato GIF.
    const glow = await sharp(sprite)
      .resize({ width: width + 14, height: height + 14, kernel: 'nearest' })
      .blur(7)
      .tint(auraColor)
      .png()
      .toBuffer();
    layers.push({ input: glow, left: left - 7, top: top - 7 });
  }
  layers.push({ input: sprite, left, top });

  return sharp({
    create: {
      width: ACTION_GIF_SIZE.width,
      height: ACTION_GIF_SIZE.height,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

/**
 * Compone el aura dorada Super Saiyan detrás de la última pose masculina de group-09.
 * La pose original se conserva y se mantiene visible durante el cierre de carga.
 */
async function buildMaleKiAuraHoldFrames(sourceFrame) {
  const metadata = await sharp(KI_AURA_SHEET_PATH).metadata();
  const { columns, rows, cellWidth, cellHeight } = KI_AURA_GRID;
  if (metadata.width !== columns * cellWidth || metadata.height !== rows * cellHeight) {
    throw new Error('La hoja de aura Super Saiyan debe medir 128×128 px en una cuadrícula 2×2.');
  }
  if (!metadata.hasAlpha) {
    throw new Error('La hoja de aura Super Saiyan debe conservar transparencia.');
  }

  const heldPose = await normalizeMaleActionFrame(
    sourceFrame.input,
    false,
    STANDARD_STANDING_HEIGHT,
  );
  const frames = [];

  for (let frameIndex = 0; frameIndex < columns * rows; frameIndex += 1) {
    const aura = await sharp(KI_AURA_SHEET_PATH)
      .extract({
        left: (frameIndex % columns) * cellWidth,
        top: Math.floor(frameIndex / columns) * cellHeight,
        width: cellWidth,
        height: cellHeight,
      })
      .png()
      .toBuffer();

    const heldKiFrame = await sharp({
      create: {
        width: ACTION_GIF_SIZE.width,
        height: ACTION_GIF_SIZE.height,
        channels: 4,
        background: TRANSPARENT,
      },
    })
      .composite([
        {
          input: await sharp(aura)
            .resize(112, 112, { fit: 'fill', kernel: 'nearest' })
            .extract({ left: 0, top: 8, width: 112, height: 100 })
            .png()
            .toBuffer(),
          left: 19,
          top: 0,
        },
        { input: heldPose, left: 0, top: 0 },
      ])
      .png()
      .toBuffer();

    frames.push(heldKiFrame);
  }

  return frames;
}


async function readMaleGifFrames(color, filename) {
  const file = RESULTS('male', color, filename);
  const metadata = await sharp(file, { animated: true }).metadata();
  const count = Math.max(1, metadata.pages || 1);
  const frames = [];
  const delays = [];

  for (let page = 0; page < count; page++) {
    const frame = await sharp(file, { page, pages: 1 })
      .resize(ACTION_GIF_SIZE.width, ACTION_GIF_SIZE.height, {
        fit: 'contain',
        position: 'centre',
        kernel: 'nearest',
        background: TRANSPARENT,
      })
      .png()
      .toBuffer();
    frames.push(frame);
    delays.push(Array.isArray(metadata.delay) ? metadata.delay[page] || 100 : metadata.delay || 100);
  }
  return { frames, delays };
}

async function writeMaleActionGif(color, filename, frames, delays) {
  if (!frames.length) throw new Error('La animación ' + filename + ' no tiene fotogramas.');
  const gif = await sharp(frames, { join: { animated: true } })
    .gif({
      loop: 0,
      delay: delays.length === frames.length ? delays : frames.map(() => 100),
      colours: 256,
      dither: 0,
      effort: 10,
      keepDuplicateFrames: true,
    })
    .toBuffer();
  await writeResult('male', color, filename + '.gif', gif);
}

/** Completa las secuencias adicionales propias de Axem Violeta. */
async function writeMaleDefeatedPose(color, frame, targetScale = null) {
  const defeated = await normalizeMaleActionFrame(frame.input, false, null, { targetScale });
  await writeResult('male', color, 'defeated.png', defeated);
  const generatedPath = path.join(GENERATED, 'axem-' + color + '-defeated.png');
  await fs.writeFile(generatedPath, defeated);
  console.log('Generada pose de derrota ' + path.relative(ROOT, generatedPath));
}

/** El grupo 16 termina la preparación y deja la pose estática que se usa al caer KO. */
async function buildMaleGroup16Sequence(color, frames) {
  if (frames.length !== 2) {
    throw new Error('group-16.png debe contener exactamente dos fotogramas.');
  }

  // El cuadro del hacha es la pose de pie: fija la escala estándar y la derrota la comparte.
  const axeTrimmed = await sharp(frames[1].input)
    .trim({ background: TRANSPARENT, threshold: 1 })
    .png()
    .toBuffer();
  const axeHeight = (await sharp(axeTrimmed).metadata()).height;
  await writeMaleDefeatedPose(color, frames[0], STANDARD_STANDING_HEIGHT / axeHeight);

  const battlePose = await readMaleGifFrames(color, 'battle-pose.gif');
  const axePose = await normalizeMaleActionFrame(frames[1].input, false, STANDARD_STANDING_HEIGHT);
  await writeMaleActionGif(
    color,
    'battle-pose',
    [...battlePose.frames, axePose],
    [...battlePose.delays, 120],
  );
}

/** Acciones de los GIF que el juego reproduce como hojas de sprites. */
const GAME_GIF_ACTIONS = Object.freeze([
  'idle', 'dash', 'punch-01', 'punch-02', 'punch-03', 'hit', 'hurt',
  'jump', 'teleport', 'charge', 'battle-pose', 'pose',
  'guard', 'roll', 'ko',
]);

/**
 * Los GIF usan el lienzo de 150×100 a escala 1,75 sobre el arte nativo. El juego
 * dibuja el resto de las hojas a escala nativa, así que cada cuadro se reduce
 * con nearest-neighbor a la misma escala para que el personaje mida igual.
 */
async function writeMaleGameStrips(color) {
  const cellWidth = Math.round(ACTION_GIF_SIZE.width / SEQUENCE_GIF_SCALE);
  const cellHeight = Math.round(ACTION_GIF_SIZE.height / SEQUENCE_GIF_SCALE);
  for (const action of GAME_GIF_ACTIONS) {
    const { frames } = await readMaleGifFrames(color, action + '.gif');
    const cells = await Promise.all(frames.map((frame) =>
      sharp(frame)
        .resize(cellWidth, cellHeight, { fit: 'fill', kernel: 'nearest' })
        .png()
        .toBuffer()
    ));
    const strip = await makeHorizontalStrip(cells, cellWidth, cellHeight);
    const outputPath = path.join(GENERATED, 'axem-' + color + '-' + action + '.png');
    await fs.writeFile(outputPath, strip);
    console.log('Generada hoja de juego ' + path.relative(ROOT, outputPath));
  }
}

/**
 * Completa teleport, charge, idle, derrota e invocación del hacha. Se genera
 * igual para Violeta y Naranja; el personaje de pie mide STANDARD_STANDING_HEIGHT
 * px, con los pies sobre la misma línea del lienzo de 150×100 px.
 */
async function buildMaleSharedExtraGifs(color) {
  const teleportAppend = await extractMaleStripFrames(color, 'group-15', 3);
  const defeatedAndAxe = await extractMaleStripFrames(color, 'group-16', 2);
  const chargeFrames = await extractMaleStripFrames(color, 'group-17', 3);

  await buildMaleGroup16Sequence(color, defeatedAndAxe);

  const teleport = await readMaleGifFrames(color, 'teleport.gif');
  const teleportTail = await Promise.all(
    teleportAppend.map((frame) => normalizeMaleActionFrame(frame.input, false, STANDARD_STANDING_HEIGHT)),
  );
  await writeMaleActionGif(
    color,
    'teleport',
    [...teleport.frames, ...teleportTail],
    [...teleport.delays, ...teleportTail.map(() => 100)],
  );

  const charged = await Promise.all(
    chargeFrames.map((frame) => normalizeMaleActionFrame(frame.input, false, STANDARD_STANDING_HEIGHT)),
  );
  const group09 = await extractMaleStripFrames(color, 'group-09', 5);
  const heldKiFrames = await buildMaleKiAuraHoldFrames(group09[group09.length - 1]);
  await writeMaleActionGif(
    color,
    'charge',
    [...charged, ...heldKiFrames],
    [
      ...charged.map(() => 100),
      ...heldKiFrames.map(() => KI_AURA_HOLD_DELAY),
    ],
  );

  await buildMaleIdleGif(color);
  await buildMaleCombatEnhancementGifs(color);
}

/**
 * Genera idle.gif con los ocho cuadros de group-18 (3) y group-19 (5),
 * todos a la altura estándar sobre el lienzo fijo de 150×100 px.
 */
async function buildMaleIdleGif(color) {
  const idleFrames = [
    ...await extractMaleStripFrames(color, 'group-18', 3),
    ...await extractMaleStripFrames(color, 'group-19', 5),
  ];
  const idle = await Promise.all(
    idleFrames.map((frame) => normalizeMaleActionFrame(frame.input, false, STANDARD_STANDING_HEIGHT)),
  );
  await writeMaleActionGif(color, 'idle', idle, idle.map(() => 140));
}

/** Aplica inclinación/compresión a cuadros ya normalizados sin cambiar el pivote del suelo. */
async function transformMaleActionFrame(input, {
  rotate = 0,
  scaleX = 1,
  scaleY = 1,
  offsetY = 0,
} = {}) {
  const trimmed = await sharp(input)
    .trim({ background: TRANSPARENT, threshold: 1 })
    .png()
    .toBuffer();
  const rotated = await sharp(trimmed)
    .rotate(rotate, { background: TRANSPARENT })
    .png()
    .toBuffer();
  const metadata = await sharp(rotated).metadata();
  const width = Math.max(1, Math.min(142, Math.round(metadata.width * scaleX)));
  const height = Math.max(1, Math.min(92, Math.round(metadata.height * scaleY)));
  const sprite = await sharp(rotated)
    .resize(width, height, { fit: 'fill', kernel: 'nearest' })
    .png()
    .toBuffer();
  const left = Math.round((ACTION_GIF_SIZE.width - width) / 2);
  const top = Math.max(0, Math.min(
    ACTION_GIF_SIZE.height - height,
    ACTION_GIF_SIZE.height - SEQUENCE_GIF_FEET_MARGIN - height + offsetY,
  ));
  return sharp({
    create: {
      width: ACTION_GIF_SIZE.width,
      height: ACTION_GIF_SIZE.height,
      channels: 4,
      background: TRANSPARENT,
    },
  }).composite([{ input: sprite, left, top }]).png().toBuffer();
}

/**
 * Añade a la rodada un rastro de movimiento gris, separado de la silueta nítida.
 * Las copias desenfocadas quedan detrás y ligeramente desplazadas; el personaje
 * original conserva su color, transparencia, tamaño y pivote.
 */
/**
 * Dibuja una nube giratoria opaca que sustituye visualmente al cuerpo durante
 * la rodada. La silueta del personaje queda completamente debajo de esta capa.
 */
/**
 * Círculo de humo giratorio. Es una capa opaca e independiente: sustituye al
 * personaje durante la rodada, sin dejar partes reconocibles del sprite.
 */
async function createGrayRollSmokeCover(angle) {
  const rotation = ((angle % 360) + 360) % 360;
  const svg = `
    <svg width="150" height="100" viewBox="0 0 150 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rollCloud" cx="43%" cy="37%" r="70%">
          <stop offset="0" stop-color="#e0e2e5"/>
          <stop offset="0.48" stop-color="#b9bec5"/>
          <stop offset="1" stop-color="#737a84"/>
        </radialGradient>
        <linearGradient id="rollLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f2f3f5"/>
          <stop offset="1" stop-color="#969da6"/>
        </linearGradient>
      </defs>
      <g transform="rotate(__ANGLE__ 103 50)">
        <path
          d="M 101 5
             C 114 1, 128 10, 128 22
             C 142 22, 149 35, 142 47
             C 151 58, 143 73, 130 75
             C 126 89, 110 97, 97 87
             C 84 96, 68 87, 68 73
             C 55 66, 54 51, 64 42
             C 58 29, 69 17, 81 19
             C 84 8, 94 3, 101 5 Z"
          fill="url(#rollCloud)" opacity="1"/>
        <ellipse cx="103" cy="51" rx="36" ry="29" fill="#989fa8" opacity="0.30"/>
        <path d="M 67 47 C 80 23, 116 15, 137 37"
          fill="none" stroke="url(#rollLight)" stroke-width="7"
          stroke-linecap="round" opacity="0.96"/>
        <path d="M 68 65 C 89 85, 124 80, 141 56"
          fill="none" stroke="#626a74" stroke-width="8"
          stroke-linecap="round" opacity="0.90"/>
        <path d="M 87 27 C 106 17, 128 31, 126 49
                 C 124 65, 106 72, 91 62"
          fill="none" stroke="#e7e9ec" stroke-width="5"
          stroke-linecap="round" opacity="0.92"/>
        <path d="M 76 57 C 88 43, 105 39, 119 47"
          fill="none" stroke="#747b85" stroke-width="5.5"
          stroke-linecap="round" opacity="0.86"/>
      </g>
    </svg>
  `;
  return sharp(Buffer.from(svg.replace("__ANGLE__", String(rotation)))).png().toBuffer();
}

/**
 * Nube de polvo independiente que queda DETRÁS del círculo. La masa nace en
 * el borde posterior del giro y se prolonga hacia la izquierda como en una
 * rodada rápida de Sonic: ancha junto al círculo, irregular y difusa al alejarse.
 */
async function createGrayRollSmokeTrail(frameIndex = 0) {
  // Cada cuadro desplaza los remolinos hacia atrás; el reinicio ocurre junto
  // con el cierre de la vuelta (frame 8), para que el GIF pueda repetirse.
  const phase = ((frameIndex % 8) + 8) % 8;
  const drift = Math.round(phase * 1.7);
  const groundY = ACTION_GIF_SIZE.height - SEQUENCE_GIF_FEET_MARGIN;
  const groundOffset = groundY - 96;
  const svg = `
    <svg width="150" height="100" viewBox="0 0 150 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="groundDust" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#a9a59d" stop-opacity="0.10"/>
          <stop offset="0.35" stop-color="#c2beb6" stop-opacity="0.48"/>
          <stop offset="0.78" stop-color="#d5d1c9" stop-opacity="0.82"/>
          <stop offset="1" stop-color="#c6c2ba" stop-opacity="0.72"/>
        </linearGradient>
        <linearGradient id="groundDustShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#767d86" stop-opacity="0.08"/>
          <stop offset="1" stop-color="#626a74" stop-opacity="0.48"/>
        </linearGradient>
        <radialGradient id="dustPuff">
          <stop offset="0" stop-color="#e0dcd4" stop-opacity="0.82"/>
          <stop offset="1" stop-color="#aaa69e" stop-opacity="0.04"/>
        </radialGradient>
      </defs>
      <g transform="translate(0 ${groundOffset})">
        <!-- Sombra de contacto: la estela nace en el mismo plano del suelo. -->
        <ellipse cx="35" cy="94.5" rx="39" ry="2.4"
          fill="#525963" opacity="0.27"/>

        <!-- Masa baja y horizontal: nunca queda suspendida a media altura. -->
        <path d="M 76 78
          C 67 73, 59 76, 53 82
          C 45 76, 36 79, 31 85
          C 23 81, 15 84, 12 89
          C 5 87, 0 91, 0 94
          C 8 96, 17 95, 25 96
          C 34 93, 42 96, 50 94
          C 59 91, 67 95, 74 92
          C 81 89, 82 83, 76 78 Z"
          fill="url(#groundDust)"/>
        <path d="M 0 93
          C 14 90, 24 92, 35 91
          C 47 90, 58 93, 70 91
          C 77 90, 81 92, 84 94
          C 71 96, 63 96, 51 96
          C 36 96, 24 96, 11 96
          C 5 96, 1 95, 0 93 Z"
          fill="url(#groundDustShade)" opacity="0.68"/>

        <!-- Puffs rodantes: se desplazan lateralmente cuadro a cuadro. -->
        <g transform="translate(-${drift} 0)">
          <ellipse cx="13" cy="89" rx="12" ry="7"
            fill="url(#dustPuff)" opacity="0.68"/>
          <ellipse cx="31" cy="87" rx="13" ry="9"
            fill="#d0ccc4" opacity="0.48"/>
          <ellipse cx="48" cy="88" rx="14" ry="8"
            fill="url(#dustPuff)" opacity="0.62"/>
          <path d="M 0 88 C 12 82, 21 84, 32 87
            C 43 90, 53 85, 65 88
            C 52 91, 43 93, 31 91
            C 18 89, 8 94, 0 93 Z"
            fill="#e1ddd5" opacity="0.42"/>
          <path d="M 4 95 C 18 91, 26 94, 38 93
            C 49 92, 56 95, 67 94
            C 54 97, 44 96, 33 96
            C 20 96, 12 97, 4 95 Z"
            fill="#7a818a" opacity="0.27"/>
          <circle cx="9" cy="82" r="3" fill="#c9c5bd" opacity="0.34"/>
          <circle cx="25" cy="80" r="2.4" fill="#dedad2" opacity="0.42"/>
          <circle cx="44" cy="82" r="2.8" fill="#b9b5ad" opacity="0.34"/>
        </g>

        <!-- Nacimiento compacto junto a la base del círculo; queda detrás de él. -->
        <ellipse cx="70" cy="89" rx="12" ry="7"
          fill="#d0ccc4" opacity="0.46"/>
        <ellipse cx="74" cy="94" rx="11" ry="2"
          fill="#777e87" opacity="0.24"/>
      </g>
    </svg>
  `;
  return sharp(Buffer.from(svg)).blur(1.8).png().toBuffer();
}

/**
 * Ensambla el efecto en dos capas separadas: primero el rastro de polvo y
 * después el círculo giratorio que lo tapa parcialmente en su punto de origen.
 * No se reutiliza ni se desenfoca el sprite del Axem: el cuerpo desaparece.
 */
async function addGrayRollMotionBlur(_input, angle, frameIndex = 0) {
  const smokeTrail = await createGrayRollSmokeTrail(frameIndex);
  const smokeCover = await createGrayRollSmokeCover(angle);

  return sharp({
    create: {
      width: ACTION_GIF_SIZE.width,
      height: ACTION_GIF_SIZE.height,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([
      { input: smokeTrail, left: 0, top: 0, opacity: 1 },
      { input: smokeCover, left: 0, top: 0, opacity: 1 },
    ])
    .png()
    .toBuffer();
}

/**
 * Nuevas acciones construidas con cuadros reales del atlas Axem Red:
 * guardia, reacción al bloqueo, rodada, aterrizaje, especial, victoria y KO.
 * Se recolorean en el mismo pipeline, por lo que Violet/Orange mantienen el mismo pivote.
 */
async function buildMaleCombatEnhancementGifs(color) {
  const [battlePose, dash, jump, doubleAxe, hurt, idle] = await Promise.all([
    readMaleGifFrames(color, 'battle-pose.gif'),
    readMaleGifFrames(color, 'dash.gif'),
    readMaleGifFrames(color, 'jump.gif'),
    readMaleGifFrames(color, 'double-axe.gif'),
    readMaleGifFrames(color, 'hurt.gif'),
    readMaleGifFrames(color, 'idle.gif'),
  ]);

  const guardFrames = battlePose.frames.slice(-Math.min(6, battlePose.frames.length));
  await writeMaleActionGif(color, 'guard', guardFrames, guardFrames.map(() => 135));

  // La rodada recorre una vuelta completa: el cuerpo pasa por 360° en el eje Z.
  const rollAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
  const rollFrames = await Promise.all(rollAngles.map((angle, index) => {
    const source = dash.frames[Math.round(index * (dash.frames.length - 1) / (rollAngles.length - 1))];
    return transformMaleActionFrame(source, {
      rotate: angle,
      scaleX: 0.92,
      scaleY: 0.86,
      offsetY: 2,
    });
  }));
  const blurredRollFrames = await Promise.all(rollFrames.map((frame, index) => addGrayRollMotionBlur(frame, rollAngles[index], index)));
  await writeMaleActionGif(color, 'roll', blurredRollFrames, blurredRollFrames.map(() => 45));

  // La pose KO se refleja horizontalmente para mantener la misma orientación
  // que los cuadros de impacto: ambos terminan mirando hacia la derecha.
  const defeatedFrame = await sharp(RESULTS('male', color, 'defeated.png'))
    .flop()
    .png()
    .toBuffer();
  const koFrames = [...hurt.frames.slice(0, 2), defeatedFrame, defeatedFrame];
  await writeMaleActionGif(color, 'ko', koFrames, [95, 110, 220, 400]);
}

/**
 * Genera retratos del menú directamente desde las ilustraciones Super Axem.
 * Ambas salidas comparten un lienzo transparente para conservar una escala
 * visual pareja y no invadir el título ni los botones de inicio.
 */
async function buildMenuSuperPoses() {
  const poses = [
    {
      gender: 'male',
      color: 'orange',
      file: path.join(GENERATED, 'super-axem-source-male.png'),
    },
    {
      gender: 'female',
      color: 'violet',
      file: path.join(GENERATED, 'super-axem-source-female.png'),
    },
  ];

  await fs.mkdir(GENERATED, { recursive: true });
  for (const pose of poses) {
    const output = await sharp(pose.file)
      .ensureAlpha()
      .trim({ background: TRANSPARENT, threshold: 1 })
      .resize(MENU_SIZE.width, MENU_SIZE.height, {
        fit: 'contain',
        kernel: 'nearest',
        background: TRANSPARENT,
      })
      .png()
      .toBuffer();
    const outputPath = path.join(
      GENERATED,
      'menu-ranger-' + pose.gender + '-' + pose.color + '.png',
    );
    await fs.writeFile(outputPath, output);
    console.log('Generado retrato Super Axem ' + path.relative(ROOT, outputPath));
  }
}

async function buildGender(gender, allowedColors) {
  for (const [color, targetHue] of Object.entries(COLORS).filter(([color]) => allowedColors.includes(color))) {
    const parts = [];
    let baseSource;
    let canonicalPosePath;

    if (gender === 'male') {
      // Use the actual checked-in Axem Red reference; legacy preview filenames are absent.
      const redReference = SOURCE('sprites', 'references', 'axem-red', 'axem-red-spritesheet.png');
      // El atlas Red trae ruido de compresión: con tolerancia 42 queda un halo verdoso.
      parts.push(await recolorAndKey(redReference, gender, targetHue, ATLAS_SOURCES.male.tolerance));

      const run = await extractGifFrames(SOURCE('sprites', 'references', 'axem-red', 'axem-ranger-run.gif'), gender, targetHue);
      const bike = await extractGifFrames(SOURCE('sprites', 'references', 'axem-red', 'axem-ranger-bike.gif'), gender, targetHue);
      const doubleAxe = await extractGifFrames(SOURCE('sprites', 'references', 'axem-red', 'axem-ranger-double-axe.gif'), gender, targetHue);
      parts.push(await makeHorizontalStrip(run.frames, run.width, run.height));
      parts.push(await makeHorizontalStrip(bike.frames, bike.width, bike.height));
      parts.push(await makeHorizontalStrip(doubleAxe.frames, doubleAxe.width, doubleAxe.height));
      await writeResult(gender, color, 'spritesheet.png', parts[0]);
      await writeResult(gender, color, 'run.png', parts[1]);
      await writeResult(gender, color, 'bike.png', parts[2]);
      await writeResult(gender, color, 'double-axe.png', parts[3]);
      await writeMaleAnimation(run.frames, color, 'run', run.delay, run.loop);
      await writeMaleAnimation(bike.frames, color, 'bike', bike.delay, bike.loop);
      if (color === 'orange') {
        const manifest = JSON.parse(await fs.readFile(ATLAS_FRAMES_PATH, 'utf8'));
        // Solo Orange tiene los grupos auxiliares completos para crear las acciones de combate.
        const sequenceIndex = await writeMaleSequences(color, parts[0], manifest.male.groups);
        await writeMaleAnimation(doubleAxe.frames, color, 'double-axe', doubleAxe.delay, doubleAxe.loop);
        await buildMaleActionGifs(color, sequenceIndex);
        // charge/guard/roll/KO ya tienen GIF maestros versionados; no se reconstruyen
        // desde tiras auxiliares antiguas que fueron retiradas del repositorio.
        await writeMaleGameStrips(color);
      }
      baseSource = await fs.readFile(path.join(GENERATED, 'super-axem-source-male.png'));
    } else {
      const pinkReference = SOURCE('sprites', 'references', 'axem-pink');
      const files = [
        'axem-pink-spritesheet.png',
        'axem-pink-pose.png',
      ];
      // Las poses canónicas femeninas viven dentro de results/female/<color>/.
      // Mantener el color en la ruta evita depender del antiguo archivo en la raíz.
      canonicalPosePath = RESULTS(
        gender,
        color,
        'axem-ranger-' + color + '.png',
      );
      let canonicalPose;
      try {
        canonicalPose = await fs.readFile(canonicalPosePath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const generatedPose = await recolorAndKey(
          path.join(pinkReference, 'axem-pink-pose.png'),
          gender,
          targetHue,
        );
        canonicalPose = await harmonizeFemalePalette(generatedPose);
      }

      for (const file of files) {
        const outputName = file.replace(/^axem-pink-/, '');
        const preservedPath = path.join(RESULTS(gender, color), outputName);
        const hasPreservedPalette = FEMALE_PRESERVED_PALETTE_ASSETS.has(outputName)
          && await fileExists(preservedPath);
        let corrected;

        if (hasPreservedPalette) {
          // Conserva la corrección manual cuando el archivo sigue versionado.
          // Si se elimina, se reconstruye desde la referencia original en este build.
          corrected = await fs.readFile(preservedPath);
          console.log('Se conserva la paleta femenina ajustada: ' + path.relative(ROOT, preservedPath));
        } else if (file === 'axem-pink-pose.png') {
          // La pose final del usuario es la fuente canónica, no una reconstrucción.
          corrected = canonicalPose;
        } else {
          const recolored = await recolorAndKey(
            path.join(pinkReference, file),
            gender,
            targetHue,
          );
          corrected = await harmonizeFemalePalette(recolored);
        }

        parts.push(corrected);
        if (!hasPreservedPalette) {
          await writeResult(gender, color, outputName, corrected);
        }
      }
      for (const [action, sourceName] of [
        ['run', 'axem-ranger-run.gif'],
        ['bike', 'axem-ranger-bike.gif'],
      ]) {
        const animation = await extractGifFrames(
          SOURCE('sprites', 'references', 'axem-red', sourceName),
          gender,
          targetHue,
        );
        const cells = await Promise.all(animation.frames.map((frame) =>
          sharp(frame).resize(BASE_SIZE.width, BASE_SIZE.height, {
            fit: 'fill', kernel: 'nearest', background: TRANSPARENT,
          }).png().toBuffer(),
        ));
        const strip = await makeHorizontalStrip(cells, BASE_SIZE.width, BASE_SIZE.height);
        const outputPath = path.join(GENERATED, 'axem-female-' + color + '-' + action + '.png');
        await fs.writeFile(outputPath, strip);
        console.log('Generada animación femenina ' + color + '/' + action);
      }
      baseSource = await fs.readFile(path.join(GENERATED, 'super-axem-source-female.png'));
    }

    if (gender === 'female') {
      console.log(
        'Se conserva la imagen canónica femenina: ' +
        path.relative(ROOT, canonicalPosePath)
      );
    }

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

    console.log('Generado ' + path.relative(ROOT, basePath));
  }
}

async function main() {
  await fs.mkdir(GENERATED, { recursive: true });
  const retiredSpriteDirectories = [
    RESULTS('male', 'violet'),
    RESULTS('female', 'orange'),
    RESULTS('male', 'orange', 'source'),
    RESULTS('male', 'orange', 'sequences'),
    RESULTS('male', 'orange', 'supplemental'),
    RESULTS('female', 'violet', 'source'),
    RESULTS('female', 'violet', 'sequences'),
    RESULTS('female', 'violet', 'supplemental'),
  ];
  await Promise.all(retiredSpriteDirectories.map((directory) =>
    fs.rm(directory, { recursive: true, force: true }),
  ));
  // Elimina salidas antiguas que ya no forman parte del juego.
  const retiredAssets = [
    'menu-ranger-male-violet.png',
    'ranger-male-violet.png',
    'ranger-female-orange.png',
    'axem-male-violet-run.png',
    'axem-male-violet-bike.png',
    'axem-female-orange-run.png',
    'axem-female-orange-bike.png',
    ...['violet'].flatMap((color) => [
      'run', 'bike', 'bike-idle', 'bike-accelerate', 'bike-brake', 'bike-boost',
      'bike-victory', 'bike-defeat', 'double-axe', 'defeated', 'idle', 'dash', 'jump', 'roll',
      'guard', 'ko', 'charge', 'pose', 'battle-pose', 'teleport',
      'punch-01', 'punch-02', 'punch-03', 'hit', 'hurt',
    ].map((action) => 'axem-' + color + '-' + action + '.png')),
  ];
  await Promise.all(retiredAssets.map((name) => fs.rm(path.join(GENERATED, name), { force: true })));
  // El atlas femenino se agrupó por fila, no por acción. Estas salidas se habían
  // etiquetado sin evidencia de secuencia y no deben sobrevivir al pipeline.
  const retiredFemaleActionGifs = [
    'animations.json', 'idle.gif', 'walk.gif',
    'attack-01.gif', 'attack-02.gif', 'attack-03.gif',
    'charge.gif', 'teleport.gif',
  ];
  await Promise.all(retiredFemaleActionGifs.map((name) =>
    fs.rm(path.join(RESULTS('female', 'violet'), name), { force: true })
  ));
  await buildGender('male', ['orange']);
  await buildGender('female', ['violet']);
  await buildMenuSuperPoses();
  // Las tiras auxiliares solo existen durante la generación; no quedan versionadas.
  await Promise.all(retiredSpriteDirectories.map((directory) =>
    fs.rm(directory, { recursive: true, force: true }),
  ));
}

main().catch((error) => {
  console.error('No se pudieron preparar las hojas de Axem Rangers:', error);
  process.exitCode = 1;
});
