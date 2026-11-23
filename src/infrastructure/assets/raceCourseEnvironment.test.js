import { describe, expect, it } from 'vitest';
import {
  LAND_RACE_OBJECT_SPECS,
  RACE_COURSE_ENVIRONMENT,
  RACE_ENVIRONMENT_SHEET_DIMENSIONS,
} from './raceCourseEnvironment.js';

describe('Objetos individuales de los escenarios de carrera', () => {
  it('extrae piezas separadas de las tres hojas elegidas para Carrera Terrestre', () => {
    const objects = RACE_COURSE_ENVIRONMENT.terrestrial;
    expect(new Set(objects.map(({ assetId }) => assetId))).toEqual(new Set([
      'sunnyland-tall-forest-tileset',
      'free-platformer-tileset',
      'free-platformer-tileset-2',
    ]));
    expect(objects.map(({ id }) => id)).toContain('treehouse-tree');
    expect(objects.map(({ id }) => id)).toContain('floating-island-ring-west');
    expect(objects.map(({ id }) => id)).toContain('carnivorous-plant-left');
    expect(objects.length).toBeGreaterThanOrEqual(35);
  });

  it('extrae fachadas, ruinas, arcos, columnas y detalles Axem por separado', () => {
    const objects = RACE_COURSE_ENVIRONMENT.axem;
    expect(new Set(objects.map(({ assetId }) => assetId))).toEqual(new Set(['sidescroll-tileset']));
    expect(objects.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'gothic-facade-left',
      'gothic-window-facade',
      'arched-doorway',
      'stone-column-west',
      'stone-column-east',
      'broken-wall-section',
    ]));
    expect(objects.length).toBeGreaterThanOrEqual(10);
  });

  it('cada objeto tiene su recorte y su instancia, no una composición plana del atlas', () => {
    for (const objects of Object.values(RACE_COURSE_ENVIRONMENT)) {
      const ids = objects.map(({ id }) => id);
      expect(new Set(ids).size).toBe(ids.length);
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
        expect(item.scrollFactor).toBeGreaterThan(0);
        expect(item.scrollFactor).toBeLessThanOrEqual(1);
        expect(item.depth).toBeLessThan(0);
      }
    }
  });

  it('usa sprites de las hojas para los obstáculos y la energía de Terrestre', () => {
    expect(LAND_RACE_OBJECT_SPECS.map(({ id }) => id)).toEqual(['hurdle', 'roll-gate', 'stamina']);
    expect(LAND_RACE_OBJECT_SPECS.every(({ assetId, source }) =>
      assetId === 'free-platformer-tileset-2' &&
      source.width > 0 && source.height > 0
    )).toBe(true);
  });

  it('no declara caminos, senderos ni superficies como objetos ambientales', () => {
    for (const objects of Object.values(RACE_COURSE_ENVIRONMENT)) {
      for (const item of objects) {
        expect(item.id).not.toMatch(/path|road|track|ground|trail|platform/i);
      }
    }
  });
});
