import { describe, it, expect } from 'vitest';
import { poseFor, flashOnlyPose, NEUTRAL_POSE } from './proceduralPoses.js';
import { TIMINGS, attackTotalMs } from '../../domain/entities/FighterState.js';

describe('poses por código', () => {
  it('el reposo no deforma ni balancea el sprite', () => {
    expect(poseFor('idle', 0, 0)).toEqual(NEUTRAL_POSE);
    expect(poseFor('idle', 500, 1200)).toEqual(NEUTRAL_POSE);
    expect(poseFor('idle', 1500, 9000)).toEqual(NEUTRAL_POSE);
  });

  it('la caminata conserva una inclinación estable sin ondulaciones', () => {
    const first = poseFor('walk', 0, 0);
    const later = poseFor('walk', 700, 5000);
    expect(first).toEqual({ ...NEUTRAL_POSE, angle: 7 });
    expect(later).toEqual(first);
    expect(first.scaleX).toBe(1);
    expect(first.scaleY).toBe(1);
  });

  it('el ataque carga hacia atrás, golpea hacia adelante y vuelve a neutro', () => {
    const windup = poseFor('attack', TIMINGS.attack.windupMs - 1, 0);
    const strike = poseFor('attack', TIMINGS.attack.windupMs + TIMINGS.attack.activeMs - 1, 0);
    const end = poseFor('attack', attackTotalMs() - 0.001, 0);
    expect(windup.angle).toBeLessThan(0);
    expect(strike.angle).toBeGreaterThan(30);
    expect(Math.abs(end.angle)).toBeLessThan(1);
  });

  it('el teletransporte desaparece y reaparece', () => {
    const gone = poseFor('teleport', TIMINGS.teleportOutMs, 0);
    const start = poseFor('teleport', 0, 0);
    const back = poseFor('teleport', TIMINGS.teleportOutMs + TIMINGS.teleportInMs, 0);
    expect(start.alpha).toBe(1);
    expect(gone.alpha).toBeLessThan(0.01);
    expect(back.alpha).toBeGreaterThan(0.99);
  });

  it('el golpe recibido destella al inicio y se apaga', () => {
    expect(poseFor('hurt', 10, 0).flash).toBe(true);
    expect(poseFor('hurt', 200, 0).flash).toBe(false);
  });

  it('el KO termina caído (rotado hacia atrás)', () => {
    expect(poseFor('ko', 2000, 0).angle).toBeCloseTo(-90);
  });

  it('con hoja de sprites solo queda el destello', () => {
    expect(flashOnlyPose('hurt', 10).flash).toBe(true);
    expect(flashOnlyPose('idle', 10)).toEqual(NEUTRAL_POSE);
  });
});
