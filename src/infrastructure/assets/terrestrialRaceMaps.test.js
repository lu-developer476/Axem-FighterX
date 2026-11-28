import { describe, expect, it } from 'vitest';
import { RACE_COURSE_ASSETS, resolveRaceCourseAssets } from './raceCourseAssets.js';

describe('Mapas de carreras', () => {
  it('asigna lost-town.png a Carrera Terrestre', () => {
    expect(resolveRaceCourseAssets('terrestrial', [{ id: 'lost-town' }]).maps.map(({ id }) => id))
      .toEqual(['lost-town']);
  });

  it('asigna castle.png a Carrera Axem', () => {
    expect(RACE_COURSE_ASSETS.axem.mapIds).toEqual(['castle']);
  });
});
