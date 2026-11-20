import { describe, it, expect } from 'vitest';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { spriteFacingFor } from '../../infrastructure/assets/characterAnimationData.js';
import { shouldFlip } from './orientation.js';

describe('orientación de los Axem Rangers', () => {
  it('declara la dirección original de las cuatro variantes', () => {
    for (const rangerId of [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE]) {
      expect(spriteFacingFor(rangerId, 'male')).toBe(-1);
      expect(spriteFacingFor(rangerId, 'female')).toBe(-1);
    }
  });

  it('el personaje mira hacia donde se mueve, sin importar su variante', () => {
    for (const gender of ['male', 'female']) {
      const originalDirection = spriteFacingFor(RANGER_IDS.VIOLET, gender);
      expect(shouldFlip(-1, originalDirection)).toBe(false);
      expect(shouldFlip(1, originalDirection)).toBe(true);
    }
  });

  it('invierte la regla cuando el arte original mira hacia la derecha', () => {
    expect(shouldFlip(1, 1)).toBe(false);
    expect(shouldFlip(-1, 1)).toBe(true);
  });
});
