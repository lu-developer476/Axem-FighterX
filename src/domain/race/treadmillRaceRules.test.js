import { describe, expect, it } from 'vitest';
import {
  TREADMILL_RUNNER_X,
  LAND_RACE_LANES,
  LAND_RACE_LANE_SCALES,
} from './treadmillRaceRules.js';

describe('Reglas de carrera tipo cinta', () => {
  it('mantiene a todos los corredores sobre la misma línea horizontal de salida', () => {
    expect(TREADMILL_RUNNER_X).toBe(76);
  });

  it('define exactamente dos carriles terrestres con profundidad creciente', () => {
    expect(LAND_RACE_LANES).toEqual([166, 224]);
    expect(LAND_RACE_LANE_SCALES).toEqual([0.86, 1.12]);
  });
});
