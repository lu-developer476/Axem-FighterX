/** Asignación fija: un jugador humano contra una IA. */
export function getPlayersByStartCorner() { return ['J1', 'IA']; }
export function getCharacterSelectionsByCorner(selection) {
  if (!selection || typeof selection.id !== 'string') throw new Error('El jugador debe elegir un Axem disponible antes de iniciar.');
  return [selection, selection];
}
