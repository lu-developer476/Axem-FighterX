import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import {
  animationKey,
  characterAnimationData,
} from '../../infrastructure/assets/characterAnimationData.js';
import { sheetTextureKey, maleAnimationKey } from '../../infrastructure/assets/assetManifest.js';

const RANGER_ORDER = [RANGER_IDS.ORANGE];
const CHARACTER_FRAME_RATE = 10;
const LOOPING_STATES = new Set(['idle', 'walk']);

/**
 * Todas las animaciones de personajes usan 10 fps: cada cuadro permanece
 * visible durante 100 ms, independientemente de la acción o su cantidad de cuadros.
 */
export function registerCharacterAnimations(scene) {
  for (const rangerId of RANGER_ORDER) {
    for (const action of ['run', 'bike']) {
      const key = maleAnimationKey(rangerId, action);
      const texture = scene.textures.get(key);
      if (!scene.anims.exists(key) && texture) {
        const frames = scene.anims.generateFrameNumbers(key, { start: 0, end: texture.frameTotal - 2 });
        if (frames.length) scene.anims.create({
          key,
          frames,
          frameRate: CHARACTER_FRAME_RATE,
          repeat: -1,
        });
      }
    }
    registerBikeAnimations(scene, rangerId);
    registerWalkAnimations(scene, rangerId);
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

      scene.anims.create({
        key,
        frames,
        frameRate: CHARACTER_FRAME_RATE,
        repeat: LOOPING_STATES.has(state) ? -1 : 0,
      });
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
 * Registra animaciones desde hojas derivadas de GIF. Cada estado, incluidos
 * los de un solo uso, avanza exactamente un cuadro cada 100 ms.
 */
function registerGifAnimations(scene, rangerId) {
  const define = (action, {
    frames = gifFrames(scene, rangerId, action),
    key = maleAnimationKey(rangerId, action),
    repeat = 0,
  } = {}) => {
    if (!frames.length || scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames,
      frameRate: CHARACTER_FRAME_RATE,
      repeat,
    });
  };

  define('idle', { repeat: -1 });
  define('guard', { repeat: -1 });
  define('roll');
  define('ko');
  define('charge', { repeat: -1 });
  define('pose', { repeat: -1 });
  define('attack', {
    frames: ['punch-01', 'punch-02', 'punch-03']
      .flatMap((action) => gifFrames(scene, rangerId, action)),
  });
  define('victory', { frames: gifFrames(scene, rangerId, 'pose') });
  define('jump');
  define('dash');
  define('teleport');
  for (const punch of ['punch-01', 'punch-02', 'punch-03']) define(punch);
  define('hurt-combo', {
    frames: [...gifFrames(scene, rangerId, 'hit'), ...gifFrames(scene, rangerId, 'hurt')],
    key: hurtComboKey(rangerId),
  });
}

/** La caminata reutiliza la secuencia run sin duplicar recursos raster. */
function registerWalkAnimations(scene, rangerId) {
  const sourceKey = maleAnimationKey(rangerId, 'run');
  const texture = scene.textures.get(sourceKey);
  const key = maleAnimationKey(rangerId, 'walk');
  if (!texture || scene.anims.exists(key)) return;
  const frames = scene.anims.generateFrameNumbers(sourceKey, {
    start: 0,
    end: texture.frameTotal - 2,
  });
  if (frames.length) scene.anims.create({
    key,
    frames,
    frameRate: CHARACTER_FRAME_RATE,
    repeat: -1,
  });
}

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
    ['bike-idle', frames.slice(0, Math.min(3, frames.length)), -1],
    ['bike-accelerate', frames, -1],
    ['bike-brake', frames.slice(0, Math.min(4, frames.length)), -1],
    ['bike-boost', frames, -1],
    ['bike-victory', frames.slice(-Math.min(5, frames.length)), 0],
    ['bike-defeat', frames.slice(0, Math.min(4, frames.length)), 0],
  ];

  for (const [action, actionFrames, repeat] of specs) {
    const key = maleAnimationKey(rangerId, action);
    if (scene.anims.exists(key) || !actionFrames.length) continue;
    scene.anims.create({
      key,
      frames: actionFrames,
      frameRate: CHARACTER_FRAME_RATE,
      repeat,
    });
  }
}
