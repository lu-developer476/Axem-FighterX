import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';

const spriteUrl = (rangerId) =>
  fileURLToPath(new URL(`../../../art/source/axem-ranger-${rangerId}.png`, import.meta.url));

async function readRgba(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

describe('Sprites base de los rangers (violeta y naranja)', () => {
  for (const rangerId of [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE]) {
    it(`axem-ranger-${rangerId}.png tiene fondo totalmente transparente`, async () => {
      const { data, width, height } = await readRgba(spriteUrl(rangerId));
      const alphaAt = (x, y) => data[(y * width + x) * 4 + 3];

      // Esquinas y todo el contorno: ningún píxel opaco ni semitransparente.
      let borderMaxAlpha = 0;
      for (let x = 0; x < width; x++) {
        borderMaxAlpha = Math.max(borderMaxAlpha, alphaAt(x, 0), alphaAt(x, height - 1));
      }
      for (let y = 0; y < height; y++) {
        borderMaxAlpha = Math.max(borderMaxAlpha, alphaAt(0, y), alphaAt(width - 1, y));
      }
      expect(borderMaxAlpha).toBe(0);

      // El fondo ocupa la mayor parte del lienzo y el personaje sigue opaco.
      let transparent = 0;
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] === 0) transparent += 1;
        else if (data[i] === 255) opaque += 1;
      }
      const total = width * height;
      expect(transparent / total).toBeGreaterThan(0.5);
      expect(opaque / total).toBeGreaterThan(0.1);
    });
  }
});
