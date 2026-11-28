import { describe, it, expect } from 'vitest';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { spriteFacingFor } from '../../infrastructure/assets/characterAnimationData.js';
import { FighterAnimator } from '../animation/FighterAnimator.js';
import { shouldFlip } from './orientation.js';

describe('orientación de los Axem Rangers disponibles', () => {
  it('declara la orientación nativa hacia la derecha de Axem Naranja masculino', () => {
    expect(spriteFacingFor(RANGER_IDS.ORANGE, 'male')).toBe(1);
  });

  it('hace que Axem Naranja mire hacia el rival en cualquiera de las esquinas', () => {
    const originalDirection = spriteFacingFor(RANGER_IDS.ORANGE, 'male');
    expect(shouldFlip(1, originalDirection)).toBe(false);
    expect(shouldFlip(-1, originalDirection)).toBe(true);
  });

  it('mantiene la orientación nativa del arte en el animador disponible', () => {
    const orange = new FighterAnimator({}, RANGER_IDS.ORANGE, 'male', 'orange-super', {});
    expect(orange.spriteFacing).toBe(1);
  });

  it('invierte la regla cuando el arte original mira hacia la derecha', () => {
    expect(shouldFlip(1, 1)).toBe(false);
    expect(shouldFlip(-1, 1)).toBe(true);
  });
});
