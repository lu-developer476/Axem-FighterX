export const RANGER_GENDERS = Object.freeze(['male', 'female']);
export const DEFAULT_RANGER_GENDER = 'male';

export const spriteKeyFor = (rangerId, gender = DEFAULT_RANGER_GENDER) =>
  'ranger-' + gender + '-' + rangerId;

export const spriteUrlFor = (rangerId, gender = DEFAULT_RANGER_GENDER) =>
  import.meta.env.BASE_URL + 'generated/ranger-' + gender + '-' + rangerId + '.png';

/** Reservado para futuras hojas de animación registradas por estado. */
export const sheetTextureKey = (rangerId, state, gender = DEFAULT_RANGER_GENDER) =>
  'motion-' + gender + '-' + rangerId + '-' + state;
