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
// Estas salidas femeninas contienen correcciones manuales de paleta validadas.
// Se preservan desde el repositorio para que pretest/prebuild no las regenere
// desde Axem Pink y sobrescriba los ajustes de Orange y Violet.
const FEMALE_PRESERVED_PALETTE_ASSETS = new Set(['spritesheet.png']);
const BASE_SIZE = Object.freeze({ width: 53, height: 83 });
const ACTION_GIF_SIZE = Object.freeze({ width: 150, height: 100 });
const SEQUENCE_GIF_SCALE = 1.75;
const SEQUENCE_GIF_FEET_MARGIN = 4;
/** Altura visible estándar del personaje de pie, común a todas las animaciones masculinas. */
const STANDARD_STANDING_HEIGHT = 78;
const MENU_SIZE = Object.freeze({ width: 78, height: 112 });
const MENU_POSE_REFERENCES = Object.freeze([
  SOURCE('sprites', 'references', 'axem-red', 'axem-red-spritesheet.png'),
]);
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
  const outputPath = path.join(GENERATED, 'axem-' + rangerId + '-' + action + '.png');
  await fs.writeFile(outputPath, strip);
  console.log('Generada animación ' + path.relative(ROOT, outputPath));

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

  await writeMaleSequenceGif(frames('group-01', 'group-02'), color, 'idle', 140);

  await writeMaleSequenceGif(frames('group-03'), color, 'punch-01', 90);
  await writeMaleSequenceGif(frames('group-04'), color, 'punch-02', 90);
  await writeMaleSequenceGif(frames('group-05'), color, 'punch-03', 90);

  await writeMaleSequenceGif(
    frames('group-09', 'group-08', 'group-07', 'group-06'),
    color,
    'battle-pose',
    120,
  );

  await writeMaleSequenceGif(frames('group-10'), color, 'run', 80);
  await writeMaleSequenceGif(frames('group-11'), color, 'dash', 80);
  await writeMaleSequenceGif(frames('group-12'), color, 'jump', 100);

  await writeMaleSequenceGif(groups.get('group-13').slice(0, 2), color, 'hit', 120);
  await writeMaleSequenceGif(groups.get('group-13').slice(3, 6), color, 'hurt', 150);

  await writeMaleSequenceGif(frames('group-14'), color, 'teleport', 100);
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
async function createGrayRollSmokeCover(angle) {
  const rotation = ((angle % 360) + 360) % 360;
  const svg = Buffer.from(`
    <svg width="150" height="100" viewBox="0 0 150 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="smoke" cx="48%" cy="40%" r="68%">
          <stop offset="0" stop-color="#d9dce1"/>
          <stop offset="0.48" stop-color="#aeb3bb"/>
          <stop offset="1" stop-color="#686e77"/>
        </radialGradient>
        <linearGradient id="swirlLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f0f2f5"/>
          <stop offset="1" stop-color="#8b919a"/>
        </linearGradient>
      </defs>
      <g transform="rotate(${rotation} 75 52)">
        <!-- Masa cerrada y opaca: no deja ver el sprite que queda debajo. -->
        <path
          d="M 12 59
             C 7 48, 14 34, 27 31
             C 24 18, 39 8, 52 15
             C 61 3, 79 5, 86 16
             C 101 8, 117 18, 116 31
             C 132 29, 143 42, 136 55
             C 147 66, 137 82, 122 82
             C 114 96, 96 97, 84 87
             C 70 99, 51 92, 48 82
             C 31 89, 15 78, 20 66
             C 15 65, 12 63, 12 59 Z"
          fill="url(#smoke)" opacity="1"/>
        <ellipse cx="75" cy="53" rx="51" ry="32" fill="#9ba1aa" opacity="0.34"/>
        <!-- Bandas de giro encima de la nube, también opacas en su trazo. -->
        <path d="M 20 55 C 39 22, 89 15, 124 39"
          fill="none" stroke="url(#swirlLight)" stroke-width="6"
          stroke-linecap="round" opacity="0.94"/>
        <path d="M 29 72 C 57 91, 108 79, 130 53"
          fill="none" stroke="#5f6670" stroke-width="7"
          stroke-linecap="round" opacity="0.88"/>
        <path d="M 44 36 C 61 22, 94 24, 108 43 C 119 59, 101 72, 81 69"
          fill="none" stroke="#e1e4e8" stroke-width="4.5"
          stroke-linecap="round" opacity="0.9"/>
        <path d="M 40 59 C 54 43, 77 40, 95 49"
          fill="none" stroke="#747b85" stroke-width="5"
          stroke-linecap="round" opacity="0.82"/>
      </g>
    </svg>
  `);

  return sharp(svg).png().toBuffer();
}

/**
 * Mantiene los ecos grises detrás y coloca una nube giratoria opaca delante.
 * La nube cubre el cuerpo completo: durante el giro no deben distinguirse
 * cabeza, brazos, piernas ni detalles del personaje.
 */
/**
 * Estela de humo visible detrás de la nube. Las bandas atraviesan solo la
 * superficie del humo y salen por el borde izquierdo, como rastro de velocidad.
 */
async function createGrayRollSmokeTrail() {
  const svg = Buffer.from(`
    <svg width="150" height="100" viewBox="0 0 150 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="plume" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#aeb4bd" stop-opacity="0.04"/>
          <stop offset="0.28" stop-color="#c8cdd4" stop-opacity="0.42"/>
          <stop offset="0.72" stop-color="#a4aab3" stop-opacity="0.82"/>
          <stop offset="1" stop-color="#777e88" stop-opacity="0.12"/>
        </linearGradient>
        <linearGradient id="plumeShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#747b85" stop-opacity="0"/>
          <stop offset="0.58" stop-color="#747b85" stop-opacity="0.55"/>
          <stop offset="1" stop-color="#626a75" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
      <!-- Cola continua: nace ancha junto al giro y se afina hacia atrás. -->
      <path d="M 0 48
        C 17 40, 28 43, 42 40
        C 53 37, 62 42, 77 45
        C 61 49, 53 53, 39 52
        C 24 52, 14 59, 0 56 Z"
        fill="url(#plume)"/>
      <path d="M 0 47
        C 21 45, 34 35, 50 39
        C 62 42, 68 46, 81 46
        C 62 48, 48 48, 35 50
        C 19 52, 10 53, 0 51 Z"
        fill="#d8dce2" opacity="0.36"/>
      <path d="M 0 57
        C 20 54, 31 48, 46 50
        C 60 52, 67 49, 82 48
        C 65 55, 55 59, 40 57
        C 23 55, 13 63, 0 62 Z"
        fill="url(#plumeShade)"/>
      <!-- Mechones finos que dan lectura de humo arrastrado, no de líneas. -->
      <path d="M 1 42 C 20 34, 32 39, 48 37 S 67 42, 78 44"
        fill="none" stroke="#e1e4e9" stroke-width="4"
        stroke-linecap="round" opacity="0.48"/>
      <path d="M 0 61 C 17 57, 31 55, 43 57 S 64 53, 78 49"
        fill="none" stroke="#737b85" stroke-width="5"
        stroke-linecap="round" opacity="0.48"/>
      <path d="M 3 51 C 18 47, 28 48, 41 45 S 59 46, 70 47"
        fill="none" stroke="#f0f1f4" stroke-width="2"
        stroke-linecap="round" opacity="0.52"/>
    </svg>
  `);
  return sharp(svg).blur(2.8).png().toBuffer();
}

/**
 * Construye la rodada en el lienzo final. Los ecos desplazados y las bandas
 * de humo permanecen dentro del cuadro visible; la nube opaca queda delante
 * del personaje, tapándolo por completo sin borrar la estela.
 */
async function addGrayRollMotionBlur(input, angle) {
  const echo = await sharp(input)
    .greyscale()
    .tint({ r: 148, g: 152, b: 160 })
    .blur(5.2)
    .png()
    .toBuffer();

  const blurredBody = await sharp(input)
    .greyscale()
    .tint({ r: 158, g: 162, b: 170 })
    .blur(6.5)
    .png()
    .toBuffer();

  const diffuseCore = await sharp(input)
    .greyscale()
    .tint({ r: 126, g: 130, b: 138 })
    .blur(9)
    .png()
    .toBuffer();

  const smokeCover = await createGrayRollSmokeCover(angle);
  const smokeTrail = await createGrayRollSmokeTrail();

  return sharp({
    create: {
      width: ACTION_GIF_SIZE.width,
      height: ACTION_GIF_SIZE.height,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([
      // Ecos de movimiento a la izquierda: el desplazamiento ya no se recorta.
      { input: echo, left: -22, top: 8, opacity: 0.18 },
      { input: echo, left: -13, top: 5, opacity: 0.22 },
      { input: echo, left: -5, top: 2, opacity: 0.27 },
      { input: diffuseCore, left: 0, top: 0, opacity: 0.34 },
      { input: blurredBody, left: 0, top: 0, opacity: 0.88 },
      // Nube principal delante del cuerpo, con opacidad total.
      // Cola larga y afinada detrás del giro; queda parcialmente oculta
      // bajo la nube, por eso parece nacer de ella y prolongarse hacia atrás.
      { input: smokeTrail, left: 0, top: 0, opacity: 1 },
      // La nube se reduce y desplaza ligeramente a la derecha para dejar
      // espacio real a la cola de humo dentro del lienzo de 150×100.
      { input: await sharp(smokeCover).resize(118, 78).png().toBuffer(), left: 22, top: 11, opacity: 1 },
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
  const blurredRollFrames = await Promise.all(rollFrames.map((frame, index) => addGrayRollMotionBlur(frame, rollAngles[index])));
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

  for (const [index, [color, targetHue]] of Object.entries(COLORS).filter(([color]) => color === 'orange').entries()) {
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
      const manifest = JSON.parse(await fs.readFile(ATLAS_FRAMES_PATH, 'utf8'));
      const sequenceIndex = await writeMaleSequences(color, parts[0], manifest.male.groups);
      await writeMaleSupplemental(color, parts[0], manifest.male.supplementalGroups || []);
      await writeMaleAnimation(run.frames, color, 'run', run.delay, run.loop);
      await writeMaleAnimation(bike.frames, color, 'bike', bike.delay, bike.loop);
      await writeMaleAnimation(doubleAxe.frames, color, 'double-axe', doubleAxe.delay, doubleAxe.loop);
      await buildMaleActionGifs(color, sequenceIndex);
      await buildMaleSharedExtraGifs(color);
      await writeMaleGameStrips(color);
      baseSource = run.frames[0];
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
      const canonicalPose = await fs.readFile(canonicalPosePath);

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
      baseSource = canonicalPose;
    }

    if (gender === 'female') {
      const manifest = JSON.parse(await fs.readFile(ATLAS_FRAMES_PATH, 'utf8'));
      await writeFemaleSequences(color, parts[0], manifest.female.groups);
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
  // Elimina salidas antiguas de las dos combinaciones que ya no forman parte del juego.
  const retiredAssets = [
    'ranger-male-violet.png',
    'ranger-female-orange.png',
    'menu-ranger-male-violet.png',
    ...['violet'].flatMap((color) => [
      'run', 'bike', 'bike-idle', 'bike-accelerate', 'bike-brake', 'bike-boost',
      'bike-victory', 'bike-defeat', 'double-axe', 'defeated', 'idle', 'dash', 'jump', 'roll',
      'guard', 'ko', 'charge', 'pose', 'battle-pose', 'teleport',
      'punch-01', 'punch-02', 'punch-03', 'hit', 'hurt',
    ].map((action) => 'axem-' + color + '-' + action + '.png')),
  ];
  await Promise.all(retiredAssets.map((name) => fs.rm(path.join(GENERATED, name), { force: true })));
  await buildGender('male', ['orange']);
  await buildGender('female', ['violet']);
  await buildMenuMalePoses();
}

main().catch((error) => {
  console.error('No se pudieron preparar las hojas de Axem Rangers:', error);
  process.exitCode = 1;
});
