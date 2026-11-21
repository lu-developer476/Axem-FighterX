export const FighterState = Object.freeze({
  IDLE: 'idle',
  WALK: 'walk',
  DASH: 'dash',
  DODGE: 'dodge',
  BLOCK: 'block',
  BLOCK_HIT: 'block-hit',
  ATTACK: 'attack',
  SPECIAL_ATTACK: 'special-attack',
  HURT: 'hurt',
  LAND: 'land',
  TELEPORT: 'teleport',
  KO: 'ko',
});

export const TIMINGS = Object.freeze({
  attack: Object.freeze({ windupMs: 120, activeMs: 110, recoveryMs: 190 }),
  specialAttack: Object.freeze({ windupMs: 240, activeMs: 160, recoveryMs: 420, cooldownMs: 2600 }),
  blockHitMs: 180,
  landMs: 210,
  hurtMs: 320,
  hitInvulnerabilityMs: 450,
  teleportOutMs: 130,
  teleportInMs: 150,
  teleportCooldownMs: 1400,
  koAnimationMs: 700,
  victoryAnimationMs: 850,
});

export const DASH = Object.freeze({ durationMs: 180, cooldownMs: 900, speedMultiplier: 3.1 });
export const DODGE = Object.freeze({
  durationMs: 320,
  cooldownMs: 1050,
  invulnerabilityMs: 145,
  speedMultiplier: 2.2,
});

export const attackTotalMs = () => {
  const { windupMs, activeMs, recoveryMs } = TIMINGS.attack;
  return windupMs + activeMs + recoveryMs;
};

export const specialAttackTotalMs = () => {
  const { windupMs, activeMs, recoveryMs } = TIMINGS.specialAttack;
  return windupMs + activeMs + recoveryMs;
};
