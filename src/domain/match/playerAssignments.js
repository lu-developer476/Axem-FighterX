import { genderForRanger } from '../rangers/rangerVariants.js';

/**
 * Asignaciones estables de los dos participantes humanos.
 * El jugador conserva su personaje y su esquema de teclado al cambiar de esquina.
 */
const VALID_SIDES = new Set(['left', 'right']);

export function getPlayersByStartCorner(playerSides) {
  const j1Side = playerSides?.J1;
  const j2Side = playerSides?.J2;
  if (
    !VALID_SIDES.has(j1Side)
    || !VALID_SIDES.has(j2Side)
    || j1Side === j2Side
  ) {
    throw new Error('J1 y J2 deben elegir esquinas opuestas antes de iniciar el combate.');
  }

  return j1Side === 'left' ? ['J1', 'J2'] : ['J2', 'J1'];
}

/**
 * Convierte elecciones de personaje identificadas por jugador en el orden espacial.
 * Todos los participantes usan Axem Naranja masculino mientras se completan las demás hojas.
 */
export function getCharacterSelectionsByCorner(playerCharacters, playerSides) {
  const playersByCorner = getPlayersByStartCorner(playerSides);
  return playersByCorner.map((player) => {
    const selection = playerCharacters?.[player];
    const gender = selection && typeof selection.id === 'string'
      ? genderForRanger(selection.id)
      : null;
    if (!gender) {
      throw new Error(`${player} debe elegir un Axem disponible antes de iniciar.`);
    }
    return { id: selection.id, gender };
  });
}
