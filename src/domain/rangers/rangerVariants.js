import { RANGER_IDS } from './rangerCatalog.js';

/** Variante temporalmente disponible: Axem Naranja masculino. */
export const AVAILABLE_RANGER_VARIANTS = Object.freeze([
  Object.freeze({ id: RANGER_IDS.ORANGE, gender: 'male' }),
  Object.freeze({ id: RANGER_IDS.WHITE, gender: 'male' }),
  Object.freeze({ id: RANGER_IDS.RED, gender: 'male' }),
]);

export function isAvailableRangerVariant(rangerId, gender) {
  return AVAILABLE_RANGER_VARIANTS.some((variant) => variant.id === rangerId && variant.gender === gender);
}
export function genderForRanger(rangerId) {
  return AVAILABLE_RANGER_VARIANTS.find((variant) => variant.id === rangerId)?.gender ?? null;
}
/** La IA usa la misma variante hasta que las demás spritesheets estén terminadas. */
export function getCounterpartSelection(selection) {
  if (!selection || !isAvailableRangerVariant(selection.id, selection.gender)) {
    throw new Error('La selección de Axem no está disponible.');
  }
  return { ...selection };
}
