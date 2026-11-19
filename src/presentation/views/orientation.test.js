import { describe, it, expect } from 'vitest';
import { shouldFlip } from './orientation.js';
import { characterAnimationData } from '../../infrastructure/assets/characterAnimationData.js';

describe('orientación del sprite', () => {
  it('el arte actual de los rangers mira a la izquierda', () => {
    expect(characterAnimationData.violet.spriteFacing).toBe(-1);
    expect(characterAnimationData.orange.spriteFacing).toBe(-1);
  });

  it('al moverse a la izquierda no se espeja; a la derecha sí', () => {
    const art = characterAnimationData.violet.spriteFacing;
    expect(shouldFlip(-1, art)).toBe(false);
    expect(shouldFlip(1, art)).toBe(true);
  });

  it('con arte que mira a la derecha ocurre lo contrario', () => {
    expect(shouldFlip(1, 1)).toBe(false);
    expect(shouldFlip(-1, 1)).toBe(true);
  });
});
