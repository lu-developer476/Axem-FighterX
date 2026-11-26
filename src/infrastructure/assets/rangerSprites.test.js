import { access, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { genderForRanger, isAvailableRangerVariant } from '../../domain/rangers/rangerVariants.js';
import ASSET_STANDARDS from '../../../art/source/sprites/asset-standards.json';

const resultGifPath = (action) => fileURLToPath(new URL(`../../../art/source/sprites/results/male/orange/${action}.gif`, import.meta.url));
const defeatedOutputPath = fileURLToPath(new URL('../../../art/source/sprites/results/male/orange/defeated.png', import.meta.url));
const resultGifDirectory = fileURLToPath(new URL('../../../art/source/sprites/results/male/orange', import.meta.url));

describe('Sprites canónicos de Axem Naranja', () => {
  it('mantiene disponible únicamente la variante masculina naranja', () => {
    expect(genderForRanger('orange')).toBe('male');
    expect(genderForRanger('violet')).toBeNull();
    expect(isAvailableRangerVariant('orange', 'male')).toBe(true);
    expect(isAvailableRangerVariant('violet', 'female')).toBe(false);
  });

  it('mantiene declaradas las dimensiones lógicas de dibujo', () => {
    expect([ASSET_STANDARDS.categories.combatTexture.width,
      ASSET_STANDARDS.categories.combatTexture.height]).toEqual([53, 83]);
    expect([ASSET_STANDARDS.categories.menuPortrait.width,
      ASSET_STANDARDS.categories.menuPortrait.height]).toEqual([104, 150]);
  });

  it('no contiene recursos de variantes incompletas', async () => {
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
  });

  it('conserva el GIF maestro de bicicleta en la referencia Red y las acciones Orange versionadas', async () => {
    const redDirectory = fileURLToPath(new URL('../../../art/source/sprites/references/axem-red', import.meta.url));
    const redFiles = (await readdir(redDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
    expect(redFiles).toEqual([
      'axem-ranger-bike.gif',
      'axem-ranger-bike-spritesheet.json',
      'axem-ranger-bike-spritesheet.png',
    ].sort());

    const redManifestPath = fileURLToPath(new URL(
      '../../../art/source/sprites/references/axem-red/axem-ranger-bike-spritesheet.json',
      import.meta.url,
    ));
    const redManifest = JSON.parse(await readFile(redManifestPath, 'utf8'));
    expect(redManifest).toMatchObject({
      image: 'axem-ranger-bike-spritesheet.png',
      source: 'art/source/sprites/references/axem-red/axem-ranger-bike.gif',
      frameWidth: 101,
      frameHeight: 49,
      frames: 5,
      columns: 5,
      rows: 1,
      frameDurationMs: 100,
      loop: true,
      cropFromSource: { x: 22, y: 22, width: 101, height: 49 },
      sourceFrameSize: { width: 150, height: 100 },
    });

    const redSheetPath = fileURLToPath(new URL(
      '../../../art/source/sprites/references/axem-red/axem-ranger-bike-spritesheet.png',
      import.meta.url,
    ));
    const redSheet = await sharp(redSheetPath).metadata();
    expect(redSheet.format).toBe('png');
    expect([redSheet.width, redSheet.height]).toEqual([
      redManifest.frameWidth * redManifest.columns,
      redManifest.frameHeight * redManifest.rows,
    ]);
    expect(redSheet.hasAlpha).toBe(true);

    const masterBike = fileURLToPath(new URL(
      '../../../art/source/sprites/references/axem-red/axem-ranger-bike.gif',
      import.meta.url,
    ));
    const bikeMetadata = await sharp(masterBike, { animated: true }).metadata();
    expect(bikeMetadata.format).toBe('gif');
    expect(bikeMetadata.pages).toBeGreaterThan(1);
    expect(bikeMetadata.hasAlpha).toBe(true);

    for (const action of ['idle', 'run', 'dash']) {
      const file = resultGifPath(action);
      const metadata = await sharp(file, { animated: true }).metadata();
      expect(metadata.format, action).toBe('gif');
      expect(metadata.pages, action).toBeGreaterThan(1);
      expect(metadata.hasAlpha, action).toBe(true);
    }
  });

  it('conserva la tira facial de derrota versionada en su resolución nativa 145×22', async () => {
    const metadata = await sharp(defeatedOutputPath).metadata();
    expect(metadata.format).toBe('png');
    expect([metadata.width, metadata.height]).toEqual([145, 22]);
    expect(metadata.hasAlpha).toBe(true);
  });

  it('conserva el KO con ambos cuadros en la misma altura y posición; solo se abre el ojo', async () => {
    const koPath = resultGifPath('ko');
    const ko = await sharp(koPath, { animated: true }).metadata();
    expect(ko.format).toBe('gif');
    expect(ko.width).toBe(150);
    expect(ko.pageHeight).toBe(100);
    expect(ko.pages).toBe(2);
    expect(ko.hasAlpha).toBe(true);

    const frames = await Promise.all([0, 1].map((page) =>
      sharp(koPath, { page, pages: 1 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ));
    const bounds = frames.map(({ data }) => {
      let left = 150;
      let top = 100;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 150; x++) {
          if (data[(y * 150 + x) * 4 + 3] === 0) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
      return [left, top, right + 1, bottom + 1];
    });
    expect(bounds).toEqual([[41, 76, 109, 96], [41, 76, 109, 96]]);

    const changed = [];
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 150; x++) {
        const offset = (y * 150 + x) * 4;
        if (!frames[0].data.subarray(offset, offset + 4).equals(frames[1].data.subarray(offset, offset + 4))) {
          changed.push([x, y]);
        }
      }
    }
    const expectedEye = [
      [53, 86], [54, 86], [55, 86], [56, 86],
      [53, 87], [54, 87], [55, 87], [56, 87],
      [53, 88], [54, 88], [55, 88], [56, 88],
    ];
    expect(changed).toEqual(expectedEye);

    const finalEye = await sharp(koPath, { page: 1, pages: 1 })
      .extract({ left: 53, top: 86, width: 4, height: 3 })
      .ensureAlpha().raw().toBuffer();
    let white = 0;
    for (let offset = 0; offset < finalEye.length; offset += 4) {
      if (finalEye[offset] >= 245 && finalEye[offset + 1] >= 245 &&
          finalEye[offset + 2] >= 245 && finalEye[offset + 3] >= 200) white++;
    }
    expect(white).toBe(12);
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

  it('conserva las animaciones de combate naranja versionadas', async () => {
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
  });
});
