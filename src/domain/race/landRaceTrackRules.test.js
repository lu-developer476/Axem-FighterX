import { describe, expect, it } from 'vitest';
import { LAND_RACE_LANE_SCALE, LAND_RACE_LANE_Y, LAND_RACE_RUNNER_X_BOUNDS, clampLandRaceRunnerX, getLandRaceGapJumpProgress, LAND_RACE_MAP_LOOP_DISTANCE, LAND_RACE_TERRAIN_GAPS, LAND_RACE_WORLD_SCALE, createLandRaceObstacles } from './landRaceTrackRules.js';
describe('Recorrido de Carrera Terrestre sobre desert.png', () => {
  it('mantiene al corredor dentro de la zona segura visible', () => {
    expect(LAND_RACE_RUNNER_X_BOUNDS).toEqual({ min: 38, max: 132 });
    expect(clampLandRaceRunnerX(-10)).toBe(38);
    expect(clampLandRaceRunnerX(76)).toBe(76);
    expect(clampLandRaceRunnerX(200)).toBe(132);
    expect(clampLandRaceRunnerX(Number.NaN)).toBe(38);
  });
  it('mantiene el cálculo genérico del arco de salto', () => {
    expect(getLandRaceGapJumpProgress(100, 100, 300)).toBe(0);
    expect(getLandRaceGapJumpProgress(200, 100, 300)).toBe(0.5);
    expect(getLandRaceGapJumpProgress(300, 100, 300)).toBe(1);
  });
  it('mantiene la línea de carrera y la escala del escenario', () => {
    expect(LAND_RACE_LANE_Y + 13).toBe(221);
    expect(LAND_RACE_LANE_SCALE).toBe(1);
    expect(LAND_RACE_WORLD_SCALE).toBe(0.14);
    expect(LAND_RACE_MAP_LOOP_DISTANCE).toBe(7714);
  });
  it('no importa huecos del mapa de cuevas al escenario desértico', () => expect(LAND_RACE_TERRAIN_GAPS).toEqual([]));
  it('repite únicamente obstáculos del circuito', () => {
    const pattern = [{ distance: 190, action: 'jump', type: 'hurdle' }, { distance: 370, action: 'roll', type: 'roll-gate' }];
    expect(createLandRaceObstacles(pattern, 2600).map(({ distance }) => distance)).toEqual([190, 370, 1390, 1570]);
  });
});
