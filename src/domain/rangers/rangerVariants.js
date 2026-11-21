import { RANGER_IDS } from './rangerCatalog.js';

/** Únicas combinaciones de personaje que existen en el juego. */
export const AVAILABLE_RANGER_VARIANTS = Object.freeze([
  Object.freeze({ id: RANGER_IDS.ORANGE, gender: 'male' }),
  Object.freeze({ id: RANGER_IDS.VIOLET, gender: 'female' }),
]);

export function isAvailableRangerVariant(rangerId, gender) {
  return AVAILABLE_RANGER_VARIANTS.some((variant) =>
    variant.id === rangerId && variant.gender === gender,
  );
}

export function genderForRanger(rangerId) {
  return AVAILABLE_RANGER_VARIANTS.find((variant) => variant.id === rangerId)?.gender ?? null;
}

export function getCounterpartSelection(selection) {
  if (!selection || !isAvailableRangerVariant(selection.id, selection.gender)) {
    throw new Error('La selección de Axem no está disponible.');
  }
  const counterpart = AVAILABLE_RANGER_VARIANTS.find((variant) => variant.id !== selection.id);
  return { ...counterpart };
}
