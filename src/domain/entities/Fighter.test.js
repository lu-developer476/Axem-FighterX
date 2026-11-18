import { describe, it, expect } from 'vitest';
import { createFighter } from '../rangers/createFighter.js';
import { UpdateFighter } from '../../application/useCases/UpdateFighter.js';

describe('Fighter', () => {
  it('se mueve según la velocidad del ranger', () => {
    const fighter = createFighter('violet', { x: 100, y: 200 });
    fighter.move({ x: 1, y: 0 }, 1000);
    expect(fighter.position.x).toBeCloseTo(100 + fighter.stats.moveSpeed);
    expect(fighter.facing).toBe(1);
  });

  it('cambia de orientación al ir a la izquierda', () => {
    const fighter = createFighter('orange', { x: 100, y: 200 });
    fighter.move({ x: -1, y: 0 }, 16);
    expect(fighter.facing).toBe(-1);
  });

  it('la levitación oscila dentro de su amplitud', () => {
    const fighter = createFighter('violet', { x: 0, y: 0 });
    for (let i = 0; i < 200; i++) {
      fighter.move({ x: 0, y: 0 }, 16);
      expect(Math.abs(fighter.hoverOffset)).toBeLessThanOrEqual(fighter.stats.hoverAmplitude);
    }
  });

  it('createFighter rechaza rangers desconocidos', () => {
    expect(() => createFighter('nope', { x: 0, y: 0 })).toThrow();
  });
});

describe('UpdateFighter', () => {
  it('limita al luchador a los bordes del escenario', () => {
    const useCase = new UpdateFighter({ minX: 0, maxX: 50, minY: 0, maxY: 50 });
    const fighter = createFighter('violet', { x: 49, y: 10 });
    useCase.execute(fighter, { readMoveIntent: () => ({ x: 1, y: 0 }) }, 5000);
    expect(fighter.position.x).toBe(50);
  });
});
