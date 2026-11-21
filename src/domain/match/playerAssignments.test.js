import { describe, expect, it } from 'vitest';
import {
  getCharacterSelectionsByCorner,
  getPlayersByStartCorner,
} from './playerAssignments.js';

describe('Asignaciones independientes de J1 y J2', () => {
  const selections = {
    J1: { id: 'violet', gender: 'female' },
    J2: { id: 'orange', gender: 'male' },
  };

  it('mantiene J1 a la izquierda y J2 a la derecha cuando así lo eligen', () => {
    expect(getPlayersByStartCorner({ J1: 'left', J2: 'right' })).toEqual(['J1', 'J2']);
    expect(getCharacterSelectionsByCorner(selections, { J1: 'left', J2: 'right' }))
      .toEqual([selections.J1, selections.J2]);
  });

  it('invierte únicamente el orden espacial cuando J1 elige la derecha', () => {
    expect(getPlayersByStartCorner({ J1: 'right', J2: 'left' })).toEqual(['J2', 'J1']);
    expect(getCharacterSelectionsByCorner(selections, { J1: 'right', J2: 'left' }))
      .toEqual([selections.J2, selections.J1]);
  });

  it('permite que ambos jugadores elijan el mismo Axem y géneros distintos', () => {
    const sameAxem = {
      J1: { id: 'orange', gender: 'female' },
      J2: { id: 'orange', gender: 'male' },
    };
    expect(getCharacterSelectionsByCorner(sameAxem, { J1: 'right', J2: 'left' }))
      .toEqual([sameAxem.J2, sameAxem.J1]);
  });

  it('rechaza esquinas ausentes, repetidas o inválidas', () => {
    expect(() => getPlayersByStartCorner(null)).toThrow(/esquinas opuestas/);
    expect(() => getPlayersByStartCorner({ J1: 'left', J2: 'left' })).toThrow(/esquinas opuestas/);
    expect(() => getPlayersByStartCorner({ J1: 'center', J2: 'right' })).toThrow(/esquinas opuestas/);
  });

  it('no asigna Axem ni género automáticamente si falta una elección', () => {
    expect(() => getCharacterSelectionsByCorner(
      { J1: selections.J1, J2: null },
      { J1: 'left', J2: 'right' },
    )).toThrow(/J2 debe elegir explícitamente/);
    expect(() => getCharacterSelectionsByCorner(
      { J1: { id: 'violet' }, J2: selections.J2 },
      { J1: 'left', J2: 'right' },
    )).toThrow(/J1 debe elegir explícitamente/);
  });
});
