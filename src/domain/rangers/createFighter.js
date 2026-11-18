import { Fighter } from '../entities/Fighter.js';
import { rangerCatalog } from './rangerCatalog.js';

/**
 * Fábrica de dominio: crea un Fighter a partir del catálogo.
 * @param {string} rangerId
 * @param {{ x: number, y: number }} position
 */
export function createFighter(rangerId, position) {
  const definition = rangerCatalog[rangerId];
  if (!definition) throw new Error(`Ranger desconocido: ${rangerId}`);
  return new Fighter({ ...definition, position });
}
