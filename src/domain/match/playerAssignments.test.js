import { describe, expect, it } from 'vitest';
import { getCharacterSelectionsByCorner, getPlayersByStartCorner } from './playerAssignments.js';

describe('Asignaciones independientes de J1 y J2', () => {
  const selections = {
    J1: { id: 'orange' },
    J2: { id: 'orange' },
  };

  it('mantiene J1 a la izquierda y J2 a la derecha cuando así lo eligen', () => {
    expect(getPlayersByStartCorner({ J1: 'left', J2: 'right' })).toEqual(['J1', 'J2']);
    expect(getCharacterSelectionsByCorner(selections, { J1: 'left', J2: 'right' }))
      .toEqual([{ id: 'orange', gender: 'male' }, { id: 'orange', gender: 'male' }]);
  });

  it('invierte únicamente el orden espacial cuando J1 elige la derecha', () => {
    expect(getPlayersByStartCorner({ J1: 'right', J2: 'left' })).toEqual(['J2', 'J1']);
    expect(getCharacterSelectionsByCorner(selections, { J1: 'right', J2: 'left' }))
      .toEqual([{ id: 'orange', gender: 'male' }, { id: 'orange', gender: 'male' }]);
  });

  it('permite combates espejo y conserva la identidad de cada jugador', () => {
    expect(getCharacterSelectionsByCorner(selections, { J1: 'right', J2: 'left' }))
      .toEqual([{ id: 'orange', gender: 'male' }, { id: 'orange', gender: 'male' }]);
  });

  it('rechaza personajes sin variante disponible', () => {
    expect(() => getCharacterSelectionsByCorner({
      J1: { id: 'violet' }, J2: { id: 'orange' },
    }, { J1: 'left', J2: 'right' })).toThrow(/J1 debe elegir un Axem disponible/);
  });

  it('rechaza esquinas ausentes, repetidas o inválidas', () => {
    expect(() => getPlayersByStartCorner(null)).toThrow(/esquinas opuestas/);
    expect(() => getPlayersByStartCorner({ J1: 'left', J2: 'left' })).toThrow(/esquinas opuestas/);
    expect(() => getPlayersByStartCorner({ J1: 'center', J2: 'right' })).toThrow(/esquinas opuestas/);
  });

  it('no asigna Axem automáticamente si falta una elección', () => {
    expect(() => getCharacterSelectionsByCorner(
      { J1: selections.J1, J2: null }, { J1: 'left', J2: 'right' },
    )).toThrow(/J2 debe elegir un Axem disponible/);
  });
});
