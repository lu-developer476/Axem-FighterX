import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { maleAnimationKey } from '../../infrastructure/assets/assetManifest.js';

const RANGER_ORDER = [RANGER_IDS.ORANGE];
const CHARACTER_FRAME_RATE = 10;

/** Registra únicamente las tiras PNG que ya están versionadas en art/source. */
export function registerCharacterAnimations(scene) {
  for (const rangerId of RANGER_ORDER) {
    const runKey = maleAnimationKey(rangerId, 'run');
    const runFrames = getFrames(scene, runKey);
    createAnimation(scene, runKey, runFrames, -1);
    createAnimation(scene, maleAnimationKey(rangerId, 'walk'), runFrames, -1);

    const bikeKey = maleAnimationKey(rangerId, 'bike');
    const bikeFrames = getFrames(scene, bikeKey);
    createAnimation(scene, bikeKey, bikeFrames, -1);
    registerBikeAnimations(scene, rangerId, bikeFrames);
  }
}

export const hurtComboKey = (rangerId) => maleAnimationKey(rangerId, 'hurt-combo');

function getFrames(scene, key) {
  const texture = scene.textures.get(key);
  if (!texture || texture.key === '__MISSING') return [];
  return scene.anims.generateFrameNumbers(key, {
    start: 0,
    end: Math.max(-1, texture.frameTotal - 2),
  });
}

function createAnimation(scene, key, frames, repeat = 0) {
  if (!frames.length || scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames,
    frameRate: CHARACTER_FRAME_RATE,
    repeat,
  });
}

function registerBikeAnimations(scene, rangerId, frames) {
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
    createAnimation(scene, maleAnimationKey(rangerId, action), actionFrames, repeat);
  }
}
