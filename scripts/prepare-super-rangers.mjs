import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { detectCheckerboardColors, removeCheckerboardBackground } from '../src/infrastructure/graphics/checkerboardBackground.js';

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
