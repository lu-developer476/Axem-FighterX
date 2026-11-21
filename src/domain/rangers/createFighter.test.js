import { describe, expect, it } from 'vitest';
import { RANGER_IDS } from './rangerCatalog.js';
import { createFighter } from './createFighter.js';
import { createDefaultMatch } from '../../application/useCases/CreateMatch.js';
import { ARENA } from '../arena/arena.js';

describe('Variantes de género de los Axem Rangers', () => {
  it('conserva el género seleccionado sin alterar la identidad cromática', () => {
    const femaleViolet = createFighter(
      RANGER_IDS.VIOLET,
      { x: 120, y: 180 },
      1,
      'female',
    );

    expect(femaleViolet.id).toBe(RANGER_IDS.VIOLET);
    expect(femaleViolet.gender).toBe('female');
    expect(femaleViolet.name).toBe('Axem Violet');
  });

  it('usa la única variante disponible como valor predeterminado para cada Axem', () => {
    const maleOrange = createFighter(
      RANGER_IDS.ORANGE,
      { x: 360, y: 180 },
      -1,
    );

    expect(maleOrange.gender).toBe('male');
    expect(createFighter(RANGER_IDS.VIOLET, { x: 120, y: 180 }).gender).toBe('female');
  });

  it('transporta géneros independientes en la creación del combate', () => {
    const match = createDefaultMatch(() => 0, [
      { id: RANGER_IDS.VIOLET, gender: 'female' },
      { id: RANGER_IDS.ORANGE, gender: 'male' },
    ]);

    expect(match.fighters.map((fighter) => fighter.gender)).toEqual(['female', 'male']);
  });

  it('ubica ambos luchadores sobre la coordenada compartida del suelo sin asignar personajes por defecto', () => {
    const match = createDefaultMatch(() => 0, [
      { id: RANGER_IDS.VIOLET, gender: 'female' },
      { id: RANGER_IDS.ORANGE, gender: 'male' },
    ]);

    expect(match.fighters.map((fighter) => fighter.position.y)).toEqual([
      ARENA.groundY,
      ARENA.groundY,
    ]);
    expect(ARENA.minY).toBeLessThan(ARENA.groundY);
    expect(ARENA.maxY).toBe(ARENA.groundY);
  });


  it('rechaza las dos variantes retiradas del catálogo', () => {
    expect(() => createFighter(RANGER_IDS.ORANGE, { x: 120, y: 180 }, 1, 'female'))
      .toThrow('Variante de Axem no disponible');
    expect(() => createFighter(RANGER_IDS.VIOLET, { x: 120, y: 180 }, 1, 'male'))
      .toThrow('Variante de Axem no disponible');
  });

  it('rechaza valores de género no registrados', () => {
    expect(() => createFighter(
      RANGER_IDS.VIOLET,
      { x: 120, y: 180 },
      1,
      'unknown',
    )).toThrow('Género de Axem Ranger desconocido');
  });
});
