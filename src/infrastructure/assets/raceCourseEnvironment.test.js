import { describe, expect, it } from 'vitest';
import {
  RACE_COURSE_ENVIRONMENT,
  RACE_ENVIRONMENT_SHEET_DIMENSIONS,
} from './raceCourseEnvironment.js';

describe('Composición contextual de los circuitos', () => {
  it('usa árboles, vegetación, rocas flotantes y objetos en Carrera Terrestre', () => {
    const layers = RACE_COURSE_ENVIRONMENT.terrestrial;
    const assets = new Set(layers.flatMap(({ placements }) => placements.map(({ assetId }) => assetId)));

    expect(assets).toEqual(new Set([
      'sunnyland-tall-forest-tileset',
      'free-platformer-tileset',
      'free-platformer-tileset-2',
    ]));
    expect(layers.flatMap(({ placements }) => placements.map(({ kind }) => kind))).toEqual(
      expect.arrayContaining([
        'floating-rock',
        'forest-canopy',
        'tall-tree-trunk',
        'fern-cluster',
        'treehouse-tree',
        'wooden-sign',
        'blue-crystal',
        'carnivorous-plants',
      ]),
    );
  });

  it('usa fachadas, arcos, muros y columnas del tileset de Carrera Axem', () => {
    const layers = RACE_COURSE_ENVIRONMENT.axem;
    const assets = new Set(layers.flatMap(({ placements }) => placements.map(({ assetId }) => assetId)));

    expect(assets).toEqual(new Set(['sidescroll-tileset']));
    expect(layers.flatMap(({ placements }) => placements.map(({ kind }) => kind))).toEqual(
      expect.arrayContaining([
        'windowed-stone-facade',
        'arched-ruin',
        'broken-stone-wall',
        'stone-columns',
        'arched-doorway-detail',
      ]),
    );
  });

  it('cada recorte respeta las dimensiones originales de su hoja de sprites', () => {
    for (const layers of Object.values(RACE_COURSE_ENVIRONMENT)) {
      for (const environmentLayer of layers) {
        expect(environmentLayer.scrollFactor).toBeGreaterThan(0);
        expect(environmentLayer.scrollFactor).toBeLessThanOrEqual(1);
        expect(environmentLayer.placements.length).toBeGreaterThan(0);

        for (const item of environmentLayer.placements) {
          const dimensions = RACE_ENVIRONMENT_SHEET_DIMENSIONS[item.assetId];
          expect(dimensions, item.assetId).toBeDefined();
          expect(item.source.x).toBeGreaterThanOrEqual(0);
          expect(item.source.y).toBeGreaterThanOrEqual(0);
          expect(item.source.width).toBeGreaterThan(0);
          expect(item.source.height).toBeGreaterThan(0);
          expect(item.source.x + item.source.width).toBeLessThanOrEqual(dimensions.width);
          expect(item.source.y + item.source.height).toBeLessThanOrEqual(dimensions.height);
          expect(item.target.width).toBeGreaterThan(0);
          expect(item.target.height).toBeGreaterThan(0);
          expect(item.target.x).toBeGreaterThanOrEqual(0);
          expect(item.target.y).toBeGreaterThanOrEqual(0);
          expect(item.target.y + item.target.height).toBeLessThanOrEqual(270);
          expect(item.alpha).toBeGreaterThan(0);
          expect(item.alpha).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('no compone superficies, caminos ni senderos a partir de las hojas', () => {
    for (const layers of Object.values(RACE_COURSE_ENVIRONMENT)) {
      for (const environmentLayer of layers) {
        for (const item of environmentLayer.placements) {
          expect(item.kind).not.toMatch(/path|road|track|ground|trail|platform/i);
        }
      }
    }
  });
});
