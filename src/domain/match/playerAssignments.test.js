import { describe, expect, it } from 'vitest';
import { getCharacterSelectionsByCorner, getPlayersByStartCorner } from './playerAssignments.js';
describe('Asignación de combate de un solo jugador', () => {
  it('reserva el segundo lado para la IA', () => { expect(getPlayersByStartCorner()).toEqual(['J1', 'IA']); });
  it('duplica la selección humana para el rival IA por defecto', () => { const selection = { id: 'white', gender: 'male' }; expect(getCharacterSelectionsByCorner(selection)).toEqual([selection, selection]); });
  it('rechaza una selección ausente', () => { expect(() => getCharacterSelectionsByCorner(null)).toThrow(/El jugador debe elegir un Axem disponible/); });
});
