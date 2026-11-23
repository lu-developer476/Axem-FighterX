import { describe, expect, it } from 'vitest';
import {
  MOTORCYCLE_LANE_BASELINES,
  MOTORCYCLE_LANE_COUNT,
  MOTORCYCLE_LANE_SCALES,
} from './motorcycleRaceRules.js';

describe('Profundidad visual de la carrera de motos', () => {
  it('mantiene cuatro carriles con líneas de suelo y escala progresivas', () => {
    expect(MOTORCYCLE_LANE_COUNT).toBe(4);
    expect(MOTORCYCLE_LANE_BASELINES).toEqual([151, 181, 211, 241]);
    expect(MOTORCYCLE_LANE_SCALES).toEqual([0.64, 0.8, 0.96, 1.12]);
    for (let lane = 1; lane < MOTORCYCLE_LANE_COUNT; lane += 1) {
      expect(MOTORCYCLE_LANE_BASELINES[lane]).toBeGreaterThan(MOTORCYCLE_LANE_BASELINES[lane - 1]);
      expect(MOTORCYCLE_LANE_SCALES[lane]).toBeGreaterThan(MOTORCYCLE_LANE_SCALES[lane - 1]);
    }
  });
});
