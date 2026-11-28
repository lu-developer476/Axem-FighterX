import { describe, expect, it } from 'vitest';
import { RANGER_IDS } from './rangerCatalog.js';
import { createFighter } from './createFighter.js';
import { createDefaultMatch } from '../../application/useCases/CreateMatch.js';
import { ARENA } from '../arena/arena.js';

describe('Identidad canónica de los Axem Rangers', () => {
  it('crea Axem Naranja masculino por defecto', () => {
    const fighter = createFighter(RANGER_IDS.ORANGE, { x: 120, y: 180 }, 1);
    expect(fighter.id).toBe(RANGER_IDS.ORANGE);
    expect(fighter.gender).toBe('male');
    expect(fighter.name).toBe('Axem Orange');
  });

  it('usa exclusivamente variantes Naranja para los dos combatientes', () => {
    const match = createDefaultMatch(() => 0, [
      { id: RANGER_IDS.ORANGE, gender: 'male' },
      { id: RANGER_IDS.ORANGE, gender: 'male' },
    ]);
    expect(match.fighters.map((fighter) => fighter.gender)).toEqual(['male', 'male']);
    expect(match.fighters.map((fighter) => fighter.id)).toEqual(['orange', 'orange']);
  });

  it('ubica ambos luchadores sobre la coordenada compartida del suelo', () => {
    const match = createDefaultMatch(() => 0, [
      { id: RANGER_IDS.ORANGE, gender: 'male' },
      { id: RANGER_IDS.ORANGE, gender: 'male' },
    ]);
    expect(match.fighters.map((fighter) => fighter.position.y)).toEqual([ARENA.groundY, ARENA.groundY]);
    expect(ARENA.minY).toBeLessThan(ARENA.groundY);
    expect(ARENA.maxY).toBe(ARENA.groundY);
  });

  it('rechaza variantes sin spritesheet canónica completa', () => {
    expect(() => createFighter(RANGER_IDS.ORANGE, { x: 120, y: 180 }, 1, 'female'))
      .toThrow('Variante de Axem no disponible');
    expect(() => createFighter(RANGER_IDS.VIOLET, { x: 360, y: 180 }, -1, 'female'))
      .toThrow('Variante de Axem no disponible');
  });
});
