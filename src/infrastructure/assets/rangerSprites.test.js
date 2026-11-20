import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const COLORS = ['violet', 'orange'];
const GENDERS = ['male', 'female'];
const generatedSpritePath = (gender, color) =>
  fileURLToPath(new URL(`../../../public/generated/ranger-${gender}-${color}.png`, import.meta.url));
const resultAtlasPath = (gender, color) =>
  fileURLToPath(new URL(`../../../art/source/sprites/results/${gender}/axem-ranger-${color}.png`, import.meta.url));

describe('Variantes de Axem Rangers', () => {
  for (const gender of GENDERS) {
    for (const color of COLORS) {
      it(`${gender}/${color} genera una hoja de referencia PNG con transparencia`, async () => {
        const metadata = await sharp(resultAtlasPath(gender, color)).metadata();
        expect(metadata.format).toBe('png');
        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);
        expect(metadata.hasAlpha).toBe(true);
      });

      it(`${gender}/${color} genera una textura de combate de 53×83 px`, async () => {
        const metadata = await sharp(generatedSpritePath(gender, color)).metadata();
        expect(metadata.format).toBe('png');
        expect(metadata.width).toBe(53);
        expect(metadata.height).toBe(83);
        expect(metadata.hasAlpha).toBe(true);
      });
    }
  }
});
