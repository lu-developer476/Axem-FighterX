import { access, readdir } from 'node:fs/promises';
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
      '../../../art/source/sprites/results/female/violet',
      '../../../art/source/sprites/results/female/orange',
    ]) {
      await expect(access(fileURLToPath(new URL(path, import.meta.url))))
        .rejects.toMatchObject({ code: 'ENOENT' });
    }
    for (const filename of [
      'ranger-female-violet.png',
      'menu-ranger-female-violet.png',
      'ranger-male-violet.png',
    ]) {
      await expect(access(fileURLToPath(new URL(`../../../public/generated/${filename}`, import.meta.url))))
        .rejects.toMatchObject({ code: 'ENOENT' });
    }
  });

  it('conserva las referencias de Axem Red para los minijuegos', async () => {
    for (const action of ['idle', 'walk', 'run', 'dash', 'jump']) {
      const file = fileURLToPath(new URL(`../../../art/source/sprites/references/axem-red/${action}.gif`, import.meta.url));
      const metadata = await sharp(file, { animated: true }).metadata();
      expect(metadata.format, action).toBe('gif');
      expect(metadata.pages, action).toBeGreaterThan(1);
      expect(metadata.hasAlpha, action).toBe(true);
    }
    const masterBike = fileURLToPath(new URL('../../../art/source/sprites/references/axem-red/axem-ranger-bike.gif', import.meta.url));
    expect((await sharp(masterBike, { animated: true }).metadata()).pages).toBeGreaterThan(1);
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
