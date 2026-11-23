import { describe, expect, it } from 'vitest';
import { RACE_COURSE_ASSETS, resolveRaceCourseAssets } from './raceCourseAssets.js';

const maps = [
  { id: 'cave-1' }, { id: 'cave-2' },
  { id: 'sidescroll-1' }, { id: 'sidescroll-2' },
  { id: 'sidescroll-3' }, { id: 'sidescroll-4' },
];
const tilesets = [
  { id: 'cave1-tileset' }, { id: 'cave2-tileset' },
  { id: 'sidescroll-tileset' },
];

describe('Asignación de escenarios de carrera', () => {
  it('reserva los mapas y tilesets de cueva para Carrera Axem', () => {
    const assets = resolveRaceCourseAssets('axem', maps, tilesets);
    expect(assets.maps.map(({ id }) => id)).toEqual(['cave-1', 'cave-2']);
    expect(assets.tilesets.map(({ id }) => id)).toEqual(['cave1-tileset', 'cave2-tileset']);
  });

  it('reserva los cuatro mapas laterales y su tileset para Carrera Terrestre', () => {
    const assets = resolveRaceCourseAssets('terrestrial', maps, tilesets);
    expect(assets.maps.map(({ id }) => id)).toEqual([
      'sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4',
    ]);
    expect(assets.tilesets.map(({ id }) => id)).toEqual(['sidescroll-tileset']);
  });

  it('falla con claridad si falta un recurso requerido', () => {
    expect(() => resolveRaceCourseAssets('axem', maps.slice(1), tilesets))
      .toThrow('Falta el recurso de mapa: cave-1');
    expect(() => resolveRaceCourseAssets('terrestrial', maps, tilesets.slice(0, 2)))
      .toThrow('Falta el recurso de tileset: sidescroll-tileset');
    expect(() => resolveRaceCourseAssets('unknown', maps, tilesets))
      .toThrow('No existe el circuito "unknown".');
  });

  it('mantiene separados los recursos de ambos circuitos', () => {
    expect(RACE_COURSE_ASSETS.axem.mapIds).not.toContain('sidescroll-1');
    expect(RACE_COURSE_ASSETS.terrestrial.mapIds).not.toContain('cave-1');
  });
});
