import { describe, expect, it } from 'vitest';
import { MINIGAME_MAP_ASSETS } from './stageAssetManifest.js';
import { RACE_COURSE_ASSETS, resolveRaceCourseAssets, resolveRaceCourseObjects } from './raceCourseAssets.js';

const maps = [
  ...MINIGAME_MAP_ASSETS.racing,
  ...MINIGAME_MAP_ASSETS.terrestrial,
];

describe('Asignación automática de mapas de carrera', () => {
  it('asigna todos los mapas de minigames/racing a Carrera Axem', () => {
    expect(RACE_COURSE_ASSETS.racing.mapIds).toEqual(
      MINIGAME_MAP_ASSETS.racing.map(({ id }) => id),
    );
    expect(RACE_COURSE_ASSETS.racing.mapIds).toContain('castle');
  });

  it('asigna todos los mapas de minigames/terrestrial a Carrera Terrestre', () => {
    expect(RACE_COURSE_ASSETS.terrestrial.mapIds).toEqual(
      MINIGAME_MAP_ASSETS.terrestrial.map(({ id }) => id),
    );
    expect(RACE_COURSE_ASSETS.terrestrial.mapIds).toContain('subway');
    expect(RACE_COURSE_ASSETS.terrestrial.mapIds).not.toContain('lost-town');
  });

  it('no depende de tilesets ni recortes externos', () => {
    expect(RACE_COURSE_ASSETS.racing.tilesetIds).toEqual([]);
    expect(RACE_COURSE_ASSETS.terrestrial.tilesetIds).toEqual([]);
    expect(resolveRaceCourseObjects('racing')).toEqual([]);
    expect(resolveRaceCourseObjects('terrestrial')).toEqual([]);
  });

  it('resuelve cada mapa de los catálogos sin registros manuales adicionales', () => {
    expect(resolveRaceCourseAssets('racing', maps).maps.map(({ id }) => id))
      .toEqual(RACE_COURSE_ASSETS.racing.mapIds);
    expect(resolveRaceCourseAssets('terrestrial', maps).maps.map(({ id }) => id))
      .toEqual(RACE_COURSE_ASSETS.terrestrial.mapIds);
  });

  it('falla claramente cuando falta un mapa o el circuito', () => {
    expect(() => resolveRaceCourseAssets('racing', [])).toThrow('Falta el recurso de mapa: castle');
    expect(() => resolveRaceCourseAssets('unknown', maps)).toThrow('No existe el circuito "unknown".');
  });
});
