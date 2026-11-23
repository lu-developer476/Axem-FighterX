import { describe, expect, it } from 'vitest';
import { RACE_COURSE_ASSETS, resolveRaceCourseAssets } from './raceCourseAssets.js';
import { STAGE_TILESET_ASSETS } from './stageAssetManifest.js';

describe('Entorno de Carrera Terrestre', () => {
  it('resuelve el parallax y los tres tilesets incorporados al proyecto', () => {
    const assets = resolveRaceCourseAssets('terrestrial', [], STAGE_TILESET_ASSETS);

    expect(assets.maps).toEqual([]);
    expect(assets.tilesets.map(({ id }) => id)).toEqual([
      'sunnyland-tall-forest-tileset',
      'free-platformer-tileset',
      'free-platformer-tileset-2',
    ]);
    expect(assets.backgroundKey).toBe('land-course-parallax');
  });

  it('mantiene los cuatro mapas y el tileset de Carrera Axem independientes', () => {
    expect(RACE_COURSE_ASSETS.axem.mapIds).toEqual([
      'sidescroll-1',
      'sidescroll-2',
      'sidescroll-3',
      'sidescroll-4',
    ]);
    expect(RACE_COURSE_ASSETS.axem.tilesetIds).toEqual(['sidescroll-tileset']);
  });
});
