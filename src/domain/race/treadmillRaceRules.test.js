import { describe, expect, it } from 'vitest';
import { TREADMILL_RUNNER_X } from './treadmillRaceRules.js';

describe('Reglas de carrera tipo cinta', () => {
  it('mantiene a todos los corredores sobre la misma línea horizontal de salida', () => {
    expect(TREADMILL_RUNNER_X).toBe(76);
  });
});
