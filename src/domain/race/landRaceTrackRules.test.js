import { describe, expect, it } from 'vitest';
import { LAND_RACE_LANE_SCALE, LAND_RACE_LANE_Y, LAND_RACE_RUNNER_X_BOUNDS, clampLandRaceRunnerX, LAND_RACE_MAP_LOOP_DISTANCE, LAND_RACE_WORLD_SCALE } from './landRaceTrackRules.js';
describe('Recorrido de Carrera Terrestre sobre desert.png', () => {
  it('mantiene al corredor dentro de la zona segura visible', () => {
    expect(LAND_RACE_RUNNER_X_BOUNDS).toEqual({ min: 38, max: 132 });
    expect(clampLandRaceRunnerX(-10)).toBe(38);
    expect(clampLandRaceRunnerX(76)).toBe(76);
    expect(clampLandRaceRunnerX(200)).toBe(132);
    expect(clampLandRaceRunnerX(Number.NaN)).toBe(38);
  });
  it('mantiene la línea de carrera y la escala del escenario', () => {
    expect(LAND_RACE_LANE_Y + 13).toBe(221);
    expect(LAND_RACE_LANE_SCALE).toBe(1);
    expect(LAND_RACE_WORLD_SCALE).toBe(0.14);
    expect(LAND_RACE_MAP_LOOP_DISTANCE).toBe(7714);
  });
});
