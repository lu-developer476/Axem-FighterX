import { describe, it, expect } from 'vitest';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { spriteFacingFor } from '../../infrastructure/assets/characterAnimationData.js';
import { FighterAnimator } from '../animation/FighterAnimator.js';
import { shouldFlip } from './orientation.js';

describe('orientación de los Axem Rangers', () => {
  it('declara la orientación nativa izquierda de las cuatro variantes', () => {
    for (const rangerId of [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE]) {
      expect(spriteFacingFor(rangerId, 'male')).toBe(-1);
      expect(spriteFacingFor(rangerId, 'female')).toBe(-1);
    }
  });

  it('el personaje mira hacia el rival en ambos lados con cada fuente', () => {
    for (const gender of ['male', 'female']) {
      const originalDirection = spriteFacingFor(RANGER_IDS.VIOLET, gender);
      // El luchador de la izquierda mira a la derecha y necesita espejar el arte nativo.
      expect(shouldFlip(1, originalDirection)).toBe(true);
      // El luchador de la derecha ya mira a la izquierda en la orientación nativa.
      expect(shouldFlip(-1, originalDirection)).toBe(false);
    }
  });

  it('mantiene la orientación de la fuente al alternar entre textura base y GIF de acción', () => {
    const animator = new FighterAnimator({}, RANGER_IDS.VIOLET, 'male', 'fallback', {});
    expect(animator.spriteFacing).toBe(-1);

    animator.usingSheet = true;
    expect(animator.spriteFacing).toBe(-1);

    const femaleAnimator = new FighterAnimator({}, RANGER_IDS.ORANGE, 'female', 'fallback', {});
    expect(femaleAnimator.spriteFacing).toBe(-1);

    femaleAnimator.usingSheet = true;
    expect(femaleAnimator.spriteFacing).toBe(-1);
  });

  it('invierte la regla cuando el arte original mira hacia la derecha', () => {
    expect(shouldFlip(1, 1)).toBe(false);
    expect(shouldFlip(-1, 1)).toBe(true);
  });
});
