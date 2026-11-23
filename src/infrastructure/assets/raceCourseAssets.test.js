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
  it('reserva mapas y tilesets de cueva para Carrera Axem', () => {
    const assets = resolveRaceCourseAssets('axem', maps, tilesets);
    expect(assets.maps.map(({ id }) => id)).toEqual(['cave-1', 'cave-2']);
    expect(assets.tilesets.map(({ id }) => id)).toEqual(['cave1-tileset', 'cave2-tileset']);
  });

  it('reserva mapas laterales y su tileset para Carrera Terrestre', () => {
    const assets = resolveRaceCourseAssets('terrestrial', maps, tilesets);
    expect(assets.maps.map(({ id }) => id)).toEqual([
      'sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4',
    ]);
    expect(assets.tilesets.map(({ id }) => id)).toEqual(['sidescroll-tileset']);
  });

  it('resuelve solo obstáculos y pickups del tileset correspondiente', () => {
    const axem = resolveRaceCourseObjects('axem', tilesets.slice(0, 2));
    expect(axem.map(({ id, role, asset }) => [id, role, asset.id])).toEqual([
      ['rock-wall', 'obstacle', 'cave2-tileset'],
      ['stone-pillar', 'obstacle', 'cave1-tileset'],
      ['boost', 'pickup', 'cave1-tileset'],
      ['slow', 'pickup', 'cave2-tileset'],
    ]);
    const terrestrial = resolveRaceCourseObjects('terrestrial', [tilesets[2]]);
    expect(terrestrial.map(({ id, role, asset }) => [id, role, asset.id])).toEqual([
      ['hurdle', 'obstacle', 'sidescroll-tileset'],
      ['roll-gate', 'obstacle', 'sidescroll-tileset'],
      ['stamina', 'pickup', 'sidescroll-tileset'],
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
      .toThrow('Falta el tileset "cave2-tileset" para el objeto "rock-wall".');
    expect(() => resolveRaceCourseObjects('unknown', tilesets))
      .toThrow('No existen objetos para el circuito "unknown".');
    expect(() => resolveRaceCourseAssets('unknown', maps, tilesets))
      .toThrow('No existe el circuito "unknown".');
  });

  it('mantiene los recursos separados por circuito', () => {
    expect(RACE_COURSE_ASSETS.axem.mapIds).not.toContain('sidescroll-1');
    expect(RACE_COURSE_ASSETS.terrestrial.mapIds).not.toContain('cave-1');
    expect(RACE_COURSE_OBJECTS.axem.some(({ assetId }) => assetId === 'sidescroll-tileset')).toBe(false);
    expect(RACE_COURSE_OBJECTS.terrestrial.every(({ assetId }) => assetId === 'sidescroll-tileset')).toBe(true);
  });
});
