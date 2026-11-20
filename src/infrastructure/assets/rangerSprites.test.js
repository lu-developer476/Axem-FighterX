import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const COLORS = ['violet', 'orange'];
const GENDERS = ['male', 'female'];
const generatedSpritePath = (gender, color) =>
  fileURLToPath(new URL(`../../../public/generated/ranger-${gender}-${color}.png`, import.meta.url));
const femaleReferencePath = (color) =>
  fileURLToPath(new URL(`../../../art/source/sprites/results/female/axem-ranger-${color}.png`, import.meta.url));
const maleMenuPosePath = (color) =>
  fileURLToPath(new URL(`../../../public/generated/menu-ranger-male-${color}.png`, import.meta.url));
const maleCompositePath = (color) =>
  fileURLToPath(new URL(`../../../art/source/sprites/results/male/axem-ranger-${color}.png`, import.meta.url));
const maleSpritesheetPath = (color) =>
  fileURLToPath(new URL(`../../../art/source/sprites/results/male/${color}/spritesheet.png`, import.meta.url));

describe('Variantes de Axem Rangers', () => {
  for (const gender of GENDERS) {
    for (const color of COLORS) {
      it(`${gender}/${color} genera una hoja de referencia PNG con transparencia`, async () => {
        const referencePath = gender === 'male' ? maleSpritesheetPath(color) : femaleReferencePath(color);
        const metadata = await sharp(referencePath).metadata();
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
    it(`male/${color} genera la hoja principal sin una copia compuesta redundante`, async () => {
      await expect(import('node:fs/promises').then(({ access }) => access(maleCompositePath(color))))
        .rejects.toMatchObject({ code: 'ENOENT' });
      const metadata = await sharp(maleSpritesheetPath(color)).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.hasAlpha).toBe(true);
    });

    it(`male/${color} genera el retrato de menú desde la referencia Axem Red`, async () => {
      const metadata = await sharp(maleMenuPosePath(color)).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(78);
      expect(metadata.height).toBe(112);
      expect(metadata.hasAlpha).toBe(true);
    });

    it(`male/${color} conserva una base de cabello negra y puntas marrones`, async () => {
      const { data, info } = await sharp(maleSpritesheetPath(color))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let darkPixels = 0;
      let brownPixels = 0;

      for (let offset = 0; offset < data.length; offset += 4) {
        if (data[offset + 3] < 24) continue;
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        if (Math.max(red, green, blue) <= 32) darkPixels += 1;
        if (
          red >= 70 && red <= 185 &&
          green >= 30 && green <= 125 &&
          blue >= 12 && blue <= 90 &&
          red > green * 1.28 &&
          green > blue * 1.18
        ) brownPixels += 1;
      }

      expect(info.width).toBeGreaterThan(0);
      expect(darkPixels).toBeGreaterThan(100);
      expect(brownPixels).toBeGreaterThan(50);
    });
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
      it(`male/${color}/${action} genera un GIF animado de 150×100 px con transparencia`, async () => {
        const gifPath = fileURLToPath(new URL(`../../../art/source/sprites/results/male/${color}/${action}.gif`, import.meta.url));
        const metadata = await sharp(gifPath, { animated: true }).metadata();
        expect(metadata.format).toBe('gif');
        expect(metadata.width).toBe(150);
        expect(metadata.pageHeight).toBe(100);
        expect(metadata.pages).toBeGreaterThan(1);
        expect(metadata.hasAlpha).toBe(true);
      });
    }
  }

});
