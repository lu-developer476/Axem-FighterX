import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PADDING = 4;
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

async function prepareReference({ file, label }) {
  const source = await fs.readFile(file);
  const metadata = await sharp(source, { failOn: 'error' }).metadata();

  if (!metadata.hasAlpha) {
    throw new Error(label + ': el PNG no tiene canal alfa; se cancela para no borrar píxeles del personaje.');
  }

  const alphaData = await sharp(source)
    .ensureAlpha()
    .extract({ left: 0, top: 0, width: metadata.width, height: metadata.height })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let transparentPixels = 0;
  let semiTransparentPixels = 0;
  for (let offset = 3; offset < alphaData.data.length; offset += 4) {
    const alpha = alphaData.data[offset];
    if (alpha === 0) transparentPixels += 1;
    else if (alpha < 255) semiTransparentPixels += 1;
  }

  if (transparentPixels === 0) {
    throw new Error(label + ': no se detectaron píxeles transparentes; se cancela el recorte automático.');
  }

  const output = await sharp(source, { failOn: 'error' })
    .ensureAlpha()
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

  // Los extremos del lienzo deben seguir siendo completamente transparentes.
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
    '; alfa transparente: ' + transparentPixels +
    '; alfa semitransparente preservado: ' + semiTransparentPixels +
    '; margen: ' + PADDING + ' px.',
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
