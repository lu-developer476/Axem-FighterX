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

async function prepareReference({ file, label, gender }) {
  // Los masters de references nunca se reescriben. Se prepara una copia de
  // trabajo con el mismo lienzo, sin trim, crop, resize ni desplazamiento del arte.
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

  const output = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png({ compressionLevel: 9, effort: 10 }).toBuffer();

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
