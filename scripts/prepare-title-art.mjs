import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { removeSpriteBackground } from '../src/infrastructure/graphics/removeSpriteBackground.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'art', 'source', 'title.png');
const OUTPUT = path.join(ROOT, 'public', 'generated', 'title.png');
const MAX_SIZE = { width: 436, height: 78 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  const { data, info } = await sharp(SOURCE, { failOn: 'error' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

  // Si el original ya contiene transparencia, conservarla y evitar volver a
  // aplicar el recorte de fondo en ejecuciones posteriores del pipeline.
  let transparentPixels = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] < 255) transparentPixels += 1;
  }

  let removedPixels = 0;
  if (transparentPixels === 0) {
    const result = removeSpriteBackground(
      { data: pixels, width: info.width, height: info.height },
      {
        // El fondo es negro; una tolerancia baja conserva mejor el resplandor rojo.
        tolerance: 18,
        minBorderCoverage: 0.05,
      },
    );
    if (!result.backgroundColor || result.removedPixels < info.width * info.height * 0.02) {
      throw new Error('No se detectó suficiente fondo negro conectado al borde de title.png.');
    }
    removedPixels = result.removedPixels;
  }

  // Elimina el lienzo vacío y deja solo un margen transparente uniforme de 8 px.
  const cropped = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: TRANSPARENT, threshold: 1 })
    .extend({
      top: 8,
      bottom: 8,
      left: 8,
      right: 8,
      background: TRANSPARENT,
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const croppedMetadata = await sharp(cropped).metadata();
  if (!croppedMetadata.width || !croppedMetadata.height) {
    throw new Error('El recorte de title.png produjo un lienzo vacío.');
  }

  // title.png es el asset fuente: versionar aquí la versión transparente y recortada.
  await fs.writeFile(SOURCE, cropped);

  const output = await sharp(cropped)
    .resize({ ...MAX_SIZE, fit: 'contain', kernel: 'nearest', background: TRANSPARENT })
    .png({ compressionLevel: 9, effort: 10, palette: true, quality: 100 })
    .toBuffer();
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, output);

  const outputMetadata = await sharp(output).metadata();
  console.log(
    'Título transparente generado: fuente ' + croppedMetadata.width + 'x' + croppedMetadata.height +
    ', salida ' + outputMetadata.width + 'x' + outputMetadata.height +
    ' (' + Math.round(output.length / 1024) + ' KB); ' + removedPixels +
    ' píxeles de fondo eliminados; margen transparente de 8 px.',
  );
}
main().catch((error) => {
  console.error('No se pudo preparar title.png:', error);
  process.exitCode = 1;
});
