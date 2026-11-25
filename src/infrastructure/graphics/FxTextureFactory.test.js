import { describe, expect, it } from 'vitest';
import { FX, FX_PARTICLES, fxAnimKey, fxFrameKey } from './FxTextureFactory.js';

describe('Biblioteca de efectos de combate', () => {
  it('registra las secuencias visuales adicionales', () => {
    for (const name of ['dashTrail', 'landing', 'electric', 'burst', 'smoke']) {
      expect(FX[name].frames).toBeGreaterThanOrEqual(5);
      expect(FX[name].frameRate).toBeGreaterThan(0);
      expect(fxAnimKey(name)).toBe('fx-' + name);
      expect(fxFrameKey(name, FX[name].frames - 1)).toBe('fx-' + name + '-' + (FX[name].frames - 1));
    }
  });
  it('incluye partículas ambientales específicas', () => {
    expect(FX_PARTICLES).toMatchObject({ pixel:'fx-px', ember:'fx-ember', leaf:'fx-leaf', rubble:'fx-rubble', star:'fx-star' });
    for (const icon of ['heart', 'sword', 'shield', 'boot']) {
      expect(FX_PARTICLES).not.toHaveProperty(icon);
    }
  });
});
