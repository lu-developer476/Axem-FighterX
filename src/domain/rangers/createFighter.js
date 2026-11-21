import { Fighter } from '../entities/Fighter.js';
import { rangerCatalog, allowedGenderFor, isAllowedRangerVariant } from './rangerCatalog.js';

/**
 * Fábrica de dominio: crea un Fighter a partir del catálogo.
 * @param {string} rangerId
 * @param {{ x: number, y: number }} position
 * @param {1 | -1} [facing]
 */
export function createFighter(rangerId, position, facing = 1, gender = allowedGenderFor(rangerId)) {
  const definition = rangerCatalog[rangerId];
  if (!definition) throw new Error(`Ranger desconocido: ${rangerId}`);
  if (!isAllowedRangerVariant(rangerId, gender)) {
    throw new Error(`Variante de Axem Ranger no disponible: ${rangerId}/${gender}`);
  }
  return new Fighter({ ...definition, position, facing, gender });
}
