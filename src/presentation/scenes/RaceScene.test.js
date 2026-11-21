import { describe, expect, it } from 'vitest';
import {
  MOTORCYCLE_LANE_BASELINES,
  MOTORCYCLE_LANE_COUNT,
  MOTORCYCLE_RACE_OBSTACLES,
  normalizeMotorcycleLane,
} from '../../domain/race/motorcycleRaceRules.js';

describe('Carrera de motos de cuatro carriles', () => {
  it('reserva cuatro carriles con profundidad visual creciente', () => {
    expect(MOTORCYCLE_LANE_COUNT).toBe(4);
    expect(MOTORCYCLE_LANE_BASELINES).toHaveLength(4);
    expect([...MOTORCYCLE_LANE_BASELINES]).toEqual([151, 181, 211, 241]);
  });
  it('limita el cambio de carril al rango disponible', () => {
    expect(normalizeMotorcycleLane(-1)).toBe(0);
    expect(normalizeMotorcycleLane(2)).toBe(2);
    expect(normalizeMotorcycleLane(8)).toBe(3);
    expect(normalizeMotorcycleLane(Number.NaN)).toBe(0);
  });
  it('incluye obstáculos distribuidos por los cuatro carriles', () => {
    expect(new Set(MOTORCYCLE_RACE_OBSTACLES.map(({ lane }) => lane))).toEqual(new Set([0, 1, 2, 3]));
    expect(new Set(MOTORCYCLE_RACE_OBSTACLES.map(({ kind }) => kind))).toEqual(new Set(['barrier', 'oil', 'crate']));
  });
});