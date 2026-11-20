import { Fighter } from '../entities/Fighter.js';
import { rangerCatalog } from './rangerCatalog.js';

/**
 * Fábrica de dominio: crea un Fighter a partir del catálogo.
 * @param {string} rangerId
 * @param {{ x: number, y: number }} position
 * @param {1 | -1} [facing]
 */
export function createFighter(rangerId, position, facing = 1, gender = 'male') {
  const definition = rangerCatalog[rangerId];
  if (!definition) throw new Error(`Ranger desconocido: ${rangerId}`);
  if (gender !== 'male' && gender !== 'female') {
    throw new Error(`Género de Axem Ranger desconocido: ${gender}`);
  }
  return new Fighter({ ...definition, position, facing, gender });
}
