export const FighterState = Object.freeze({
  IDLE: 'idle',
  WALK: 'walk',
  ATTACK: 'attack',
  HURT: 'hurt',
  TELEPORT: 'teleport',
  KO: 'ko',
});

/** Duraciones en milisegundos. Las animaciones por datos se ajustan a estos valores. */
export const TIMINGS = Object.freeze({
  attack: Object.freeze({ windupMs: 120, activeMs: 110, recoveryMs: 190 }),
  hurtMs: 320,
  hitInvulnerabilityMs: 450,
  teleportOutMs: 130,
  teleportInMs: 150,
  teleportCooldownMs: 1400,
  koAnimationMs: 700,
});

export const attackTotalMs = () => {
  const { windupMs, activeMs, recoveryMs } = TIMINGS.attack;
  return windupMs + activeMs + recoveryMs;
};
