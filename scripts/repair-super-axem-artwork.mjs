import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const SOURCE_COMMIT = '2f64e22a82304c55e5f92ac652606e0210efbba7';
const ORANGE = 'art/source/sprites/results/male/orange/super-axem-ranger-orange.png';
const VIOLET = 'art/source/sprites/results/female/violet/super-axem-ranger-violet.png';

function readOriginal(path) {
  return execFileSync('git', ['show', SOURCE_COMMIT + ':' + path], {
    maxBuffer: 20 * 1024 * 1024,
  });
}

async function main() {
  const orange = readOriginal(ORANGE);
  const violet = readOriginal(VIOLET);
  const orangeInfo = await sharp(orange).metadata();
  const violetInfo = await sharp(violet).metadata();

  if (orangeInfo.width !== 857 || orangeInfo.height !== 1171) {
    throw new Error('Dimensiones inesperadas en el artwork Orange original.');
  }
  if (violetInfo.width !== 617 || violetInfo.height !== 1024) {
    throw new Error('Dimensiones inesperadas en el artwork Violet original.');
  }

  // Orange ya tiene las dimensiones correctas: se restaura sin recodificarlo.
  await fs.writeFile(ORANGE, orange);

  // Violet: lienzo transparente de 745 × 1372, centrado horizontalmente
  // y alineado abajo. No se escala, interpola ni recolorea ningún píxel.
  const left = 64;
  const top = 348;
  const violetOutput = await sharp(violet)
    .extend({
      top, bottom: 0, left, right: 64,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const outputInfo = await sharp(violetOutput).metadata();
  if (outputInfo.width !== 745 || outputInfo.height !== 1372 || !outputInfo.hasAlpha) {
    throw new Error('Violet no quedó en un lienzo transparente de 745 × 1372.');
  }

  const originalPixels = await sharp(violet).ensureAlpha().raw().toBuffer();
  const preservedPixels = await sharp(violetOutput)
    .extract({ left, top, width: 617, height: 1024 })
    .ensureAlpha().raw().toBuffer();
  if (!originalPixels.equals(preservedPixels)) {
    throw new Error('Se modificaron píxeles o colores del artwork Violet.');
  }

  await fs.writeFile(VIOLET, violetOutput);
  console.log('Orange: 857 × 1171 px; paleta naranja original restaurada.');
  console.log('Violet: 745 × 1372 px; paleta violeta y píxeles originales preservados.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
