import { describe, expect, it } from 'vitest';
import { RACE_COURSE_ENVIRONMENT, RACE_COURSE_ENVIRONMENT_LAYOUT } from './raceCourseEnvironment.js';
describe('Escenarios de carrera basados en mapas completos', () => {
  it('no conserva recortes de tilesets eliminados', () => {
    expect(RACE_COURSE_ENVIRONMENT.axem).toEqual([]);
    expect(RACE_COURSE_ENVIRONMENT.terrestrial).toEqual([]);
  });
  it('no configura capas decorativas dependientes de atlas', () => {
    expect(RACE_COURSE_ENVIRONMENT_LAYOUT.axem.repetitions).toBe(0);
    expect(RACE_COURSE_ENVIRONMENT_LAYOUT.terrestrial.repetitions).toBe(0);
  });
});
