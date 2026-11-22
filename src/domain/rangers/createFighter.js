import { Fighter } from '../entities/Fighter.js';
import { rangerCatalog } from './rangerCatalog.js';
import { genderForRanger, isAvailableRangerVariant } from './rangerVariants.js';

/**
 * Fábrica de dominio: crea un Fighter a partir del catálogo.
 * @param {string} rangerId
 * @param {{ x: number, y: number }} position
 * @param {1 | -1} [facing]
 */
export function createFighter(rangerId, position, facing = 1, gender, combatantId = rangerId) {
  const definition = rangerCatalog[rangerId];
  if (!definition) throw new Error(`Ranger desconocido: ${rangerId}`);
  const selectedGender = gender ?? genderForRanger(rangerId);
  if (!isAvailableRangerVariant(rangerId, selectedGender)) {
    throw new Error(`Variante de Axem no disponible: ${rangerId}/${selectedGender}`);
  }
  return new Fighter({ ...definition, position, facing, gender: selectedGender, combatantId });
}
