import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PADDING = 4; // Margen mínimo uniforme tras eliminar la cuadrícula falsa de transparencia.
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const REFERENCES = Object.freeze([
  {
    file: path.join(ROOT, 'art', 'source', 'sprites', 'references', 'axem-pink', 'super-axem-pink.png'),
    label: 'Super Axem Pink',
  },
  {
    file: path.join(ROOT, 'art', 'source', 'sprites', 'references', 'axem-red', 'super-axem-red.png'),
    label: 'Super Axem Red',
  },
]);
const CANVAS_REFERENCES = Object.freeze([
  {
    file: path.join(ROOT, 'art', 'source', 'sprites', 'references', 'axem-pink', 'axem-pink-pose.png'),
    label: 'Axem Pink pose',
  },
  {
    file: path.join(ROOT, 'art', 'source', 'sprites', 'references', 'axem-pink', 'axem-pink-spritesheet.png'),
    label: 'Axem Pink spritesheet',
  },
  {
    file: path.join(ROOT, 'art', 'source', 'sprites', 'references', 'axem-red', 'axem-red-spritesheet.png'),
    label: 'Axem Red spritesheet',
  },
]);

function colorDistance(pixel, color) {
  const red = pixel[0] - color[0];
  const green = pixel[1] - color[1];
  const blue = pixel[2] - color[2];
  return Math.sqrt(red * red + green * green + blue * blue);
}

function detectCheckerboardColors(data, width, height) {
  const histogram = new Map();
  const add = (x, y) => {
    const offset = (y * width + x) * 4;
    if (data[offset + 3] < 16) return;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const key = (red >> 4) + ',' + (green >> 4) + ',' + (blue >> 4);
    const entry = histogram.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    entry.count += 1;
    entry.red += red;
    entry.green += green;
    entry.blue += blue;
    histogram.set(key, entry);
  };

  for (let x = 0; x < width; x += 1) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    add(0, y);
    add(width - 1, y);
  }

  const ranked = Array.from(histogram.values()).sort((left, right) => right.count - left.count);
  const borderPixels = ranked.reduce((sum, entry) => sum + entry.count, 0);
  const toColor = (entry) => [
    Math.round(entry.red / entry.count),
    Math.round(entry.green / entry.count),
    Math.round(entry.blue / entry.count),
  ];
  const firstEntry = ranked[0];
  if (!firstEntry || borderPixels === 0) {
    throw new Error('No se pudieron analizar los píxeles del contorno.');
  }

  const first = toColor(firstEntry);
  const firstCoverage = firstEntry.count / borderPixels;
  const isNeutral = (color) => Math.max(...color) - Math.min(...color) <= 24;

  // Las referencias pueden usar fondos lisos de distintos colores. Se acepta
  // un color dominante solo si cubre claramente la mayor parte del contorno;
  // el borrado sigue limitado a píxeles conectados al borde del lienzo.
  if (firstCoverage >= 0.65) {
    return { colors: [first], borderCoverage: firstCoverage, backgroundType: 'solid' };
  }

  const secondEntry = ranked[1];
  if (!secondEntry) {
    throw new Error('No se encontró un segundo color válido en el contorno.');
  }
  const second = toColor(secondEntry);
  const secondCoverage = secondEntry.count / borderPixels;
  const separation = colorDistance(first, second);
  if (
    firstCoverage < 0.12 ||
    secondCoverage < 0.12 ||
    firstCoverage + secondCoverage < 0.55 ||
    !isNeutral(first) ||
    !isNeutral(second) ||
    ((first[0] + first[1] + first[2]) / 3) < 120 ||
    ((second[0] + second[1] + second[2]) / 3) < 120 ||
    separation < 12 ||
    separation > 110
  ) {
    const palette = ranked.slice(0, 5).map((entry) => ({
      color: toColor(entry),
      coverage: Number((entry.count / borderPixels).toFixed(3)),
    }));
    throw new Error(
      'No se reconoció el fondo del contorno; no se modificó el sprite. Colores detectados: ' +
      JSON.stringify(palette),
    );
  }

  return {
    colors: [first, second],
    borderCoverage: firstCoverage + secondCoverage,
    backgroundType: 'checkerboard',
  };
}

function removeCheckerboardBackground(data, width, height, colors) {
  const total = width * height;
  const tolerance = 22;
  const toleranceSquared = tolerance * tolerance;
  const matchesBackground = (index) => {
    const offset = index * 4;
    if (data[offset + 3] < 16) return false;
    const pixel = data.subarray(offset, offset + 3);
    return colors.some((color) => {
      const red = pixel[0] - color[0];
      const green = pixel[1] - color[1];
      const blue = pixel[2] - color[2];
      return red * red + green * green + blue * blue <= toleranceSquared;
    });
  };

  const visited = new Uint8Array(total);
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;
  const enqueue = (index) => {
    if (visited[index] || !matchesBackground(index)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  // La cuadrícula alterna colores; la conectividad diagonal permite seguir
  // cada celda hasta el borde sin eliminar áreas aisladas dentro del personaje.
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        enqueue(ny * width + nx);
      }
    }
  }

  for (let index = 0; index < total; index += 1) {
    if (visited[index]) data[index * 4 + 3] = 0;
  }

  // Atenúa solo el halo gris pegado al fondo eliminado.
  let softenedPixels = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (visited[index]) continue;
      const offset = index * 4;
      if (data[offset + 3] < 16) continue;
      let touchesBackground = false;
      for (let dy = -1; dy <= 1 && !touchesBackground; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          if (visited[(y + dy) * width + x + dx]) {
            touchesBackground = true;
            break;
          }
        }
      }
      if (!touchesBackground) continue;

      const pixel = data.subarray(offset, offset + 3);
      const distance = Math.min(...colors.map((color) => colorDistance(pixel, color)));
      const fringeLimit = 36;
      if (distance >= fringeLimit) continue;
      const coverage = Math.max(0.12, Math.min(1, (distance - 8) / 28));
      data[offset + 3] = Math.round(data[offset + 3] * coverage);
      softenedPixels += 1;
    }
  }

  return { removedPixels: tail, softenedPixels };
}

async function prepareReference({ file, label }) {
  const source = await fs.readFile(file);
  const metadata = await sharp(source, { failOn: 'error' }).metadata();
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

  let transparentPixels = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] === 0) transparentPixels += 1;
  }

  let removedPixels = 0;
  let softenedPixels = 0;
  let backgroundColors = [];

  if (transparentPixels === 0) {
    const detected = detectCheckerboardColors(pixels, info.width, info.height);
    backgroundColors = detected.colors;
    const result = removeCheckerboardBackground(pixels, info.width, info.height, backgroundColors);
    removedPixels = result.removedPixels;
    softenedPixels = result.softenedPixels;
    if (removedPixels < info.width * info.height * 0.1) {
      throw new Error(label + ': el patrón detectado no cubría suficiente área; se canceló el recorte.');
    }
  }

  const preparedPixels = Buffer.from(pixels);
  const output = await sharp(preparedPixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: TRANSPARENT, threshold: 1 })
    .extend({
      top: PADDING,
      bottom: PADDING,
      left: PADDING,
      right: PADDING,
      background: TRANSPARENT,
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const resultMetadata = await sharp(output).metadata();
  if (!resultMetadata.hasAlpha || resultMetadata.width <= PADDING * 2 || resultMetadata.height <= PADDING * 2) {
    throw new Error(label + ': el PNG recortado no conserva dimensiones o transparencia válidas.');
  }

  const corner = await sharp(output)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .ensureAlpha()
    .raw()
    .toBuffer();
  if (corner[3] !== 0) {
    throw new Error(label + ': el margen de seguridad no quedó transparente.');
  }

  if (!source.equals(output)) {
    await fs.writeFile(file, output);
  }

  console.log(
    label + ': ' + metadata.width + 'x' + metadata.height + ' -> ' +
    resultMetadata.width + 'x' + resultMetadata.height +
    '; fondo quitado: ' + removedPixels + ' px; borde suavizado: ' + softenedPixels +
    '; tipo de fondo: ' + (backgroundColors.length === 1 ? 'blanco uniforme' : 'cuadrícula gris') +
    '; colores de fondo: ' + JSON.stringify(backgroundColors) +
    '; transparencia previa: ' + transparentPixels +
    '; margen transparente: ' + PADDING + ' px.',
  );
}

/**
 * Quita el fondo de hojas y poses sin recortar el lienzo: las hojas de cuadros
 * conservan sus coordenadas originales para no romper atlasFrames.json.
 */
async function prepareCanvasReference({ file, label }) {
  const source = await fs.readFile(file);
  const metadata = await sharp(source, { failOn: 'error' }).metadata();
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const borderPixels = info.width * 2 + info.height * 2 - 4;
  let transparentBorderPixels = 0;

  for (let x = 0; x < info.width; x += 1) {
    if (pixels[x * 4 + 3] < 16) transparentBorderPixels += 1;
    const bottom = ((info.height - 1) * info.width + x) * 4 + 3;
    if (pixels[bottom] < 16) transparentBorderPixels += 1;
  }
  for (let y = 1; y < info.height - 1; y += 1) {
    if (pixels[(y * info.width) * 4 + 3] < 16) transparentBorderPixels += 1;
    if (pixels[(y * info.width + info.width - 1) * 4 + 3] < 16) transparentBorderPixels += 1;
  }

  const corners = [
    pixels[3],
    pixels[(info.width - 1) * 4 + 3],
    pixels[((info.height - 1) * info.width) * 4 + 3],
    pixels[(info.height * info.width - 1) * 4 + 3],
  ];
  const alreadyTransparent = transparentBorderPixels / borderPixels >= 0.75
    && corners.every((alpha) => alpha < 16);

  let removedPixels = 0;
  let softenedPixels = 0;
  let backgroundColors = [];

  if (!alreadyTransparent) {
    const detected = detectCheckerboardColors(pixels, info.width, info.height);
    backgroundColors = detected.colors;
    const result = removeCheckerboardBackground(
      pixels,
      info.width,
      info.height,
      backgroundColors,
    );
    removedPixels = result.removedPixels;
    softenedPixels = result.softenedPixels;

    if (removedPixels < info.width * info.height * 0.05) {
      throw new Error(label + ': se detectó un fondo, pero el área eliminada fue demasiado pequeña; no se guardó el archivo.');
    }
  }

  const output = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const resultMetadata = await sharp(output).metadata();
  const { data: verified, info: verifiedInfo } = await sharp(output)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparentPixels = 0;
  for (let offset = 3; offset < verified.length; offset += 4) {
    if (verified[offset] === 0) transparentPixels += 1;
  }
  const verifiedCorners = [
    verified[3],
    verified[(verifiedInfo.width - 1) * 4 + 3],
    verified[((verifiedInfo.height - 1) * verifiedInfo.width) * 4 + 3],
    verified[(verifiedInfo.width * verifiedInfo.height - 1) * 4 + 3],
  ];

  if (
    !resultMetadata.hasAlpha ||
    resultMetadata.width !== metadata.width ||
    resultMetadata.height !== metadata.height ||
    transparentPixels < info.width * info.height * 0.05 ||
    !verifiedCorners.some((alpha) => alpha === 0)
  ) {
    throw new Error(label + ': el PNG no conserva el lienzo original o no presenta suficiente transparencia.');
  }

  if (!source.equals(output)) {
    await fs.writeFile(file, output);
  }

  console.log(
    label + ': fondo transparente; lienzo conservado ' +
    metadata.width + 'x' + metadata.height +
    '; fondo eliminado: ' + removedPixels + ' px; halo suavizado: ' + softenedPixels +
    '; tipo: ' + (alreadyTransparent ? 'ya transparente' : 'fondo detectado') +
    '; colores: ' + JSON.stringify(backgroundColors) +
    '; transparencia total: ' + transparentPixels + ' px.',
  );
}

async function main() {
  for (const reference of REFERENCES) {
    await prepareReference(reference);
  }
  for (const reference of CANVAS_REFERENCES) {
    await prepareCanvasReference(reference);
  }
}

main().catch((error) => {
  console.error('No se pudieron preparar las referencias Super Axem:', error);
  process.exitCode = 1;
});
