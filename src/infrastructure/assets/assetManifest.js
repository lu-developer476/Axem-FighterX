import { genderForRanger } from '../../domain/rangers/rangerVariants.js';

export const DEFAULT_RANGER_GENDER = 'male';

export const spriteKeyFor = (rangerId, gender = genderForRanger(rangerId) ?? DEFAULT_RANGER_GENDER) =>
  'ranger-' + gender + '-' + rangerId;

export const spriteUrlFor = (rangerId, gender = genderForRanger(rangerId) ?? DEFAULT_RANGER_GENDER) =>
  import.meta.env.BASE_URL + 'generated/ranger-' + gender + '-' + rangerId + '.png';

/** Reservado para futuras hojas de animación registradas por estado. */
export const sheetTextureKey = (rangerId, state, gender = genderForRanger(rangerId) ?? DEFAULT_RANGER_GENDER) =>
  'motion-' + gender + '-' + rangerId + '-' + state;

/** Texturas laterales del menú: poses masculinas extraídas de Axem Red. */
export const menuSpriteKeyFor = (rangerId, gender = 'male') =>
  'menu-ranger-' + gender + '-' + rangerId;

export const menuSpriteUrlFor = (rangerId, gender = 'male') =>
  import.meta.env.BASE_URL + 'generated/menu-ranger-' + gender + '-' + rangerId + '.png';

export const maleAnimationKey = (rangerId, action) =>
  'axem-' + rangerId + '-' + action;

export const maleAnimationUrl = (rangerId, action) =>
  import.meta.env.BASE_URL + 'generated/axem-' + rangerId + '-' + action + '.png';
