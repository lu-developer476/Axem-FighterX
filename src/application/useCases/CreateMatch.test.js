import { describe, expect, it } from 'vitest';
import { createDefaultMatch } from './CreateMatch.js';

describe('createDefaultMatch', () => {
  it('respeta las elecciones explícitas de Axem y género en ambos lados físicos', () => {
    const match = createDefaultMatch(Math.random, [
      { id: 'orange', gender: 'male' },
      { id: 'violet', gender: 'female' },
    ]);

    expect(match.fighters.map(({ id, gender }) => ({ id, gender }))).toEqual([
      { id: 'orange', gender: 'male' },
      { id: 'violet', gender: 'female' },
    ]);
  });

  it('no asigna colores ni géneros predeterminados cuando faltan selecciones', () => {
    expect(() => createDefaultMatch()).toThrow(/dos selecciones explícitas/);
    expect(() => createDefaultMatch(Math.random, [{ id: 'violet', gender: 'male' }]))
      .toThrow(/dos selecciones explícitas/);
    expect(() => createDefaultMatch(Math.random, [
      { id: 'violet' },
      { id: 'orange', gender: 'female' },
    ])).toThrow(/género seleccionados/);
  });
});
