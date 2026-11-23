import { describe, expect, it } from 'vitest';
import { RACE_COURSE_ASSETS, resolveRaceCourseAssets } from './raceCourseAssets.js';
describe('Mapas de carreras', () => {
  it('asigna desert.png a Carrera Terrestre', () => expect(resolveRaceCourseAssets('terrestrial', [{ id: 'desert' }]).maps.map(({ id }) => id)).toEqual(['desert']));
  it('asigna castle.png a Carrera Axem', () => expect(RACE_COURSE_ASSETS.axem.mapIds).toEqual(['castle']));
});
