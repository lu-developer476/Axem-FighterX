import { describe, expect, it } from 'vitest';
import {
  MOTORCYCLE_LANE_BASELINES,
  MOTORCYCLE_LANE_COUNT,
  MOTORCYCLE_LANE_SCALES,
} from './motorcycleRaceRules.js';

describe('Profundidad visual de la carrera de motos', () => {
  it('mantiene dos carriles con líneas de suelo y escala progresivas', () => {
    expect(MOTORCYCLE_LANE_COUNT).toBe(2);
    expect(MOTORCYCLE_LANE_BASELINES).toEqual([173, 233]);
    expect(MOTORCYCLE_LANE_SCALES).toEqual([0.82, 1.08]);
    for (let lane = 1; lane < MOTORCYCLE_LANE_COUNT; lane += 1) {
      expect(MOTORCYCLE_LANE_BASELINES[lane]).toBeGreaterThan(MOTORCYCLE_LANE_BASELINES[lane - 1]);
      expect(MOTORCYCLE_LANE_SCALES[lane]).toBeGreaterThan(MOTORCYCLE_LANE_SCALES[lane - 1]);
    }
  });
});
