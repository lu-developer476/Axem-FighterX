import { describe, expect, it } from 'vitest';
import { RACE_COURSE_ASSETS } from './raceCourseAssets.js';

describe('Mapas de Carrera Terrestre', () => {
  it('usa la secuencia side-scroll de mayor resolución y su atlas de 32 px', () => {
    expect(RACE_COURSE_ASSETS.terrestrial).toEqual({
      mapIds: ['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4'],
      tilesetIds: ['sidescroll-tileset'],
    });
  });
});
