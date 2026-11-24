import { describe, expect, it, vi } from 'vitest';
import { FighterAnimator } from './FighterAnimator.js';

function createAnimator() {
  const sprite = { play: vi.fn(), stop: vi.fn(), setTexture: vi.fn(), setOrigin: vi.fn() };
  const animations = { exists: vi.fn(() => true) };
  return { animator: new FighterAnimator(sprite, 'orange', 'male', 'ranger-male-orange', animations), sprite, animations };
}
const fighter = (state, extra = {}) => ({ state, stateTimeMs: 50, elapsedMs: 50, position: { z: 0 }, powerUps: {}, ...extra });

describe('FighterAnimator con secuencias de Axem Red recoloreadas', () => {
  it('reproduce las tiras de sprites asociadas a los estados', () => {
    const { animator, sprite } = createAnimator();
    const states = [
      ['idle', 'axem-orange-idle'], ['walk', 'axem-orange-run'], ['dash', 'axem-orange-dash'],
      ['attack', 'axem-orange-attack'], ['special-attack', 'axem-orange-charge'],
      ['block', 'axem-orange-guard'], ['hurt', 'axem-orange-hurt-combo'],
      ['teleport', 'axem-orange-teleport'], ['ko', 'axem-orange-ko'],
    ];
    animator.update(fighter('walk'));
    expect(sprite.setOrigin).toHaveBeenLastCalledWith(0.5, 1);
    // La llamada inicial comprueba la orientación vertical del estado walk;
    // la secuencia de estados se verifica desde un registro limpio.
    sprite.play.mockClear();
    for (const [state] of states) animator.update(fighter(state));
    expect(sprite.play.mock.calls.map(([key]) => key)).toEqual(states.map(([, key]) => key));
    expect(sprite.setTexture).toHaveBeenCalledWith('ranger-male-orange');
    expect(sprite.setOrigin).toHaveBeenLastCalledWith(0.5, expect.any(Number));
  });
  it('no reproduce animaciones no cargadas', () => {
    const { animator, sprite, animations } = createAnimator();
    animations.exists.mockReturnValue(false);
    animator.update(fighter('idle'));
    expect(sprite.play).not.toHaveBeenCalled();
  });
  it('fuerza la animación de victoria y vuelve al reposo', () => {
    const { animator, sprite } = createAnimator();
    animator.update(fighter('idle'));
    animator.showVictory();
    animator.update(fighter('idle', { elapsedMs: 120 }));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-victory', true);
    animator.clearForcedState();
    animator.update(fighter('idle'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-idle', true);
  });
});
