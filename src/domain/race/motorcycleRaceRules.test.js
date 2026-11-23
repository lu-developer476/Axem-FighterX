import { describe, expect, it } from 'vitest';
import {
  MOTORCYCLE_LANE_BASELINES,
  MOTORCYCLE_LANE_COUNT,
  MOTORCYCLE_WORLD_SCALE,
  MOTORCYCLE_LANE_SCALES,
  advanceMotorcycleLateralOffset,
} from './motorcycleRaceRules.js';

describe('Profundidad visual de la carrera de motos', () => {
  it('mantiene una escala única entre el desplazamiento del escenario y el mundo de carrera', () => {
    expect(MOTORCYCLE_WORLD_SCALE).toBe(0.14);
  });

  it('mantiene dos carriles con líneas de suelo y escala progresivas', () => {
    expect(MOTORCYCLE_LANE_COUNT).toBe(2);
    expect(MOTORCYCLE_LANE_BASELINES).toEqual([173, 233]);
    expect(MOTORCYCLE_LANE_SCALES).toEqual([0.82, 1.08]);
    for (let lane = 1; lane < MOTORCYCLE_LANE_COUNT; lane += 1) {
      expect(MOTORCYCLE_LANE_BASELINES[lane]).toBeGreaterThan(MOTORCYCLE_LANE_BASELINES[lane - 1]);
      expect(MOTORCYCLE_LANE_SCALES[lane]).toBeGreaterThan(MOTORCYCLE_LANE_SCALES[lane - 1]);
    }
  });

  it('permite desplazarse a ambos lados del carril y limita el tiempo por fotograma', () => {
    expect(advanceMotorcycleLateralOffset(0, 1, 50)).toBe(14);
    expect(advanceMotorcycleLateralOffset(14, -1, 50)).toBe(0);
    expect(advanceMotorcycleLateralOffset(10, 1, 500)).toBe(24);
    expect(advanceMotorcycleLateralOffset(10, 0, 50)).toBe(10);
  });

  it('mantiene una posición válida ante entradas no numéricas', () => {
    expect(advanceMotorcycleLateralOffset(Number.NaN, 1, 50)).toBe(14);
    expect(advanceMotorcycleLateralOffset(10, Number.NaN, 50)).toBe(10);
    expect(advanceMotorcycleLateralOffset(10, 1, Number.NaN)).toBe(10);
  });
});
