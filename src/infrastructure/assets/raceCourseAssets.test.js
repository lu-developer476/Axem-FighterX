import { describe, expect, it } from 'vitest';
import {
  RACE_COURSE_ASSETS,
  RACE_COURSE_OBJECTS,
  resolveRaceCourseAssets,
  resolveRaceCourseObjects,
} from './raceCourseAssets.js';

const maps = [
  { id: 'sidescroll-1' },
  { id: 'sidescroll-2' },
  { id: 'sidescroll-3' },
  { id: 'sidescroll-4' },
];
const tilesets = [
  { id: 'sunnyland-tall-forest-tileset', width: 1280, height: 740, tileWidth: 32, tileHeight: 32 },
  { id: 'free-platformer-tileset', width: 1536, height: 1024, tileWidth: 32, tileHeight: 32 },
  { id: 'free-platformer-tileset-2', width: 1536, height: 1024, tileWidth: 32, tileHeight: 32 },
  { id: 'sidescroll-tileset', width: 1280, height: 1024, tileWidth: 32, tileHeight: 32 },
];

describe('Asignación de escenarios y objetos de carrera', () => {
  it('reserva los cuatro fondos sidescroll y su tileset para Carrera Axem', () => {
    const assets = resolveRaceCourseAssets('axem', maps, tilesets);
    expect(assets.maps.map(({ id }) => id)).toEqual(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']);
    expect(assets.tilesets.map(({ id }) => id)).toEqual(['sidescroll-tileset']);
  });

  it('usa el parallax y los tres tilesets nuevos para Carrera Terrestre', () => {
    const assets = resolveRaceCourseAssets('terrestrial', maps, tilesets);
    expect(assets.maps).toEqual([]);
    expect(assets.tilesets.map(({ id }) => id)).toEqual([
      'sunnyland-tall-forest-tileset',
      'free-platformer-tileset',
      'free-platformer-tileset-2',
    ]);
    expect(assets.backgroundKey).toBe('land-course-parallax');
  });

  it('mantiene los objetos propios de Carrera Axem en su tileset sidescroll', () => {
    const axem = resolveRaceCourseObjects('axem', [tilesets[3]]);
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
    expect(() => resolveRaceCourseAssets('axem', maps, []))
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
    expect(RACE_COURSE_ASSETS.terrestrial.mapIds).toEqual([]);
    expect(RACE_COURSE_ASSETS.terrestrial.tilesetIds).toEqual([
      'sunnyland-tall-forest-tileset',
      'free-platformer-tileset',
      'free-platformer-tileset-2',
    ]);
    expect(RACE_COURSE_ASSETS.terrestrial.backgroundKey).toBe('land-course-parallax');
    expect(RACE_COURSE_OBJECTS.axem.every(({ assetId }) => assetId === 'sidescroll-tileset')).toBe(true);
    expect(RACE_COURSE_OBJECTS.terrestrial).toEqual([]);
  });
});
