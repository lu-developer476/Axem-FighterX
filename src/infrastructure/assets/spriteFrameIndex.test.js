import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { SPRITE_SEQUENCE_ROLES } from './spriteSequenceRoles.js';
import spriteFrameIndex from './spriteFrameIndex.json';

const resultsPath = (...parts) =>
  fileURLToPath(new URL('../../../art/source/sprites/results/' + parts.join('/'), import.meta.url));

const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < b.x + a.w && a.y < b.y + b.h && b.y < b.y + a.h;

describe('mapa versionado de recortes masculinos', () => {
  const { groups, width, height, excluded, supplementalGroups } = spriteFrameIndex.male;

  it('usa la hoja Orange versionada como fuente de los recortes', async () => {
    const metadata = await sharp(resultsPath('male', 'orange', 'spritesheet.png')).metadata();
    expect(spriteFrameIndex.male.source).toBe('art/source/sprites/results/male/orange/spritesheet.png');
    expect(metadata.format).toBe('png');
    expect([metadata.width, metadata.height]).toEqual([width, height]);
    expect([width, height]).toEqual([730, 804]);
    expect(metadata.hasAlpha).toBe(true);
  });

  it('conserva los 14 grupos y 107 cuadros del personaje masculino', () => {
    expect(groups.map((group) => group.frames.length))
      .toEqual([7, 9, 10, 8, 8, 5, 5, 5, 5, 11, 8, 14, 6, 6]);
    expect(groups.reduce((sum, group) => sum + group.frames.length, 0)).toBe(107);
  });

  it('conserva los roles declarados para las secuencias', () => {
    expect(SPRITE_SEQUENCE_ROLES.male).toEqual({
      'group-01': 'idle', 'group-02': 'idle', 'group-03': 'punch',
      'group-04': 'punch', 'group-05': 'punch', 'group-06': 'battle-pose',
      'group-07': 'battle-pose', 'group-08': 'battle-pose', 'group-09': 'battle-pose',
      'group-10': 'run', 'group-11': 'dash', 'group-12': 'jump',
      'group-13': 'hit-hurt', 'group-14': 'teleport',
    });
  });

  it('mantiene los recursos suplementarios dentro de su zona reservada', () => {
    expect(supplementalGroups).toHaveLength(5);
    expect(supplementalGroups.every((group) => group.assets.length > 0)).toBe(true);
    const assets = supplementalGroups.flatMap((group) => group.assets);
    expect(assets.length).toBeGreaterThanOrEqual(8);
    expect(new Set(assets.map((asset) => asset.index)).size).toBe(assets.length);
    const [x, y, w, h] = excluded[0].bounds;
    for (const asset of assets) {
      expect(asset.x).toBeGreaterThanOrEqual(x);
      expect(asset.y).toBeGreaterThanOrEqual(y);
      expect(asset.x + asset.w).toBeLessThanOrEqual(x + w);
      expect(asset.y + asset.h).toBeLessThanOrEqual(y + h);
    }
  });

  it('valida límites, solapamientos y zonas excluidas del mapa', () => {
    const frames = groups.flatMap((group) => group.frames);
    const excludedBounds = excluded.map(({ bounds: [x, y, w, h] }) => ({ x, y, w, h }));
    frames.forEach((frame, index) => {
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.w).toBeLessThanOrEqual(width);
      expect(frame.y + frame.h).toBeLessThanOrEqual(height);
      for (const other of frames.slice(index + 1)) expect(overlaps(frame, other)).toBe(false);
      for (const zone of excludedBounds) expect(overlaps(frame, zone)).toBe(false);
    });
  });
});

describe('resultados de las variantes canónicas', () => {
  it('genera los GIF de acción de Axem Naranja en lienzos de 150×100 px', async () => {
    const animations = {
      'pose.gif': 16, 'punch-01.gif': 10, 'punch-02.gif': 8, 'punch-03.gif': 8,
      'run.gif': 11, 'dash.gif': 8, 'jump.gif': 14,
      'hit.gif': 2, 'hurt.gif': 3, 'teleport.gif': 6,
    };
    for (const [animation, originalFrames] of Object.entries(animations)) {
      const expectedFrames = animation === 'battle-pose.gif' ? originalFrames + 1
        : animation === 'teleport.gif' ? originalFrames + 3 : originalFrames;
      const metadata = await sharp(resultsPath('male', 'orange', animation), { animated: true }).metadata();
      expect(metadata.format, animation).toBe('gif');
      expect(metadata.width, animation).toBe(150);
      expect(metadata.pageHeight, animation).toBe(100);
      expect(metadata.pages, animation).toBe(expectedFrames);
      expect(metadata.hasAlpha, animation).toBe(true);
    }
  });

  it('conserva charge y la pose de derrota de Axem Naranja', async () => {
    const charge = await sharp(resultsPath('male', 'orange', 'charge.gif'), { animated: true }).metadata();
    expect(charge.pages).toBe(7);
    expect(charge.width).toBe(150);
    expect(charge.pageHeight).toBe(100);
    const defeated = await sharp(resultsPath('male', 'orange', 'defeated.png')).metadata();
    expect(defeated.format).toBe('png');
    expect(defeated.width).toBe(150);
    expect(defeated.height).toBe(100);
    expect(defeated.hasAlpha).toBe(true);
  });

  it('mantiene la escala estándar de los ocho cuadros idle de Axem Naranja', async () => {
    const file = resultsPath('male', 'orange', 'idle.gif');
    const metadata = await sharp(file, { animated: true }).metadata();
    const visibleHeights = [];
    expect(metadata.width).toBe(150);
    expect(metadata.pageHeight).toBe(100);
    expect(metadata.pages).toBe(8);
    for (let page = 0; page < metadata.pages; page += 1) {
      const { data, info } = await sharp(file, { page, pages: 1 })
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let top = info.height;
      let bottom = -1;
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          if (data[(y * info.width + x) * 4 + 3] < 16) continue;
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
      visibleHeights.push(bottom >= top ? bottom - top + 1 : 0);
    }
    expect(visibleHeights.every((height) => height > 0)).toBe(true);
    expect(Math.max(...visibleHeights) - Math.min(...visibleHeights)).toBeLessThanOrEqual(1);
    expect(Math.abs(visibleHeights[0] - 78)).toBeLessThanOrEqual(1);
  });

  it('conserva la hoja compuesta Pink y deja vacío el destino femenino Violet', async () => {
    const source = await sharp(
      fileURLToPath(new URL('../../../art/source/sprites/references/axem-pink/axem-pink-spritesheet.png', import.meta.url)),
    ).metadata();
    expect(source.format).toBe('png');
    expect(source.width).toBe(1316);
    expect(source.height).toBe(717);
    expect(await readdir(resultsPath('female', 'violet'))).toEqual(['.gitkeep']);
    await expect(readFile(resultsPath('female', 'pink', 'spritesheet.png')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('mantiene retiradas las tiras auxiliares del repositorio', async () => {
    for (const parts of [
      ['male', 'orange', 'sequences', 'index.json'],
      ['female', 'pink', 'sequences', 'index.json'],
    ]) {
      await expect(readFile(resultsPath(...parts))).rejects.toMatchObject({ code: 'ENOENT' });
    }
  });
});
