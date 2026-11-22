import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { detectCheckerboardColors, removeCheckerboardBackground } from '../src/infrastructure/graphics/checkerboardBackground.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_STANDARDS = JSON.parse(await fs.readFile(
  path.join(ROOT, 'art', 'source', 'sprites', 'asset-standards.json'),
  'utf8',
));
const CHARACTER_ARTWORK = ASSET_STANDARDS.categories.characterArtwork;
const REFERENCES = Object.freeze([
  {
    gender: 'female',
    file: path.join(ROOT, CHARACTER_ARTWORK.families.female.reference),
    label: 'Super Axem Pink',
  },
  {
    gender: 'male',
    file: path.join(ROOT, CHARACTER_ARTWORK.families.male.reference),
    label: 'Super Axem Red',
  },
]);

function boundsFromAlpha(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
  }
  if (right <= left || bottom <= top) throw new Error('El artwork no tiene píxeles visibles.');
  return { left, top, right, bottom };
}

async function scaleRedToOrange(sourceBuffer, family, label) {
  if (!family.visualBoundsReference) return sourceBuffer;

  const [source, target] = await Promise.all([
    sharp(sourceBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(path.join(ROOT, family.visualBoundsReference), { failOn: 'error' })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (
    source.info.width !== family.width || source.info.height !== family.height ||
    target.info.width !== family.width || target.info.height !== family.height
  ) {
    throw new Error(label + ': Red y Orange deben conservar el lienzo ' +
      family.width + 'x' + family.height + '.');
  }

  const sourceBounds = boundsFromAlpha(source.data, source.info.width, source.info.height);
  const targetBounds = boundsFromAlpha(target.data, target.info.width, target.info.height);
  const sourceWidth = sourceBounds.right - sourceBounds.left;
  const sourceHeight = sourceBounds.bottom - sourceBounds.top;
  const targetWidth = targetBounds.right - targetBounds.left;
  const targetHeight = targetBounds.bottom - targetBounds.top;

  // Escala uniforme por altura visible, sin deformar el pixel art. El ancho
  // proyectado se valida antes de escribir para evitar una coincidencia falsa.
  const scale = targetHeight / sourceHeight;
  const scaledWidth = Math.round(sourceWidth * scale);
  const scaledHeight = Math.round(sourceHeight * scale);
  const widthDifference = Math.abs(scaledWidth - targetWidth) / targetWidth;
  if (widthDifference > 0.04) {
    throw new Error('Las proporciones visibles de Red y Orange difieren demasiado para escalar sin deformar: ' +
      'ancho proyectado=' + scaledWidth + ', ancho Orange=' + targetWidth +
      ', diferencia=' + (widthDifference * 100).toFixed(2) + '%.');
  }

  const left = Math.round(targetBounds.left + (targetWidth - scaledWidth) / 2);
  const top = targetBounds.bottom - scaledHeight;
  if (left < 0 || top < 0 ||
      left + scaledWidth > family.width || top + scaledHeight > family.height) {
    throw new Error(label + ': la caja ajustada excede el lienzo: ' +
      JSON.stringify({ left, top, scaledWidth, scaledHeight }));
  }

  const resizedArtwork = await sharp(sourceBuffer).extract({
    left: sourceBounds.left,
    top: sourceBounds.top,
    width: sourceWidth,
    height: sourceHeight,
  }).resize(scaledWidth, scaledHeight, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();

  const output = await sharp({
    create: {
      width: family.width, height: family.height, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: resizedArtwork, left, top }])
    .png({ compressionLevel: 9, effort: 10 }).toBuffer();

  const verified = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const resultBounds = boundsFromAlpha(verified.data, verified.info.width, verified.info.height);
  const tolerance = family.visualBoundsTolerance ?? 2;
  const deltas = {
    left: Math.abs(resultBounds.left - targetBounds.left),
    top: Math.abs(resultBounds.top - targetBounds.top),
    right: Math.abs(resultBounds.right - targetBounds.right),
    bottom: Math.abs(resultBounds.bottom - targetBounds.bottom),
  };
  if (Object.values(deltas).some((delta) => delta > tolerance)) {
    throw new Error(label + ': el Red derivado no ocupa la misma caja visible que Orange: ' +
      'Orange=' + JSON.stringify(targetBounds) + '; Red=' + JSON.stringify(resultBounds) +
      '; diferencias=' + JSON.stringify(deltas) + '; tolerancia=' + tolerance + ' px.');
  }

  console.log(label + ': escala uniforme=' + scale.toFixed(4) + '×; caja Red=' +
    JSON.stringify(sourceBounds) + '; caja Orange=' + JSON.stringify(targetBounds) +
    '; derivado=' + JSON.stringify(resultBounds) + '. Nearest-neighbor, centro horizontal y pies alineados.');
  return output;
}

async function prepareReference({ file, label, gender }) {
  // Los masters de references nunca se reescriben. Se prepara una copia de
  // trabajo en el mismo lienzo. El Red masculino se escala proporcionalmente
  // para igualar la ocupación visual del artwork Orange original.
  const source = await fs.readFile(file);
  const metadata = await sharp(source, { failOn: 'error' }).metadata();
  const family = CHARACTER_ARTWORK.families[gender];

  if (metadata.width !== family.width || metadata.height !== family.height) {
    throw new Error(
      label + ': el master cambió de lienzo. Esperado ' +
      family.width + 'x' + family.height + ', recibido ' +
      metadata.width + 'x' + metadata.height + '. Actualizá asset-standards.json solo si el cambio es intencional.',
    );
  }

  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
      throw new Error(label + ': el patrón detectado no cubría suficiente área; se canceló el preparado.');
    }
  }

  let output = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png({ compressionLevel: 9, effort: 10 }).toBuffer();

  const family = CHARACTER_ARTWORK.families[gender];
  if (gender === 'male') {
    output = await scaleRedToOrange(output, family, label);
  }

  const resultMetadata = await sharp(output).metadata();
  const { data: verified } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparentAfter = 0;
  for (let offset = 3; offset < verified.length; offset += 4) {
    if (verified[offset] === 0) transparentAfter += 1;
  }

  if (
    resultMetadata.format !== 'png' ||
    !resultMetadata.hasAlpha ||
    resultMetadata.width !== family.width ||
    resultMetadata.height !== family.height ||
    transparentAfter === 0
  ) {
    throw new Error(label + ': el derivado no conserva el lienzo maestro o perdió la transparencia.');
  }

  const outputPath = path.join(ROOT, family.preparedSource);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, output);
  console.log(
    label + ': derivado preparado en ' + path.relative(ROOT, outputPath) +
    '; lienzo maestro conservado ' + family.width + 'x' + family.height +
    '; fondo quitado: ' + removedPixels + ' px; borde suavizado: ' + softenedPixels +
    '; transparencia previa: ' + transparentPixels +
    '; transparencia final: ' + transparentAfter + '; master original sin modificaciones.',
  );
}

async function main() {
  for (const reference of REFERENCES) {
    await prepareReference(reference);
  }
}

main().catch((error) => {
  console.error('No se pudieron preparar las referencias Super Axem:', error);
  process.exitCode = 1;
});
