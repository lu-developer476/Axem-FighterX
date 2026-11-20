import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';

/** Estados del luchador; las poses de combate se aplican de forma procedural. */
export const ANIMATION_STATES = Object.freeze([
  'idle', 'walk', 'attack', 'hurt', 'teleport', 'ko',
]);

const CHARACTER_DATA = Object.freeze({
  spriteFacing: -1,
  displayHeight: 83,
  sheets: Object.freeze({}),
});

export const characterAnimationData = Object.freeze({
  [RANGER_IDS.VIOLET]: CHARACTER_DATA,
  [RANGER_IDS.ORANGE]: CHARACTER_DATA,
});

export const animationKey = (rangerId, state) => rangerId + ':' + state;
