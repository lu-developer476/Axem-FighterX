import { allowedGenderFor, isAllowedRangerVariant } from '../../domain/rangers/rangerCatalog.js';
export { allowedGenderFor, isAllowedRangerVariant };

export const DEFAULT_RANGER_GENDER = 'male';

export const spriteKeyFor = (rangerId, gender = DEFAULT_RANGER_GENDER) =>
  'ranger-' + gender + '-' + rangerId;

export const spriteUrlFor = (rangerId, gender = DEFAULT_RANGER_GENDER) =>
  import.meta.env.BASE_URL + 'generated/ranger-' + gender + '-' + rangerId + '.png';

/** Reservado para futuras hojas de animación registradas por estado. */
export const sheetTextureKey = (rangerId, state, gender = DEFAULT_RANGER_GENDER) =>
  'motion-' + gender + '-' + rangerId + '-' + state;

/** Texturas laterales del menú: poses masculinas extraídas de Axem Red. */
export const menuSpriteKeyFor = (rangerId) => 'menu-ranger-male-' + rangerId;

export const menuSpriteUrlFor = (rangerId) =>
  import.meta.env.BASE_URL + 'generated/menu-ranger-male-' + rangerId + '.png';

export const maleAnimationKey = (rangerId, action) =>
  'axem-' + rangerId + '-' + action;

export const maleAnimationUrl = (rangerId, action) =>
  import.meta.env.BASE_URL + 'generated/axem-' + rangerId + '-' + action + '.png';
