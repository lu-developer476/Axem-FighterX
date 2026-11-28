import { describe, expect, it } from 'vitest';
import { TREADMILL_RUNNER_X } from './treadmillRaceRules.js';
import { LAND_RACE_LANE_SCALE, LAND_RACE_LANE_Y } from './landRaceTrackRules.js';

describe('Reglas de carrera tipo cinta', () => {
  it('mantiene a todos los corredores sobre la misma línea horizontal de salida', () => {
    expect(TREADMILL_RUNNER_X).toBe(76);
  });

  it('define una sola superficie terrestre compartida y alinea los pies con el suelo', () => {
    expect(LAND_RACE_LANE_Y + 13).toBe(221);
    expect(LAND_RACE_LANE_SCALE).toBe(1);
  });
});
