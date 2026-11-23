import { describe, expect, it } from 'vitest';
import {
  LAND_RACE_GAP_JUMP_DURATION_MS,
  LAND_RACE_GAP_TRIGGER_DISTANCE,
  LAND_RACE_LANE_SCALE,
  LAND_RACE_LANE_Y,
  LAND_RACE_RUNNER_X_BOUNDS,
  clampLandRaceRunnerX,
  getLandRaceGapJumpProgress,
  LAND_RACE_MAP_LOOP_DISTANCE,
  LAND_RACE_TERRAIN_GAPS,
  LAND_RACE_WORLD_SCALE,
  createLandRaceObstacles,
} from './landRaceTrackRules.js';

describe('Recorrido de Carrera Terrestre', () => {
  it('mantiene al corredor dentro de la zona segura visible del circuito', () => {
    expect(LAND_RACE_RUNNER_X_BOUNDS).toEqual({ min: 38, max: 132 });
    expect(clampLandRaceRunnerX(-10)).toBe(38);
    expect(clampLandRaceRunnerX(76)).toBe(76);
    expect(clampLandRaceRunnerX(200)).toBe(132);
    expect(clampLandRaceRunnerX(Number.NaN)).toBe(38);
  });

  it('sincroniza el arco de salto con la entrada y salida del hueco', () => {
    expect(getLandRaceGapJumpProgress(100, 100, 300)).toBe(0);
    expect(getLandRaceGapJumpProgress(200, 100, 300)).toBe(0.5);
    expect(getLandRaceGapJumpProgress(300, 100, 300)).toBe(1);
    expect(getLandRaceGapJumpProgress(360, 100, 300)).toBe(1);
    expect(getLandRaceGapJumpProgress(200, 300, 100)).toBe(0);
  });

  it('mantiene una única línea de carrera alineada con el suelo de la cueva', () => {
    expect(LAND_RACE_LANE_Y + 13).toBe(221);
    expect(LAND_RACE_LANE_SCALE).toBe(1);
  });

  it('usa la misma escala para el mapa y el desplazamiento de los corredores', () => {
    expect(LAND_RACE_WORLD_SCALE).toBe(0.14);
    expect(LAND_RACE_MAP_LOOP_DISTANCE).toBe(7714);
  });

  it('define el hueco de cave-2 como un salto con tiempo suficiente para cruzarlo', () => {
    expect(LAND_RACE_TERRAIN_GAPS).toEqual([{
      distance: 4814,
      width: 393,
      action: 'jump',
      type: 'gap',
    }]);
    expect(LAND_RACE_GAP_TRIGGER_DISTANCE).toBe(130);
    expect(LAND_RACE_GAP_JUMP_DURATION_MS).toBeGreaterThan(4000);
  });

  it('retira obstáculos artificiales de la entrada, el hueco y el aterrizaje', () => {
    const pattern = [
      { distance: 190, action: 'jump', type: 'hurdle' },
      { distance: 370, action: 'roll', type: 'roll-gate' },
      { distance: 555, action: 'jump', type: 'hurdle' },
      { distance: 745, action: 'roll', type: 'roll-gate' },
      { distance: 930, action: 'jump', type: 'hurdle' },
      { distance: 1080, action: 'jump', type: 'hurdle' },
    ];
    const result = createLandRaceObstacles(pattern, 6000);
    const gap = result.find(({ type }) => type === 'gap');

    expect(gap).toMatchObject({ distance: 4814, width: 393, action: 'jump' });
    expect(result).toEqual([...result].sort((a, b) => a.distance - b.distance));
    expect(result.filter(({ type }) => type !== 'gap').every(({ distance }) =>
      distance < gap.distance - 160 || distance > gap.distance + gap.width + 120,
    )).toBe(true);
  });
});
