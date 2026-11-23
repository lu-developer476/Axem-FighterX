import { describe, expect, it } from 'vitest';
import { RACE_DISTANCE_OPTIONS } from '../../domain/race/raceCourseRules.js';
import {
  MOTORCYCLE_LANE_BASELINES,
  MOTORCYCLE_LANE_COUNT,
  MOTORCYCLE_RACE_OBSTACLES,
  normalizeMotorcycleLane,
} from '../../domain/race/motorcycleRaceRules.js';

describe('Carrera Axem de dos carriles', () => {
  it('limita las opciones de carrera a 5 y 10 kilómetros', () => {
    expect(RACE_DISTANCE_OPTIONS.map(({ value }) => value)).toEqual([5000, 10000]);
  });
  it('reserva dos carriles con profundidad visual creciente', () => {
    expect(MOTORCYCLE_LANE_COUNT).toBe(2);
    expect(MOTORCYCLE_LANE_BASELINES).toHaveLength(2);
    expect([...MOTORCYCLE_LANE_BASELINES]).toEqual([173, 233]);
  });
  it('limita el cambio de carril al rango disponible', () => {
    expect(normalizeMotorcycleLane(-1)).toBe(0);
    expect(normalizeMotorcycleLane(2)).toBe(1);
    expect(normalizeMotorcycleLane(8)).toBe(1);
    expect(normalizeMotorcycleLane(Number.NaN)).toBe(0);
  });
  it('incluye obstáculos distribuidos por los dos carriles', () => {
    expect(new Set(MOTORCYCLE_RACE_OBSTACLES.map(({ lane }) => lane))).toEqual(new Set([0, 1]));
    expect(new Set(MOTORCYCLE_RACE_OBSTACLES.map(({ kind }) => kind))).toEqual(new Set(['hurdle', 'roll-gate']));
  });
});