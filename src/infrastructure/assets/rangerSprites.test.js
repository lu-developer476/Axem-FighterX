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
  
  for (const color of COLORS) {
    for (const action of ['run', 'bike', 'double-axe']) {
      it(`male/${color}/${action} conserva celdas de animación uniformes de 53×83 px`, async () => {
        const animationPath = fileURLToPath(new URL(`../../../public/generated/axem-${color}-${action}.png`, import.meta.url));
        const metadata = await sharp(animationPath).metadata();
        expect(metadata.format).toBe('png');
        expect(metadata.height).toBe(83);
        expect(metadata.width % 53).toBe(0);
        expect(metadata.pages ?? 1).toBe(1);
      });
      it(`male/${color}/${action} genera un GIF animado con transparencia`, async () => {
        const gifPath = fileURLToPath(new URL(`../../../art/source/sprites/results/male/${color}/${action}.gif`, import.meta.url));
        const metadata = await sharp(gifPath, { animated: true }).metadata();
        expect(metadata.format).toBe('gif');
        expect(metadata.width).toBe(53);
        expect(metadata.pageHeight).toBe(83);
        expect(metadata.pages).toBeGreaterThan(1);
        expect(metadata.hasAlpha).toBe(true);
      });
    }
  }

});
