import { describe, expect, it } from 'vitest';
import { RaceSession, RACE_SESSION_PHASES } from './RaceSession.js';

describe('Ciclo de vida compartido de las carreras', () => {
  it('comienza esperando la selección de distancia', () => {
    const session = new RaceSession();
    expect(session.phase).toBe(RACE_SESSION_PHASES.DISTANCE_SELECTION);
    expect(session.selectingDistance).toBe(true);
    expect(session.finished).toBe(false);
  });

  it('pasa de la cuenta regresiva a la carrera sin saltarse la fase', () => {
    const session = new RaceSession({ countdownDurationMs: 3000 });
    session.start(2000);
    expect(session.phase).toBe(RACE_SESSION_PHASES.COUNTDOWN);
    expect(session.countdownMs).toBe(3000);

    session.advanceCountdown(1200);
    expect(session.countdownMs).toBe(1800);
    expect(session.running).toBe(false);

    session.advanceCountdown(1800);
    expect(session.phase).toBe(RACE_SESSION_PHASES.RUNNING);
    expect(session.running).toBe(true);
    expect(session.countdownMs).toBe(0);
  });

  it('pausa y reanuda conservando la fase y el tiempo restante', () => {
    const session = new RaceSession();
    session.start(5000);
    session.advanceCountdown(900);

    expect(session.pause()).toBe(true);
    expect(session.phase).toBe(RACE_SESSION_PHASES.PAUSED);
    expect(session.advanceCountdown(1000)).toBe(2100);

    expect(session.resume()).toBe(true);
    expect(session.phase).toBe(RACE_SESSION_PHASES.COUNTDOWN);
    expect(session.countdownMs).toBe(2100);

    session.advanceCountdown(2100);
    expect(session.running).toBe(true);
    expect(session.pause()).toBe(true);
    expect(session.resume()).toBe(true);
    expect(session.running).toBe(true);
  });

  it('finaliza una carrera en ejecución y conserva el resultado', () => {
    const session = new RaceSession({ countdownDurationMs: 0 });
    session.start(1000);
    expect(session.finish({ playerWon: true })).toBe(true);
    expect(session.finished).toBe(true);
    expect(session.result).toEqual({ playerWon: true });
    expect(session.finish({ playerWon: false })).toBe(false);
  });

  it('reinicia a la selección y rechaza distancias o duraciones inválidas', () => {
    const session = new RaceSession();
    session.start(2000);
    session.reset();

    expect(session.selectingDistance).toBe(true);
    expect(session.distance).toBe(0);
    expect(session.result).toBeNull();
    expect(() => session.start(0)).toThrow(RangeError);
    expect(() => session.start(1000, -1)).toThrow(RangeError);
  });
});
