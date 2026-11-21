import { DASH, DODGE, TIMINGS, attackTotalMs, specialAttackTotalMs } from '../../domain/entities/FighterState.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import {
  animationKey,
  characterAnimationData,
} from '../../infrastructure/assets/characterAnimationData.js';
import { sheetTextureKey, maleAnimationKey } from '../../infrastructure/assets/assetManifest.js';

const RANGER_ORDER = [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE];
const LOOPING_STATES = new Set(['idle', 'walk']);

const oneShotDurationMs = (state) => {
  switch (state) {
    case 'attack':
      return attackTotalMs();
    case 'hurt':
      return TIMINGS.hurtMs;
    case 'block-hit':
      return TIMINGS.blockHitMs;
    case 'dodge':
      return DODGE.durationMs;
    case 'land':
      return TIMINGS.landMs;
    case 'special-attack':
      return specialAttackTotalMs();
    case 'victory':
      return TIMINGS.victoryAnimationMs;
    case 'teleport':
      return TIMINGS.teleportOutMs + TIMINGS.teleportInMs;
    case 'ko':
      return TIMINGS.koAnimationMs;
    default:
      return 400;
  }
};

/**
 * Registra las mismas coordenadas y el mismo orden de cuadros para ambos
 * personajes. Solo cambia la textura ya recoloreada automáticamente.
 */
export function registerCharacterAnimations(scene) {
  for (const rangerId of RANGER_ORDER) {
    for (const [action, frameRate] of [['run', 10], ['bike', 9], ['double-axe', 12]]) {
      const key = maleAnimationKey(rangerId, action);
      const texture = scene.textures.get(key);
      if (!scene.anims.exists(key) && texture) {
        const frames = scene.anims.generateFrameNumbers(key, { start: 0, end: texture.frameTotal - 2 });
        if (frames.length) scene.anims.create({
          key,
          frames,
          frameRate,
          repeat: action === 'double-axe' ? 0 : -1,
        });
      }
    }
    registerBikeAnimations(scene, rangerId);
  }
  for (const rangerId of RANGER_ORDER) registerGifAnimations(scene, rangerId);
  for (const rangerId of RANGER_ORDER) {
    const { sheets } = characterAnimationData[rangerId];

    for (const [state, sequence] of Object.entries(sheets)) {
      const key = animationKey(rangerId, state);
      const textureKey = sheetTextureKey(rangerId, state);
      if (scene.anims.exists(key) || !scene.textures.exists(textureKey)) continue;

      const frames = Array.from({ length: sequence.frameCount }, (_, index) => ({
        key: textureKey,
        frame: 'f' + index,
      }));

      const timing = LOOPING_STATES.has(state)
        ? { frameRate: sequence.frameRate, repeat: -1 }
        : { duration: oneShotDurationMs(state), repeat: 0 };

      scene.anims.create({ key, frames, ...timing });
    }
  }
}

/** Clave de la animación de daño: cuadros de impacto (hit) seguidos por los de retroceso (hurt). */
export const hurtComboKey = (rangerId) => maleAnimationKey(rangerId, 'hurt-combo');

const gifFrames = (scene, rangerId, action) => {
  const key = maleAnimationKey(rangerId, action);
  const texture = scene.textures.get(key);
  if (!texture || texture.key === '__MISSING') return [];
  return scene.anims.generateFrameNumbers(key, { start: 0, end: texture.frameTotal - 2 });
};

/**
 * Registra las animaciones que vienen de los GIF. Los golpes, el daño, el teleport
 * y el impulso se ajustan a las duraciones del dominio; el resto usa su ritmo original.
 */
function registerGifAnimations(scene, rangerId) {
  const define = (action, timing, frames = gifFrames(scene, rangerId, action), key = maleAnimationKey(rangerId, action)) => {
    if (!frames.length || scene.anims.exists(key)) return;
    scene.anims.create({ key, frames, ...timing });
  };

  define('idle', { frameRate: 7, repeat: -1 });
  define('guard', { frameRate: 8, repeat: -1 });
  define('roll', { duration: DODGE.durationMs, repeat: 0 });
  define('ko', { duration: TIMINGS.koAnimationMs, repeat: 0 });
  define('charge', { frameRate: 10, repeat: -1 });
  define('pose', { frameRate: 8, repeat: -1 });
  define('battle-pose', { frameRate: 10, repeat: 0 });
  define('jump', { frameRate: 14, repeat: 0 });
  define('dash', { duration: DASH.durationMs, repeat: 0 });
  define('teleport', { duration: TIMINGS.teleportOutMs + TIMINGS.teleportInMs, repeat: 0 });
  for (const punch of ['punch-01', 'punch-02', 'punch-03']) {
    define(punch, { duration: attackTotalMs(), repeat: 0 });
  }
  define(
    'hurt-combo',
    { duration: TIMINGS.hurtMs, repeat: 0 },
    [...gifFrames(scene, rangerId, 'hit'), ...gifFrames(scene, rangerId, 'hurt')],
    hurtComboKey(rangerId),
  );
}

/**
 * Variantes de ritmo para la carrera. Comparten los cuadros originales de bicicleta,
 * pero cada fase tiene una cadencia propia y se selecciona según la entrada del jugador.
 */
function registerBikeAnimations(scene, rangerId) {
  const sourceKey = maleAnimationKey(rangerId, 'bike');
  const texture = scene.textures.get(sourceKey);
  if (!texture) return;

  const frames = scene.anims.generateFrameNumbers(sourceKey, {
    start: 0,
    end: texture.frameTotal - 2,
  });
  if (!frames.length) return;

  const specs = [
    ['bike-idle', frames.slice(0, Math.min(3, frames.length)), 3, -1],
    ['bike-accelerate', frames, 12, -1],
    ['bike-brake', frames.slice(0, Math.min(4, frames.length)), 5, -1],
    ['bike-boost', frames, 16, -1],
    ['bike-victory', frames.slice(-Math.min(5, frames.length)), 8, 0],
    ['bike-defeat', frames.slice(0, Math.min(4, frames.length)), 5, 0],
  ];

  for (const [action, actionFrames, frameRate, repeat] of specs) {
    const key = maleAnimationKey(rangerId, action);
    if (scene.anims.exists(key) || !actionFrames.length) continue;
    scene.anims.create({ key, frames: actionFrames, frameRate, repeat });
  }
}
