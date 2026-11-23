import { describe, expect, it } from 'vitest';
import {
  LAND_RACE_OBJECT_SPECS,
  RACE_COURSE_ENVIRONMENT,
  RACE_COURSE_ENVIRONMENT_LAYOUT,
  RACE_ENVIRONMENT_SHEET_DIMENSIONS,
} from './raceCourseEnvironment.js';

const cropKey = ({ assetId, source }) =>
  [assetId, source.x, source.y, source.width, source.height].join(':');

describe('Objetos individuales de los escenarios de carrera', () => {
  it('asigna bosques, islas, árboles, plantas y cristales a Carrera Terrestre', () => {
    const objects = RACE_COURSE_ENVIRONMENT.terrestrial;
    expect(new Set(objects.map(({ assetId }) => assetId))).toEqual(new Set([
      'sunnyland-tall-forest-tileset',
      'free-platformer-tileset',
      'free-platformer-tileset-2',
    ]));
    expect(objects.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'forest-canopy-west',
      'forest-trunk-west',
      'forest-fern-center',
      'floating-island-west',
      'floating-island-square-arch',
      'treehouse-tree',
      'large-oak-tree',
      'wooden-sign',
      'blue-crystal-west',
      'carnivorous-plant-west',
    ]));
    expect(objects.length).toBeGreaterThanOrEqual(44);
  });

  it('asigna fachadas, arcos, ruinas, muros y columnas a Carrera Axem', () => {
    const objects = RACE_COURSE_ENVIRONMENT.axem;
    expect(new Set(objects.map(({ assetId }) => assetId))).toEqual(new Set(['sidescroll-tileset']));
    expect(objects.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'upper-ruined-arch',
      'gothic-facade-left',
      'gothic-window-facade',
      'arched-doorway',
      'stone-column-west',
      'stone-column-east',
      'broken-wall-section',
      'ruined-stone-panel',
    ]));
    expect(objects.length).toBeGreaterThanOrEqual(10);
  });

  it('mantiene recortes únicos y dentro de las dimensiones originales de cada hoja', () => {
    for (const objects of Object.values(RACE_COURSE_ENVIRONMENT)) {
      const ids = objects.map(({ id }) => id);
      const crops = objects.map(cropKey);
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(crops).size).toBe(crops.length);

      for (const item of objects) {
        const dimensions = RACE_ENVIRONMENT_SHEET_DIMENSIONS[item.assetId];
        expect(dimensions, item.id).toBeDefined();
        expect(item.source.x).toBeGreaterThanOrEqual(0);
        expect(item.source.y).toBeGreaterThanOrEqual(0);
        expect(item.source.width).toBeGreaterThan(0);
        expect(item.source.height).toBeGreaterThan(0);
        expect(item.source.x + item.source.width).toBeLessThanOrEqual(dimensions.width);
        expect(item.source.y + item.source.height).toBeLessThanOrEqual(dimensions.height);
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.width).toBeGreaterThan(0);
        expect(item.height).toBeGreaterThan(0);
        expect(item.y + item.height).toBeLessThanOrEqual(270);
        expect(item.scrollFactor).toBeGreaterThan(0);
        expect(item.scrollFactor).toBeLessThanOrEqual(1);
        expect(item.depth).toBeLessThan(0);
      }
    }
  });

  it('separa los recortes de origen de los objetos de cada atlas', () => {
    for (const objects of Object.values(RACE_COURSE_ENVIRONMENT)) {
      for (let i = 0; i < objects.length; i += 1) {
        for (let j = i + 1; j < objects.length; j += 1) {
          const a = objects[i];
          const b = objects[j];
          if (a.assetId !== b.assetId) continue;
          const overlapWidth = Math.max(0,
            Math.min(a.source.x + a.source.width, b.source.x + b.source.width) -
            Math.max(a.source.x, b.source.x));
          const overlapHeight = Math.max(0,
            Math.min(a.source.y + a.source.height, b.source.y + b.source.height) -
            Math.max(a.source.y, b.source.y));
          const overlapArea = overlapWidth * overlapHeight;
          const smallerArea = Math.min(
            a.source.width * a.source.height,
            b.source.width * b.source.height,
          );
          expect(overlapArea / smallerArea, a.id + ' / ' + b.id).toBeLessThan(0.02);
        }
      }
    }
  });

  it('usa sprites reales para los obstáculos y la energía de Terrestre', () => {
    expect(LAND_RACE_OBJECT_SPECS.map(({ id }) => id)).toEqual(['hurdle', 'roll-gate', 'stamina']);
    for (const spec of LAND_RACE_OBJECT_SPECS) {
      const dimensions = RACE_ENVIRONMENT_SHEET_DIMENSIONS[spec.assetId];
      expect(spec.source.x + spec.source.width).toBeLessThanOrEqual(dimensions.width);
      expect(spec.source.y + spec.source.height).toBeLessThanOrEqual(dimensions.height);
    }
    expect(LAND_RACE_OBJECT_SPECS.map(({ instruction }) => instruction)).toEqual([
      'PLANTA',
      'ARBUSTO',
      'ENERGÍA',
    ]);
  });

  it('repite el decorado durante toda la distancia de cada carrera', () => {
    expect(RACE_COURSE_ENVIRONMENT_LAYOUT.terrestrial).toEqual({
      worldCycle: 1800,
      repetitions: 6,
    });
    expect(RACE_COURSE_ENVIRONMENT_LAYOUT.axem).toEqual({
      worldCycle: 1800,
      repetitions: 5,
    });
  });

  it('no declara senderos, caminos ni superficies como decoración', () => {
    for (const objects of Object.values(RACE_COURSE_ENVIRONMENT)) {
      for (const item of objects) {
        expect(item.id).not.toMatch(/path|road|track|ground|trail/i);
      }
    }
  });
});
