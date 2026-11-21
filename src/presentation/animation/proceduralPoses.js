import { TIMINGS, attackTotalMs } from '../../domain/entities/FighterState.js';

/**
 * Animaciones por código para cuando todavía no hay hoja de sprites.
 * Son funciones puras del estado y del tiempo: devuelven la "pose" (desplazamiento,
 * rotación, escala, opacidad) que la vista aplica sobre la imagen actual.
 * Convención: x e ángulo son "hacia adelante" (la vista los invierte según la orientación).
 *
 * @typedef {{ x: number, y: number, angle: number, scaleX: number, scaleY: number, alpha: number, flash: boolean }} Pose
 */

/** @type {Pose} */
export const NEUTRAL_POSE = Object.freeze({
  x: 0,
  y: 0,
  angle: 0,
  scaleX: 1,
  scaleY: 1,
  alpha: 1,
  flash: false,
});

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOutQuad = (k) => 1 - (1 - k) * (1 - k);
const easeInOutSine = (k) => -(Math.cos(Math.PI * k) - 1) / 2;
const FLASH_MS = 90;

/**
 * @param {string} state estado del luchador
 * @param {number} timeMs tiempo dentro del estado
 * @param {number} elapsedMs tiempo total (se conserva para compatibilidad con la vista)
 * @returns {Pose}
 */
export function poseFor(state, timeMs, elapsedMs) {
  switch (state) {
    case 'walk':
      // Mantiene una leve inclinación de avance, sin deformaciones ni bamboleo.
      return { ...NEUTRAL_POSE, angle: 7 };
    case 'attack':
      return attackPose(timeMs);
    case 'special-attack':
      return specialAttackPose(timeMs);
    case 'block':
      return blockPose(timeMs);
    case 'block-hit':
      return blockHitPose(timeMs);
    case 'dodge':
      return dodgePose(timeMs);
    case 'land':
      return landPose(timeMs);
    case 'victory':
      return victoryPose(timeMs);
    case 'hurt':
      return hurtPose(timeMs);
    case 'teleport':
      return teleportPose(timeMs);
    case 'ko':
      return koPose(timeMs);
    case 'idle':
    default:
      // La levitación se aplica por separado desde FighterView mediante hoverOffset.
      return NEUTRAL_POSE;
  }
}

/** Pose neutra con destello, para cuando una hoja de sprites hace la animación. */
export function flashOnlyPose(state, timeMs) {
  return { ...NEUTRAL_POSE, flash: (state === 'hurt' || state === 'ko' || state === 'block-hit') && timeMs < FLASH_MS };
}

function attackPose(t) {
  const { windupMs, activeMs, recoveryMs } = TIMINGS.attack;
  if (t < windupMs) {
    const k = easeOutQuad(clamp01(t / windupMs));
    return { ...NEUTRAL_POSE, angle: -22 * k, x: -8 * k, scaleX: 1 - 0.04 * k };
  }
  if (t < windupMs + activeMs) {
    const k = easeOutQuad(clamp01((t - windupMs) / activeMs));
    return {
      ...NEUTRAL_POSE,
      angle: lerp(-22, 40, k),
      x: lerp(-8, 16, k),
      scaleX: lerp(0.96, 1.06, k),
    };
  }
  const k = easeInOutSine(clamp01((t - windupMs - activeMs) / recoveryMs));
  return { ...NEUTRAL_POSE, angle: lerp(40, 0, k), x: lerp(16, 0, k), scaleX: lerp(1.06, 1, k) };
}

function hurtPose(t) {
  const k = clamp01(t / TIMINGS.hurtMs);
  const fade = 1 - k;
  return {
    ...NEUTRAL_POSE,
    x: -6 * fade + Math.sin(t / 18) * 3 * fade,
    angle: -14 * fade,
    flash: t < FLASH_MS,
  };
}

function teleportPose(t) {
  const { teleportOutMs, teleportInMs } = TIMINGS;
  if (t < teleportOutMs) {
    const k = clamp01(t / teleportOutMs);
    return { ...NEUTRAL_POSE, scaleX: Math.max(0.02, 1 - k), scaleY: 1 + 0.5 * k, alpha: 1 - k };
  }
  const k = clamp01((t - teleportOutMs) / teleportInMs);
  return { ...NEUTRAL_POSE, scaleX: Math.max(0.02, k), scaleY: 1.5 - 0.5 * k, alpha: k };
}

function koPose(t) {
  const e = easeOutQuad(clamp01(t / 450));
  return { ...NEUTRAL_POSE, angle: -90 * e, x: -10 * e, y: -14 * e, flash: t < FLASH_MS };
}

function blockPose(t) {
  return {
    ...NEUTRAL_POSE,
    x: -3,
    angle: -11 + Math.sin(t / 55) * 1.4,
    scaleX: 0.94,
    scaleY: 1.03,
  };
}

function blockHitPose(t) {
  const fade = 1 - clamp01(t / TIMINGS.blockHitMs);
  return {
    ...NEUTRAL_POSE,
    x: -5 * fade + Math.sin(t / 16) * 2 * fade,
    angle: -16 * fade,
    scaleX: 0.92 + 0.08 * (1 - fade),
    flash: t < FLASH_MS,
  };
}

function dodgePose(t) {
  const k = easeInOutSine(clamp01(t / 320));
  return {
    ...NEUTRAL_POSE,
    x: -18 * Math.sin(Math.PI * k),
    y: 7 * Math.sin(Math.PI * k),
    angle: 68 * Math.sin(Math.PI * k),
    scaleX: lerp(1, 0.9, Math.sin(Math.PI * k)),
    scaleY: lerp(1, 0.72, Math.sin(Math.PI * k)),
  };
}

function landPose(t) {
  const k = clamp01(t / TIMINGS.landMs);
  const squash = Math.sin(Math.PI * k);
  return {
    ...NEUTRAL_POSE,
    y: -2 * squash,
    scaleX: 1 + 0.16 * squash,
    scaleY: 1 - 0.18 * squash,
    angle: 2 * (1 - k),
  };
}

function specialAttackPose(t) {
  const { windupMs, activeMs, recoveryMs } = TIMINGS.specialAttack;
  if (t < windupMs) {
    const k = easeOutQuad(clamp01(t / windupMs));
    return { ...NEUTRAL_POSE, angle: -32 * k, x: -12 * k, scaleX: 0.9 };
  }
  if (t < windupMs + activeMs) {
    const k = easeOutQuad(clamp01((t - windupMs) / activeMs));
    return { ...NEUTRAL_POSE, angle: lerp(-32, 58, k), x: lerp(-12, 25, k), scaleX: 1.12 };
  }
  const k = easeInOutSine(clamp01((t - windupMs - activeMs) / recoveryMs));
  return { ...NEUTRAL_POSE, angle: lerp(58, 0, k), x: lerp(25, 0, k), scaleX: lerp(1.12, 1, k) };
}

function victoryPose(t) {
  const bounce = Math.sin(t / 110);
  return {
    ...NEUTRAL_POSE,
    y: -8 - Math.max(0, bounce) * 4,
    angle: -5 + bounce * 3,
    scaleX: 1.04,
    scaleY: 1.04,
  };
}
