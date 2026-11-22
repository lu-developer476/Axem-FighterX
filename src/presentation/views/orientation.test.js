import { describe, it, expect } from 'vitest';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { spriteFacingFor } from '../../infrastructure/assets/characterAnimationData.js';
import { FighterAnimator } from '../animation/FighterAnimator.js';
import { shouldFlip } from './orientation.js';

describe('orientación de los Axem Rangers Super', () => {
  it('declara orientación nativa hacia la derecha para las dos ilustraciones', () => {
    for (const rangerId of [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE]) {
      expect(spriteFacingFor(rangerId, 'male')).toBe(1);
      expect(spriteFacingFor(rangerId, 'female')).toBe(1);
    }
  });

  it('hace que ambos personajes miren hacia el rival en cualquiera de las esquinas', () => {
    for (const rangerId of [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE]) {
      for (const gender of ['male', 'female']) {
        const originalDirection = spriteFacingFor(rangerId, gender);
        expect(shouldFlip(1, originalDirection)).toBe(false);
        expect(shouldFlip(-1, originalDirection)).toBe(true);
      }
    }
  });

  it('mantiene la orientación del arte Super Axem en los dos animadores', () => {
    const orange = new FighterAnimator({}, RANGER_IDS.ORANGE, 'male', 'orange-super', {});
    const violet = new FighterAnimator({}, RANGER_IDS.VIOLET, 'female', 'violet-super', {});
    expect(orange.spriteFacing).toBe(1);
    expect(violet.spriteFacing).toBe(1);
  });

  it('invierte la regla cuando el arte original mira hacia la derecha', () => {
    expect(shouldFlip(1, 1)).toBe(false);
    expect(shouldFlip(-1, 1)).toBe(true);
  });
});
