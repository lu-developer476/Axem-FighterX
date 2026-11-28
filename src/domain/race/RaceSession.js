export const RACE_SESSION_PHASES = Object.freeze({
  DISTANCE_SELECTION: 'distance-selection',
  COUNTDOWN: 'countdown',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
});

const isValidPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const normalizeDuration = (value) => {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new RangeError('La duración debe ser un número finito mayor o igual a cero.');
  }
  return duration;
};

/**
 * Estado y transiciones compartidas por los minijuegos de carrera.
 * Las escenas conservan sus reglas, entradas, objetos y renderizado específicos.
 */
export class RaceSession {
  constructor({ countdownDurationMs = 3000 } = {}) {
    this.defaultCountdownDurationMs = normalizeDuration(countdownDurationMs);
    this.reset();
  }

  get selectingDistance() {
    return this.phase === RACE_SESSION_PHASES.DISTANCE_SELECTION;
  }

  get paused() {
    return this.phase === RACE_SESSION_PHASES.PAUSED;
  }

  get finished() {
    return this.phase === RACE_SESSION_PHASES.FINISHED;
  }

  get running() {
    return this.phase === RACE_SESSION_PHASES.RUNNING;
  }

  reset() {
    this.phase = RACE_SESSION_PHASES.DISTANCE_SELECTION;
    this.distance = 0;
    this.countdownMs = 0;
    this.result = null;
    this.resumePhase = null;
    return this.snapshot();
  }

  start(distance, countdownDurationMs = this.defaultCountdownDurationMs) {
    if (!isValidPositiveNumber(distance)) {
      throw new RangeError('La distancia de carrera debe ser un número positivo.');
    }

    this.distance = Number(distance);
    this.countdownMs = normalizeDuration(countdownDurationMs);
    this.result = null;
    this.resumePhase = null;
    this.phase = this.countdownMs > 0
      ? RACE_SESSION_PHASES.COUNTDOWN
      : RACE_SESSION_PHASES.RUNNING;

    return this.snapshot();
  }

  advanceCountdown(deltaMs) {
    if (this.phase !== RACE_SESSION_PHASES.COUNTDOWN) return this.countdownMs;

    const elapsed = Number(deltaMs);
    if (Number.isFinite(elapsed) && elapsed > 0) {
      this.countdownMs = Math.max(0, this.countdownMs - elapsed);
    }

    if (this.countdownMs === 0) this.phase = RACE_SESSION_PHASES.RUNNING;
    return this.countdownMs;
  }

  pause() {
    if (this.phase !== RACE_SESSION_PHASES.COUNTDOWN &&
        this.phase !== RACE_SESSION_PHASES.RUNNING) {
      return false;
    }

    this.resumePhase = this.phase;
    this.phase = RACE_SESSION_PHASES.PAUSED;
    return true;
  }

  resume() {
    if (!this.paused) return false;
    this.phase = this.resumePhase ?? RACE_SESSION_PHASES.RUNNING;
    this.resumePhase = null;
    return true;
  }

  finish(result = null) {
    if (!this.running) return false;
    this.result = result;
    this.phase = RACE_SESSION_PHASES.FINISHED;
    return true;
  }

  snapshot() {
    return Object.freeze({
      phase: this.phase,
      distance: this.distance,
      countdownMs: this.countdownMs,
      result: this.result,
    });
  }
}
