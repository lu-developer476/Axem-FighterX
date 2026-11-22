import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { genderForRanger, isAvailableRangerVariant } from '../../domain/rangers/rangerVariants.js';
import ASSET_STANDARDS from '../../../art/source/sprites/asset-standards.json';

const variants = Object.freeze([
  { id: 'orange', gender: 'male' },
  { id: 'violet', gender: 'female' },
]);

const generatedSpritePath = ({ id, gender }) =>
  fileURLToPath(new URL(`../../../public/generated/ranger-${gender}-${id}.png`, import.meta.url));

const generatedMenuVioletPath = () =>
  fileURLToPath(new URL('../../../public/generated/menu-ranger-female-violet.png', import.meta.url));

const generatedMenuOrangePath = () =>
  fileURLToPath(new URL('../../../public/generated/menu-ranger-male-orange.png', import.meta.url));

describe('Variantes canónicas de Axem Rangers', () => {
  it('mantiene solo Orange masculino y Violet femenino', () => {
    expect(genderForRanger('orange')).toBe('male');
    expect(genderForRanger('violet')).toBe('female');
    for (const variant of variants) {
      expect(isAvailableRangerVariant(variant.id, variant.gender)).toBe(true);
    }
    expect(isAvailableRangerVariant('orange', 'female')).toBe(false);
    expect(isAvailableRangerVariant('violet', 'male')).toBe(false);
  });

  for (const variant of variants) {
    it(`${variant.gender}/${variant.id} genera una textura transparente de 53×83 px`, async () => {
      const metadata = await sharp(generatedSpritePath(variant)).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(ASSET_STANDARDS.categories.combatTexture.width);
      expect(metadata.height).toBe(ASSET_STANDARDS.categories.combatTexture.height);
      expect(metadata.hasAlpha).toBe(true);
    });
  }

  it.each([
    ['male/orange', generatedMenuOrangePath],
    ['female/violet', generatedMenuVioletPath],
  ])('genera el retrato de menú Super Axem %s en un lienzo transparente de 104×150 px', async (_name, getFile) => {
    const file = getFile();
    const metadata = await sharp(file).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(ASSET_STANDARDS.categories.menuPortrait.width);
    expect(metadata.height).toBe(ASSET_STANDARDS.categories.menuPortrait.height);
    expect(metadata.hasAlpha).toBe(true);

    const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const visiblePixels = Array.from({ length: data.length / 4 }, (_, index) => data[index * 4 + 3])
      .filter((alpha) => alpha > 0).length;
    expect(visiblePixels).toBeGreaterThan(900);
  });

  it('no genera carpetas de variantes no canónicas', async () => {
    const { access } = await import('node:fs/promises');
    await expect(access(fileURLToPath(new URL(
      '../../../art/source/sprites/results/male/violet',
      import.meta.url,
    )))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(fileURLToPath(new URL(
      '../../../art/source/sprites/results/female/orange',
      import.meta.url,
    )))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('mantiene los GIF de carrera y combate del Axem Naranja masculino', async () => {
    for (const action of ['run', 'bike', 'double-axe', 'idle', 'jump', 'roll', 'guard', 'ko', 'charge', 'pose', 'battle-pose']) {
      const file = fileURLToPath(new URL(
        `../../../art/source/sprites/results/male/orange/${action}.gif`,
        import.meta.url,
      ));
      const metadata = await sharp(file, { animated: true }).metadata();
      expect(metadata.format).toBe('gif');
      expect(metadata.width).toBe(ASSET_STANDARDS.categories.actionGif.width);
      expect(metadata.pageHeight).toBe(ASSET_STANDARDS.categories.actionGif.height);
      expect(metadata.pages).toBeGreaterThan(1);
      expect(metadata.hasAlpha).toBe(true);
    }
  });
});
