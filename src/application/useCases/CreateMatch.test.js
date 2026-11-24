import { describe, expect, it } from 'vitest';
import { createDefaultMatch } from './CreateMatch.js';

describe('createDefaultMatch', () => {
  it('respeta la única variante disponible de Axem en ambos lados físicos', () => {
    const selection = { id: 'orange', gender: 'male' };
    const match = createDefaultMatch(Math.random, [selection, selection]);

    expect(match.fighters.map(({ id, gender }) => ({ id, gender }))).toEqual([
      { id: 'orange', gender: 'male' },
      { id: 'orange', gender: 'male' },
    ]);
  });

  it('asigna identidades de combate distintas aunque ambos elijan el mismo Axem', () => {
    const selection = { id: 'orange', gender: 'male' };
    const match = createDefaultMatch(() => 0.999, [selection, selection]);
    const [left, right] = match.fighters;

    expect(left.id).toBe('orange');
    expect(right.id).toBe('orange');
    expect(left.combatantId).not.toBe(right.combatantId);

    right.health = 1;
    right.takeHit({ damage: 1, fromDirection: 1 });
    const events = match.step([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    ], 16);

    expect(match.winnerId).toBe(left.combatantId);
    expect(events.find((event) => event.type === 'match-over')?.winnerId).toBe(left.combatantId);
  });

  it('rechaza personajes no disponibles y no asigna selecciones predeterminadas', () => {
    expect(() => createDefaultMatch()).toThrow(/dos selecciones explícitas/);
    expect(() => createDefaultMatch(Math.random, [{ id: 'orange', gender: 'male' }]))
      .toThrow(/dos selecciones explícitas/);
    expect(() => createDefaultMatch(Math.random, [
      { id: 'violet', gender: 'female' },
      { id: 'orange', gender: 'male' },
    ])).toThrow(/variante disponible de Axem seleccionada/);
    expect(() => createDefaultMatch(Math.random, [
      { id: 'orange', gender: 'female' },
      { id: 'orange', gender: 'male' },
    ])).toThrow(/variante disponible de Axem seleccionada/);
    expect(() => createDefaultMatch(Math.random, [
      { id: 'orange', gender: 'unknown' },
      { id: 'orange', gender: 'male' },
    ])).toThrow(/variante disponible de Axem seleccionada/);
  });
});
