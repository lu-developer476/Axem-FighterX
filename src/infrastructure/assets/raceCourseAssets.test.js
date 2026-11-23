import { describe, expect, it } from 'vitest';
import { RACE_COURSE_ASSETS, resolveRaceCourseAssets, resolveRaceCourseObjects } from './raceCourseAssets.js';
const maps = [{ id: 'castle' }, { id: 'desert' }];
describe('Asignación de escenarios de carrera', () => {
  it('usa castle.png como escenario de Carrera Axem', () => expect(resolveRaceCourseAssets('axem', maps).maps.map(({ id }) => id)).toEqual(['castle']));
  it('usa desert.png como escenario de Carrera Terrestre', () => expect(resolveRaceCourseAssets('terrestrial', maps).maps.map(({ id }) => id)).toEqual(['desert']));
  it('no depende de tilesets ni recortes externos', () => {
    expect(RACE_COURSE_ASSETS.axem.tilesetIds).toEqual([]);
    expect(RACE_COURSE_ASSETS.terrestrial.tilesetIds).toEqual([]);
    expect(resolveRaceCourseObjects('axem')).toEqual([]);
    expect(resolveRaceCourseObjects('terrestrial')).toEqual([]);
  });
  it('falla claramente cuando falta un mapa o el circuito', () => {
    expect(() => resolveRaceCourseAssets('axem', [])).toThrow('Falta el recurso de mapa: castle');
    expect(() => resolveRaceCourseAssets('unknown', maps)).toThrow('No existe el circuito "unknown".');
  });
});
