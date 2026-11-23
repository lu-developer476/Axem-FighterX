import { describe, expect, it } from 'vitest';
import {
  RACE_COURSE_ASSETS,
  RACE_COURSE_OBJECTS,
  resolveRaceCourseAssets,
  resolveRaceCourseObjects,
} from './raceCourseAssets.js';

const maps = [
  { id: 'terrestrial-platformer-a' },
  { id: 'terrestrial-platformer-b' },
  { id: 'sidescroll-1' },
  { id: 'sidescroll-2' },
  { id: 'sidescroll-3' },
  { id: 'sidescroll-4' },
];
const tilesets = [
  { id: 'terrestrial-platformer-tileset', width: 360, height: 162, tileWidth: 18, tileHeight: 18 },
  { id: 'sidescroll-tileset', width: 1280, height: 1024, tileWidth: 32, tileHeight: 32 },
];

describe('Asignación de escenarios y objetos de carrera', () => {
  it('reserva los cuatro fondos sidescroll y su tileset para Carrera Axem', () => {
    const assets = resolveRaceCourseAssets('axem', maps, tilesets);
    expect(assets.maps.map(({ id }) => id)).toEqual(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']);
    expect(assets.tilesets.map(({ id }) => id)).toEqual(['sidescroll-tileset']);
  });

  it('asigna mapas exteriores y tileset pixel platformer a Carrera Terrestre', () => {
    const assets = resolveRaceCourseAssets('terrestrial', maps, tilesets);
    expect(assets.maps.map(({ id }) => id)).toEqual(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']);
    expect(assets.tilesets.map(({ id }) => id)).toEqual(['sidescroll-tileset']);
    expect(assets.tilesets[0]).toMatchObject({ width: 1280, height: 1024, tileWidth: 32, tileHeight: 32 });
  });

  it('mantiene los objetos propios de Carrera Axem en su tileset sidescroll', () => {
    const axem = resolveRaceCourseObjects('axem', [tilesets[1]]);
    expect(axem.map(({ id, role, asset }) => [id, role, asset.id])).toEqual([
      ['hurdle', 'obstacle', 'sidescroll-tileset'],
      ['roll-gate', 'obstacle', 'sidescroll-tileset'],
    ]);
    expect(axem.every(({ role }) => role === 'obstacle')).toBe(true);
    expect(axem.map(({ action, instruction }) => [action, instruction])).toEqual([
      ['dodge', 'ESQUIVAR'],
      ['dodge', 'ESQUIVAR'],
    ]);
  });

  it('no recicla recortes de cuevas como obstáculos del circuito terrestre', () => {
    expect(RACE_COURSE_OBJECTS.terrestrial).toEqual([]);
    expect(resolveRaceCourseObjects('terrestrial', [tilesets[0]])).toEqual([]);
  });

  it('mantiene cada recorte de Axem dentro del tileset y alineado a su cuadrícula', () => {
    for (const region of RACE_COURSE_OBJECTS.axem) {
      const asset = tilesets.find(({ id }) => id === region.assetId);
      const tileWidth = asset.tileWidth ?? 32;
      const tileHeight = asset.tileHeight ?? 32;
      expect(region.x % tileWidth, region.id + ' x').toBe(0);
      expect(region.y % tileHeight, region.id + ' y').toBe(0);
      expect(region.x + region.width, region.id + ' borde derecho').toBeLessThanOrEqual(asset.width);
      expect(region.y + region.height, region.id + ' borde inferior').toBeLessThanOrEqual(asset.height);
    }
  });

  it('falla con claridad cuando falta un recurso o el circuito', () => {
    expect(() => resolveRaceCourseAssets('terrestrial', maps, []))
      .toThrow('Falta el recurso de tileset: sidescroll-tileset');
    expect(() => resolveRaceCourseObjects('axem', [tilesets[0]]))
      .toThrow('Falta el tileset "sidescroll-tileset" para el objeto "hurdle".');
    expect(() => resolveRaceCourseObjects('unknown', tilesets))
      .toThrow('No existen objetos para el circuito "unknown".');
    expect(() => resolveRaceCourseAssets('unknown', maps, tilesets))
      .toThrow('No existe el circuito "unknown".');
  });

  it('mantiene separados los recursos de Axem y Terrestre', () => {
    expect(RACE_COURSE_ASSETS.axem.mapIds).toEqual(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']);
    expect(RACE_COURSE_ASSETS.axem.tilesetIds).toEqual(['sidescroll-tileset']);
    expect(RACE_COURSE_ASSETS.terrestrial.mapIds).toEqual(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']);
    expect(RACE_COURSE_ASSETS.terrestrial.tilesetIds).toEqual(['sidescroll-tileset']);
    expect(RACE_COURSE_OBJECTS.axem.every(({ assetId }) => assetId === 'sidescroll-tileset')).toBe(true);
    expect(RACE_COURSE_OBJECTS.terrestrial).toEqual([]);
  });
});
