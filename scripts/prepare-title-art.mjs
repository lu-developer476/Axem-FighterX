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
  const result = removeSpriteBackground({ data: pixels, width: info.width, height: info.height }, {
    tolerance: 48,
    minBorderCoverage: 0.05,
  });
  if (!result.backgroundColor || result.removedPixels < info.width * info.height * 0.05) {
    throw new Error('No se detectó un fondo uniforme conectado al borde de title.png.');
  }
  const transparent = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: TRANSPARENT, threshold: 1 })
    .resize({ ...MAX_SIZE, fit: 'contain', kernel: 'nearest', background: TRANSPARENT })
    .png({ compressionLevel: 9, effort: 10, palette: true, quality: 100 })
    .toBuffer();
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, transparent);
  const metadata = await sharp(transparent).metadata();
  console.log('Título transparente generado: ' + metadata.width + 'x' + metadata.height +
    ' (' + Math.round(transparent.length / 1024) + ' KB); ' + result.removedPixels +
    ' píxeles de fondo eliminados.');
}
main().catch((error) => {
  console.error('No se pudo preparar title.png:', error);
  process.exitCode = 1;
});
