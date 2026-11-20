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
const ACTION_GIF_SIZE = Object.freeze({ width: 150, height: 100 });
const SEQUENCE_GIF_SCALE = 1.75;
const SEQUENCE_GIF_FEET_MARGIN = 4;
const MENU_SIZE = Object.freeze({ width: 78, height: 112 });
const MENU_POSE_REFERENCES = Object.freeze([
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
      anchorX: Math.max(...group.frames.map((frame) => frame.pivotX ?? Math.round(frame.w / 2))),
      anchor: 'feet',
    });
  }
  await writeResult('male', color, path.join('sequences', 'index.json'), Buffer.from(JSON.stringify(index, null, 1) + '\n'));
  return index;
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
      const sequenceIndex = await writeMaleSequences(color, parts[0], manifest.male.groups);
      await writeMaleAnimation(run.frames, color, 'run', run.delay, run.loop);
      await writeMaleAnimation(bike.frames, color, 'bike', bike.delay, bike.loop);
      await writeMaleAnimation(doubleAxe.frames, color, 'double-axe', doubleAxe.delay, doubleAxe.loop);
      await buildMaleActionGifs(color, sequenceIndex);
      baseSource = run.frames[0];
    } else {
      const pinkReference = SOURCE('sprites', 'references', 'axem-pink');
      const files = [
        'axem-pink-spritesheet.png',
        'axem-pink-pose.png',
        'axem-pink-battle-pose.png',
        'axem-pink-levitate.png',
      ];
      const canonicalPosePath = path.join(
        RESULTS(gender),
        'axem-ranger-' + color + '.png',
      );
      const canonicalPose = await fs.readFile(canonicalPosePath);

      for (const file of files) {
        const outputName = file.replace(/^axem-pink-/, '');
        let corrected;
        if (file === 'axem-pink-pose.png') {
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
        await writeResult(gender, color, outputName, corrected);
      }
      baseSource = canonicalPose;
    }

    if (gender === 'female') {
      console.log(
        'Se conserva la imagen canónica femenina: ' +
        path.relative(ROOT, RESULTS(gender, 'axem-ranger-' + color + '.png'))
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
  await buildGender('male');
  await buildGender('female');
  await buildMenuMalePoses();
}

main().catch((error) => {
  console.error('No se pudieron preparar las hojas de Axem Rangers:', error);
  process.exitCode = 1;
});
