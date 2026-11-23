import { describe, expect, it } from 'vitest';
import { RACE_COURSE_ASSETS } from './raceCourseAssets.js';

describe('Mapas de Carrera Terrestre', () => {
  it('usa el fondo parallax gratuito incorporado al proyecto y mantiene separado el circuito Axem', () => {
    expect(RACE_COURSE_ASSETS.terrestrial).toEqual({
      mapIds: [],
      tilesetIds: [],
      backgroundKey: 'land-course-parallax',
    });
    expect(RACE_COURSE_ASSETS.axem.mapIds).toEqual(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']);
  });
});
