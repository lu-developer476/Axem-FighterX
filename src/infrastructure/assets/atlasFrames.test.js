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

describe('regiones de la hoja femenina (Axem Pink)', () => {
  const { regions, width, height } = atlasFrames.female;

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

  it('genera los GIF de acción de ambos masculinos en lienzos de 150×100 px', async () => {
    const animations = {
      'idle.gif': 16,
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
      for (const [animation, expectedFrames] of Object.entries(animations)) {
        const metadata = await sharp(resultsPath('male', color, animation), { animated: true }).metadata();
        const frameHeight = metadata.pageHeight ?? metadata.height / (metadata.pages || 1);
        expect(metadata.width, color + '/' + animation).toBe(150);
        expect(frameHeight, color + '/' + animation).toBe(100);
        expect(metadata.pages, color + '/' + animation).toBe(expectedFrames);
      }
    }
  });

  it('Violet y Orange comparten exactamente los mismos cuadros: solo cambia la paleta', async () => {
    const files = {
      male: [
        'spritesheet.png', 'run.png', 'bike.png', 'double-axe.png',
        ...atlasFrames.male.groups.map((group) => 'sequences/' + group.id + '.png'),
      ],
      female: ['spritesheet.png', 'pose.png', 'battle-pose.png', 'levitate.png'],
    };

    for (const [gender, list] of Object.entries(files)) {
      for (const file of list) {
        // Los dos PNG canónicos de pose femenina tienen máscaras alfa propias.
        if (gender === 'female' && file === 'pose.png') continue;
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
