import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { layoutSequence } from './atlasFrameDetection.js';
import { ATLAS_SEQUENCE_ROLES, ATLAS_SOURCES } from './atlasLayoutRules.js';
import atlasFrames from './atlasFrames.json';

const COLORS = ['violet', 'orange'];
const resultsPath = (...parts) =>
  fileURLToPath(new URL('../../../art/source/sprites/results/' + parts.join('/'), import.meta.url));

const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const alphaOf = async (file) => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(info.width * info.height);
  for (let index = 0; index < alpha.length; index++) alpha[index] = data[index * 4 + 3];
  return { alpha, width: info.width, height: info.height };
};

describe('cuadros de la hoja masculina (Axem Red)', () => {
  const { groups, width, height } = atlasFrames.male;

  it('conserva la distribución irregular: 14 grupos con 107 cuadros', () => {
    expect(groups.map((group) => group.frames.length))
      .toEqual([7, 9, 10, 8, 8, 5, 5, 5, 5, 11, 8, 14, 6, 6]);
  });

  it('clasifica los 14 grupos según las secuencias manuales del personaje', () => {
    const countOf = (id) => groups.find((group) => group.id === id).frames.length;
    expect(ATLAS_SEQUENCE_ROLES.male).toEqual({
      'group-01': 'idle',
      'group-02': 'idle',
      'group-03': 'punch',
      'group-04': 'punch',
      'group-05': 'punch',
      'group-06': 'battle-pose',
      'group-07': 'battle-pose',
      'group-08': 'battle-pose',
      'group-09': 'battle-pose',
      'group-10': 'run',
      'group-11': 'dash',
      'group-12': 'jump',
      'group-13': 'hit-hurt',
      'group-14': 'teleport',
    });
    expect(groups.map((group) => countOf(group.id)))
      .toEqual([7, 9, 10, 8, 8, 5, 5, 5, 5, 11, 8, 14, 6, 6]);
  });

  it('no tiene cuadros superpuestos, fuera de la hoja ni dentro de zonas excluidas', () => {
    const frames = groups.flatMap((group) => group.frames);
    const excluded = ATLAS_SOURCES.male.excluded.map(({ bounds: [x, y, w, h] }) => ({ x, y, w, h }));
    frames.forEach((frame, index) => {
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.w).toBeLessThanOrEqual(width);
      expect(frame.y + frame.h).toBeLessThanOrEqual(height);
      for (const other of frames.slice(index + 1)) expect(overlaps(frame, other)).toBe(false);
      for (const zone of excluded) expect(overlaps(frame, zone)).toBe(false);
    });
  });
});

describe('regiones y grupos de la hoja femenina (Axem Pink)', () => {
  const { regions, groups, width, height } = atlasFrames.female;

  it('separa los personajes de efectos, íconos y siluetas', () => {
    const characters = regions.filter((region) => region.kind === 'character');
    expect(characters.length).toBeGreaterThan(70);
    expect(regions.length - characters.length).toBeGreaterThan(10);
  });

  it('mantiene todas las regiones dentro de la hoja', () => {
    for (const region of regions) {
      expect(region.x + region.w).toBeLessThanOrEqual(width);
      expect(region.y + region.h).toBeLessThanOrEqual(height);
    }
  });

  it('agrupa las siete franjas y asigna las 116 regiones una sola vez', () => {
    expect(groups.map((group) => group.regionCount)).toEqual([12, 20, 18, 17, 20, 23, 6]);
    expect(groups.map((group) => group.characterCount)).toEqual([11, 14, 15, 16, 18, 10, 0]);
    const indices = groups.flatMap((group) => group.regionIndices);
    expect(indices).toHaveLength(regions.length);
    expect(new Set(indices).size).toBe(regions.length);
    expect([...indices].sort((a, b) => a - b)).toEqual(regions.map((region) => region.index));
  });

  it('amplía los recortes para conservar completas las regiones asignadas', () => {
    for (const group of groups) {
      const [left, top, groupWidth, groupHeight] = group.bounds;
      expect(left).toBe(0);
      expect(groupWidth).toBe(width);
      for (const regionIndex of group.regionIndices) {
        const region = regions.find((candidate) => candidate.index === regionIndex);
        expect(region.y).toBeGreaterThanOrEqual(top);
        expect(region.y + region.h).toBeLessThanOrEqual(top + groupHeight);
      }
    }
  });

  it('señala las regiones dudosas para revisión manual', () => {
    const reviews = new Set(regions.map((region) => region.review).filter(Boolean));
    for (const reason of reviews) expect(['varias-poses', 'posible-personaje']).toContain(reason);
  });
});

describe('resultados por género y color', () => {
  it('cada tira masculina mide celdas × cuadros según su índice', async () => {
    for (const color of COLORS) {
      const index = JSON.parse(await readFile(resultsPath('male', color, 'sequences', 'index.json'), 'utf8'));
      expect(index).toHaveLength(atlasFrames.male.groups.length);

      for (const entry of index) {
        const group = atlasFrames.male.groups.find((candidate) => candidate.id === entry.id);
        const layout = layoutSequence(group.frames, { anchor: entry.anchor });
        expect(entry.frameCount).toBe(group.frames.length);
        expect(entry.cellWidth).toBe(layout.cellWidth);
        expect(entry.cellHeight).toBe(layout.cellHeight);
        expect(entry.anchorX).toBe(layout.placements[0].x + group.frames[0].pivotX);

        const metadata = await sharp(resultsPath('male', color, 'sequences', entry.file)).metadata();
        expect(metadata.width).toBe(entry.cellWidth * entry.frameCount);
        expect(metadata.height).toBe(entry.cellHeight);
      }
    }
  });

  it('genera las siete franjas femeninas y su índice completo para ambos colores', async () => {
    for (const color of COLORS) {
      const index = JSON.parse(await readFile(resultsPath('female', color, 'sequences', 'index.json'), 'utf8'));
      expect(index.map((entry) => entry.regionCount)).toEqual([12, 20, 18, 17, 20, 23, 6]);
      expect(index.flatMap((entry) => entry.regions)).toHaveLength(atlasFrames.female.regions.length);

      for (const entry of index) {
        const group = atlasFrames.female.groups.find((candidate) => candidate.id === entry.id);
        expect(entry.sourceBounds).toEqual(group.bounds);
        const metadata = await sharp(resultsPath('female', color, 'sequences', entry.file)).metadata();
        expect(metadata.width).toBe(group.bounds[2]);
        expect(metadata.height).toBe(group.bounds[3]);
        expect(metadata.hasAlpha).toBe(true);
      }
    }
  });

  it('genera los GIF de acción de ambos masculinos en lienzos de 150×100 px', async () => {
    const animations = {
      'pose.gif': 16,
      'punch-01.gif': 10,
      'punch-02.gif': 8,
      'punch-03.gif': 8,
      'battle-pose.gif': 20,
      'run.gif': 11,
      'dash.gif': 8,
      'jump.gif': 14,
      'hit.gif': 2,
      'hurt.gif': 3,
      'teleport.gif': 6,
    };

    for (const color of COLORS) {
      for (const [animation, originalFrames] of Object.entries(animations)) {
        const expectedFrames = animation === 'battle-pose.gif'
          ? originalFrames + 1
          : animation === 'teleport.gif'
            ? originalFrames + 3
            : originalFrames;
        const metadata = await sharp(resultsPath('male', color, animation), { animated: true }).metadata();
        const frameHeight = metadata.pageHeight ?? metadata.height / (metadata.pages || 1);
        expect(metadata.width, color + '/' + animation).toBe(150);
        expect(frameHeight, color + '/' + animation).toBe(100);
        expect(metadata.pages, color + '/' + animation).toBe(expectedFrames);
      }
    }
  });

  it('completa los GIF y la pose de derrota del Axem Violeta', async () => {
    const animations = {
      'battle-pose.gif': 21,
      'teleport.gif': 9,
      'charge.gif': 3,
      'idle.gif': 8,
    };

    for (const [animation, expectedFrames] of Object.entries(animations)) {
      const metadata = await sharp(resultsPath('male', 'violet', animation), { animated: true }).metadata();
      expect(metadata.format, animation).toBe('gif');
      expect(metadata.width, animation).toBe(150);
      expect(metadata.pageHeight, animation).toBe(100);
      expect(metadata.pages, animation).toBe(expectedFrames);
      expect(metadata.hasAlpha, animation).toBe(true);
    }

    const defeated = await sharp(resultsPath('male', 'violet', 'defeated.png')).metadata();
    expect(defeated.format).toBe('png');
    expect(defeated.width).toBe(150);
    expect(defeated.height).toBe(100);
    expect(defeated.hasAlpha).toBe(true);
  });

  it.each(COLORS)('mantiene la escala estándar del personaje en los ocho cuadros de idle %s', async (color) => {
    const file = resultsPath('male', color, 'idle.gif');
    const metadata = await sharp(file, { animated: true }).metadata();
    const visibleHeights = [];

    expect(metadata.width).toBe(150);
    expect(metadata.pageHeight).toBe(100);
    expect(metadata.pages).toBe(8);

    for (let page = 0; page < metadata.pages; page += 1) {
      const { data, info } = await sharp(file, { page, pages: 1 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(150);
      expect(info.height).toBe(100);

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

  it('integra la invocación del hacha y la pose de derrota del Axem Naranja', async () => {
    const battlePose = await sharp(resultsPath('male', 'orange', 'battle-pose.gif'), { animated: true }).metadata();
    expect(battlePose.format).toBe('gif');
    expect(battlePose.width).toBe(150);
    expect(battlePose.pageHeight).toBe(100);
    expect(battlePose.pages).toBe(21);
    expect(battlePose.hasAlpha).toBe(true);

    const defeated = await sharp(resultsPath('male', 'orange', 'defeated.png')).metadata();
    expect(defeated.format).toBe('png');
    expect(defeated.width).toBe(150);
    expect(defeated.height).toBe(100);
    expect(defeated.hasAlpha).toBe(true);
  });

  it('Violet y Orange comparten exactamente los mismos cuadros: solo cambia la paleta', async () => {
    const files = {
      male: [
        'spritesheet.png', 'run.png', 'bike.png', 'double-axe.png',
        ...atlasFrames.male.groups.map((group) => 'sequences/' + group.id + '.png'),
      ],
      female: [
        'spritesheet.png', 'pose.png', 'battle-pose.png', 'levitate.png',
        ...atlasFrames.female.groups.map((group) => 'sequences/' + group.id + '.png'),
      ],
    };

    for (const [gender, list] of Object.entries(files)) {
      for (const file of list) {
        // Las poses femeninas pose y levitate pueden tener siluetas propias por color.
        if (gender === 'female' && ['pose.png', 'levitate.png'].includes(file)) continue;
        const violet = await alphaOf(resultsPath(gender, 'violet', file));
        const orange = await alphaOf(resultsPath(gender, 'orange', file));
        expect(orange.width).toBe(violet.width);
        expect(orange.height).toBe(violet.height);
        expect(orange.alpha.equals(violet.alpha)).toBe(true);
      }
    }
  });

  it('las poses femeninas generadas son copias exactas de los resultados canónicos', async () => {
    for (const color of COLORS) {
      const canonical = await readFile(resultsPath('female', 'axem-ranger-' + color + '.png'));
      const pose = await readFile(resultsPath('female', color, 'pose.png'));
      expect(pose.equals(canonical)).toBe(true);
    }
  });
});
