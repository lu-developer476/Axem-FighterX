import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';

const CHARACTER_DATA = Object.freeze({
  spriteFacing: Object.freeze({ male: 1, female: 1 }),
  displayHeight: 83,
});

export const characterAnimationData = Object.freeze({
  [RANGER_IDS.ORANGE]: CHARACTER_DATA,
});

export const spriteFacingFor = (rangerId, gender = 'male') =>
  characterAnimationData[rangerId]?.spriteFacing?.[gender] ?? -1;

