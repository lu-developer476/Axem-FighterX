import { describe, expect, it } from 'vitest';
import { RANGER_IDS, rangerCatalog } from './rangerCatalog.js';

describe('catálogo de Axem Rangers X', () => {
  it('diferencia los personajes solo por identidad y paleta, no por atributos de combate', () => {
    expect(rangerCatalog[RANGER_IDS.VIOLET].stats)
      .toBe(rangerCatalog[RANGER_IDS.ORANGE].stats);
    expect(rangerCatalog[RANGER_IDS.VIOLET].stats)
      .toEqual(rangerCatalog[RANGER_IDS.ORANGE].stats);
  });
});
