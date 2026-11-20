import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';

/** Estados del luchador; las poses de combate se aplican de forma procedural. */
export const ANIMATION_STATES = Object.freeze([
  'idle', 'walk', 'attack', 'hurt', 'teleport', 'ko',
]);

/**
 * Orientación nativa de cada fuente, separada por género.
 * Menú, cinemática y combate consultan este dato para no invertir imágenes a mano.
 */
const CHARACTER_DATA = Object.freeze({
  spriteFacing: Object.freeze({
    male: -1,
    female: -1,
  }),
  displayHeight: 83,
  sheets: Object.freeze({}),
});

export const characterAnimationData = Object.freeze({
  [RANGER_IDS.VIOLET]: CHARACTER_DATA,
  [RANGER_IDS.ORANGE]: CHARACTER_DATA,
});

export const spriteFacingFor = (rangerId, gender = 'male') =>
  characterAnimationData[rangerId]?.spriteFacing?.[gender] ?? -1;

export const animationKey = (rangerId, state) => rangerId + ':' + state;
