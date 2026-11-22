import { describe, expect, it, vi } from 'vitest';
import { FighterAnimator } from './FighterAnimator.js';

function createAnimator(rangerId = 'orange', gender = 'male') {
  const sprite = {
    play: vi.fn(),
    stop: vi.fn(),
    setTexture: vi.fn(),
    setOrigin: vi.fn(),
  };
  const animator = new FighterAnimator(
    sprite,
    rangerId,
    gender,
    'ranger-' + gender + '-' + rangerId,
    { exists: vi.fn(() => true) },
  );
  return { animator, sprite };
}

const fighter = (state, extra = {}) => ({
  state,
  stateTimeMs: 50,
  elapsedMs: 50,
  position: { z: 0 },
  powerUps: {},
  ...extra,
});

describe('FighterAnimator con ilustraciones Super Axem', () => {
  it('conserva la misma textura naranja durante los cambios de estado', () => {
    const { animator, sprite } = createAnimator();
    const states = ['idle', 'walk', 'dash', 'attack', 'special-attack', 'block', 'hurt', 'teleport', 'ko'];

    for (const state of states) animator.update(fighter(state));

    expect(sprite.setTexture).toHaveBeenCalledWith('ranger-male-orange');
    expect(sprite.setTexture).toHaveBeenCalledTimes(states.length);
    expect(sprite.play).not.toHaveBeenCalled();
    expect(sprite.setOrigin).toHaveBeenLastCalledWith(0.5, 1);
  });

  it('usa la ilustración rosa y poses procedurales en lugar de cambiar a hojas antiguas', () => {
    const { animator, sprite } = createAnimator('violet', 'female');
    const walk = animator.update(fighter('walk', { stateTimeMs: 50 }));
    const dash = animator.update(fighter('dash', { stateTimeMs: 120 }));
    const attack = animator.update(fighter('attack', { stateTimeMs: 180 }));

    expect(sprite.setTexture).toHaveBeenCalledWith('ranger-female-violet');
    expect(sprite.play).not.toHaveBeenCalled();
    expect(Math.abs(walk.x)).toBeGreaterThan(0);
    expect(Math.abs(walk.angle)).toBeLessThan(3);
    expect(dash.x).toBeGreaterThan(5);
    expect(dash.angle).toBeGreaterThan(12);
    expect(attack.angle).not.toBe(0);
  });

  it('conserva la pose procedural de KO para ambos personajes', () => {
    for (const [id, gender] of [['orange', 'male'], ['violet', 'female']]) {
      const { animator, sprite } = createAnimator(id, gender);
      const pose = animator.update(fighter('ko', { stateTimeMs: 200 }));
      expect(sprite.setTexture).toHaveBeenCalledWith('ranger-' + gender + '-' + id);
      expect(pose.angle).toBeLessThan(0);
    }
  });

  it('fuerza y libera la pose de victoria sin cambiar el arte Super Axem', () => {
    const { animator, sprite } = createAnimator();
    animator.update(fighter('idle'));
    animator.showVictory();
    const victory = animator.update(fighter('idle', { elapsedMs: 120 }));
    expect(victory.y).toBeLessThan(0);
    expect(sprite.setTexture).toHaveBeenLastCalledWith('ranger-male-orange');

    animator.clearForcedState();
    animator.update(fighter('idle'));
    expect(sprite.setTexture).toHaveBeenLastCalledWith('ranger-male-orange');
  });
});
