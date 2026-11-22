import { describe, expect, it } from 'vitest';
import { RANGER_IDS } from './rangerCatalog.js';
import { createFighter } from './createFighter.js';
import { createDefaultMatch } from '../../application/useCases/CreateMatch.js';
import { ARENA } from '../arena/arena.js';

describe('Identidad canónica de los Axem Rangers', () => {
  it('asigna automáticamente a Violet su género femenino canónico', () => {
    const femaleViolet = createFighter(
      RANGER_IDS.VIOLET,
      { x: 120, y: 180 },
      1,
    );

    expect(femaleViolet.id).toBe(RANGER_IDS.VIOLET);
    expect(femaleViolet.gender).toBe('female');
    expect(femaleViolet.name).toBe('Axem Violet');
  });

  it('elige la variante masculina de Naranja por defecto', () => {
    const maleOrange = createFighter(
      RANGER_IDS.ORANGE,
      { x: 360, y: 180 },
      -1,
    );

    expect(maleOrange.gender).toBe('male');
  });

  it('mantiene el género canónico de cada Ranger en la creación del combate', () => {
    const match = createDefaultMatch(() => 0, [
      { id: RANGER_IDS.VIOLET, gender: 'female' },
      { id: RANGER_IDS.ORANGE, gender: 'male' },
    ]);

    expect(match.fighters.map((fighter) => fighter.gender)).toEqual(['female', 'male']);
  });

  it('ubica ambos luchadores sobre la coordenada compartida del suelo', () => {
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


  it('rechaza cualquier intento de cambiar el género canónico del Ranger', () => {
    expect(() => createFighter(RANGER_IDS.ORANGE, { x: 120, y: 180 }, 1, 'female'))
      .toThrow('Variante de Axem no disponible');
    expect(() => createFighter(RANGER_IDS.VIOLET, { x: 360, y: 180 }, -1, 'male'))
      .toThrow('Variante de Axem no disponible');
  });
});
