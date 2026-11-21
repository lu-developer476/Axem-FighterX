import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { genderForRanger, isAvailableRangerVariant } from '../../domain/rangers/rangerVariants.js';

const variants = Object.freeze([
  { id: 'violet', gender: 'female' },
  { id: 'orange', gender: 'male' },
]);

const generatedSpritePath = ({ id, gender }) =>
  fileURLToPath(new URL(`../../../public/generated/ranger-${gender}-${id}.png`, import.meta.url));

describe('Variantes canónicas de Axem Rangers', () => {
  it('solo mantiene Axem Violeta femenino y Axem Naranja masculino', () => {
    expect(genderForRanger('violet')).toBe('female');
    expect(genderForRanger('orange')).toBe('male');
    expect(isAvailableRangerVariant('violet', 'male')).toBe(false);
    expect(isAllowedRangerVariant('orange', 'female')).toBe(false);
  });

  for (const variant of variants) {
    it(`${variant.gender}/${variant.id} genera una textura transparente de 53×83 px`, async () => {
      const metadata = await sharp(generatedSpritePath(variant)).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(53);
      expect(metadata.height).toBe(83);
      expect(metadata.hasAlpha).toBe(true);
    });
  }

  it('mantiene los GIF de carrera y combate del Axem Naranja masculino', async () => {
    for (const action of ['run', 'bike', 'double-axe', 'idle', 'jump', 'roll', 'guard', 'ko']) {
      const file = fileURLToPath(new URL(
        `../../../art/source/sprites/results/male/orange/${action}.gif`,
        import.meta.url,
      ));
      const metadata = await sharp(file, { animated: true }).metadata();
      expect(metadata.format).toBe('gif');
      expect(metadata.width).toBe(150);
      expect(metadata.pageHeight).toBe(100);
      expect(metadata.pages).toBeGreaterThan(1);
      expect(metadata.hasAlpha).toBe(true);
    }
  });
});
