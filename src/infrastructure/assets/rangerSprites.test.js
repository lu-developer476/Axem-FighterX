import { access, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { genderForRanger, isAvailableRangerVariant } from '../../domain/rangers/rangerVariants.js';
import ASSET_STANDARDS from '../../../art/source/sprites/asset-standards.json';

const generatedSpritePath = fileURLToPath(new URL('../../../public/generated/ranger-male-orange.png', import.meta.url));
const generatedMenuOrangePath = fileURLToPath(new URL('../../../public/generated/menu-ranger-male-orange.png', import.meta.url));
const resultGifPath = (action) => fileURLToPath(new URL(`../../../art/source/sprites/results/male/orange/${action}.gif`, import.meta.url));
const resultGifDirectory = fileURLToPath(new URL('../../../art/source/sprites/results/male/orange', import.meta.url));

describe('Sprites canónicos de Axem Naranja', () => {
  it('mantiene disponible únicamente la variante masculina naranja', () => {
    expect(genderForRanger('orange')).toBe('male');
    expect(genderForRanger('violet')).toBeNull();
    expect(isAvailableRangerVariant('orange', 'male')).toBe(true);
    expect(isAvailableRangerVariant('violet', 'female')).toBe(false);
  });

  it('genera la textura transparente de combate de 53×83 px', async () => {
    const metadata = await sharp(generatedSpritePath).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(ASSET_STANDARDS.categories.combatTexture.width);
    expect(metadata.height).toBe(ASSET_STANDARDS.categories.combatTexture.height);
    expect(metadata.hasAlpha).toBe(true);
  });

  it('genera el retrato naranja de menú en 104×150 px', async () => {
    const metadata = await sharp(generatedMenuOrangePath).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(ASSET_STANDARDS.categories.menuPortrait.width);
    expect(metadata.height).toBe(ASSET_STANDARDS.categories.menuPortrait.height);
    expect(metadata.hasAlpha).toBe(true);
  });

  it('no genera recursos de variantes incompletas', async () => {
    for (const path of [
      '../../../art/source/sprites/results/male/violet',
      '../../../art/source/sprites/results/female/orange',
      '../../../art/source/sprites/results/female/pink',
      '../../../art/source/sprites/results/male/red',
    ]) {
      await expect(access(fileURLToPath(new URL(path, import.meta.url))))
        .rejects.toMatchObject({ code: 'ENOENT' });
    }
    const femaleVioletDirectory = fileURLToPath(new URL(
      '../../../art/source/sprites/results/female/violet', import.meta.url,
    ));
    expect(await readdir(femaleVioletDirectory)).toEqual(['.gitkeep']);
    for (const filename of [
      'ranger-female-violet.png',
      'menu-ranger-female-violet.png',
      'ranger-male-violet.png',
    ]) {
      await expect(access(fileURLToPath(new URL(`../../../public/generated/${filename}`, import.meta.url))))
        .rejects.toMatchObject({ code: 'ENOENT' });
    }
  });

  it('conserva únicamente el master Red y la bicicleta, y deriva las acciones desde Orange', async () => {
    const redDirectory = fileURLToPath(new URL('../../../art/source/sprites/references/axem-red', import.meta.url));
    const redFiles = (await readdir(redDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
    expect(redFiles).toEqual(['axem-ranger-bike.gif', 'super-axem-ranger-red.png']);

    const masterBike = fileURLToPath(new URL(
      '../../../art/source/sprites/references/axem-red/axem-ranger-bike.gif',
      import.meta.url,
    ));
    const bikeMetadata = await sharp(masterBike, { animated: true }).metadata();
    expect(bikeMetadata.format).toBe('gif');
    expect(bikeMetadata.pages).toBeGreaterThan(1);
    expect(bikeMetadata.hasAlpha).toBe(true);

    // Las animaciones Red de carrera se construyen a partir de las fuentes Orange versionadas.
    const generatorPath = fileURLToPath(new URL('../../../scripts/prepare-haxeflixel-race-assets.mjs', import.meta.url));
    const generator = await readFile(generatorPath, 'utf8');
    for (const [name, action] of [
      ['axem-red-run', 'run'],
      ['axem-red-idle', 'idle'],
      ['axem-red-walk', 'run'],
      ['axem-red-dash', 'dash'],
    ]) {
      expect(generator).toContain(
        `'${name}': { file: 'art/source/sprites/results/male/orange/${action}.gif', recolorToRed: true }`,
      );
    }

    for (const action of ['idle', 'run', 'dash']) {
      const file = resultGifPath(action);
      const metadata = await sharp(file, { animated: true }).metadata();
      expect(metadata.format, action).toBe('gif');
      expect(metadata.pages, action).toBeGreaterThan(1);
      expect(metadata.hasAlpha, action).toBe(true);
    }
  });

  it('mantiene retirados los GIF de doble hacha y battle-pose', async () => {
    const retiredFiles = [
      '../../../art/source/sprites/references/axem-red/axem-ranger-double-axe.gif',
      '../../../art/source/sprites/results/male/orange/double-axe.gif',
      '../../../art/source/sprites/results/male/orange/double-axe.png',
      '../../../art/source/sprites/results/male/red/double-axe.gif',
      '../../../art/source/sprites/results/male/red/battle-pose.gif',
      '../../../art/source/sprites/results/male/orange/battle-pose.gif',
    ];
    for (const path of retiredFiles) {
      await expect(access(fileURLToPath(new URL(path, import.meta.url))))
        .rejects.toMatchObject({ code: 'ENOENT' });
    }
  });

  it('genera las animaciones de combate naranja desde las referencias Red', async () => {
    const actions = ['bike', 'charge', 'dash', 'guard', 'hit', 'hurt', 'idle', 'jump', 'ko',
      'pose', 'punch-01', 'punch-02', 'punch-03', 'roll', 'run', 'teleport'];
    for (const action of actions) {
      const metadata = await sharp(resultGifPath(action), { animated: true }).metadata();
      expect(metadata.format, action).toBe('gif');
      expect(metadata.width, action).toBe(ASSET_STANDARDS.categories.actionGif.width);
      expect(metadata.pageHeight, action).toBe(ASSET_STANDARDS.categories.actionGif.height);
      expect(metadata.pages, action).toBeGreaterThan(1);
      expect(metadata.hasAlpha, action).toBe(true);
    }
    expect((await readdir(resultGifDirectory)).filter((name) => name.endsWith('.gif')).sort())
      .toEqual(actions.map((action) => action + '.gif').sort());
    const generated = fileURLToPath(new URL('../../../public/generated/axem-orange-idle.png', import.meta.url));
    const sheet = await sharp(generated).metadata();
    expect(sheet.format).toBe('png');
    expect(sheet.width).toBeGreaterThan(ASSET_STANDARDS.categories.actionFrameCell.width);
    expect(sheet.height).toBe(ASSET_STANDARDS.categories.actionFrameCell.height);
  });
});
