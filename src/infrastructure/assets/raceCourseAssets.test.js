import { describe, expect, it } from 'vitest';
import {
  RACE_COURSE_ASSETS,
  RACE_COURSE_OBJECTS,
  resolveRaceCourseAssets,
  resolveRaceCourseObjects,
} from './raceCourseAssets.js';

const maps = [
  { id: 'cave-1' }, { id: 'cave-2' },
  { id: 'sidescroll-1' }, { id: 'sidescroll-2' },
  { id: 'sidescroll-3' }, { id: 'sidescroll-4' },
];
const tilesets = [
  { id: 'cave1-tileset', width: 512, height: 512 },
  { id: 'cave2-tileset', width: 512, height: 512 },
  { id: 'sidescroll-tileset', width: 1280, height: 1024 },
];

describe('Asignación de escenarios y objetos de carrera', () => {
  it('reserva los mapas de cueva y ambos tilesets para Carrera Axem', () => {
    const assets = resolveRaceCourseAssets('axem', maps, tilesets);
    expect(assets.maps.map(({ id }) => id)).toEqual(['cave-1', 'cave-2']);
    expect(assets.tilesets.map(({ id }) => id)).toEqual(['cave1-tileset', 'cave2-tileset']);
  });

  it('reserva los cuatro fondos sidescroll y su tileset para Carrera Terrestre', () => {
    const assets = resolveRaceCourseAssets('terrestrial', maps, tilesets);
    expect(assets.maps.map(({ id }) => id)).toEqual(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']);
    expect(assets.tilesets.map(({ id }) => id)).toEqual(['sidescroll-tileset']);
  });

  it('resuelve obstáculos contextuales desde los tilesets asignados a cada carrera', () => {
    const axem = resolveRaceCourseObjects('axem', [tilesets[0], tilesets[1]]);
    expect(axem.map(({ id, role, asset }) => [id, role, asset.id])).toEqual([
      ['hurdle', 'obstacle', 'cave2-tileset'],
      ['roll-gate', 'obstacle', 'cave1-tileset'],
    ]);
    expect(axem.every(({ role }) => role === 'obstacle')).toBe(true);

    const terrestrial = resolveRaceCourseObjects('terrestrial', [tilesets[2]]);
    expect(terrestrial.map(({ id, role, asset }) => [id, role, asset.id])).toEqual([
      ['hurdle', 'obstacle', 'sidescroll-tileset'],
      ['roll-gate', 'obstacle', 'sidescroll-tileset'],
      ['stamina', 'pickup', 'sidescroll-tileset'],
    ]);
    expect(terrestrial.slice(0, 2).map(({ action, instruction }) => [action, instruction])).toEqual([
      ['jump', 'SALTAR'],
      ['roll', 'RODAR'],
    ]);
  });

  it('mantiene cada recorte dentro del tileset y alineado a la cuadrícula', () => {
    const regions = [...RACE_COURSE_OBJECTS.axem, ...RACE_COURSE_OBJECTS.terrestrial];
    for (const region of regions) {
      const asset = tilesets.find(({ id }) => id === region.assetId);
      expect(region.x % 32, region.id + ' x').toBe(0);
      expect(region.y % 32, region.id + ' y').toBe(0);
      expect(region.x + region.width, region.id + ' borde derecho').toBeLessThanOrEqual(asset.width);
      expect(region.y + region.height, region.id + ' borde inferior').toBeLessThanOrEqual(asset.height);
    }
  });

  it('falla con claridad cuando falta el tileset o el circuito', () => {
    expect(() => resolveRaceCourseObjects('axem', [tilesets[0]]))
      .toThrow('Falta el tileset "cave2-tileset" para el objeto "hurdle".');
    expect(() => resolveRaceCourseObjects('terrestrial', [tilesets[0]]))
      .toThrow('Falta el tileset "sidescroll-tileset" para el objeto "hurdle".');
    expect(() => resolveRaceCourseObjects('unknown', tilesets))
      .toThrow('No existen objetos para el circuito "unknown".');
    expect(() => resolveRaceCourseAssets('unknown', maps, tilesets))
      .toThrow('No existe el circuito "unknown".');
  });

  it('mantiene separados los recursos de Axem y Terrestre', () => {
    expect(RACE_COURSE_ASSETS.axem.mapIds).toEqual(['cave-1', 'cave-2']);
    expect(RACE_COURSE_ASSETS.axem.tilesetIds).toEqual(['cave1-tileset', 'cave2-tileset']);
    expect(RACE_COURSE_ASSETS.terrestrial.mapIds).toEqual(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']);
    expect(RACE_COURSE_ASSETS.terrestrial.tilesetIds).toEqual(['sidescroll-tileset']);
    expect(RACE_COURSE_OBJECTS.axem.every(({ assetId }) =>
      ['cave1-tileset', 'cave2-tileset'].includes(assetId),
    )).toBe(true);
    expect(RACE_COURSE_OBJECTS.terrestrial.every(({ assetId }) =>
      assetId === 'sidescroll-tileset',
    )).toBe(true);
  });
});
