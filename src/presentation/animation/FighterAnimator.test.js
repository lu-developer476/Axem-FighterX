import { describe, expect, it, vi } from 'vitest';
import { FighterAnimator } from './FighterAnimator.js';

function createAnimator(rangerId = 'orange', gender = 'male', animsExist = false) {
  const sprite = {
    play: vi.fn(),
    stop: vi.fn(),
    setTexture: vi.fn(),
    setOrigin: vi.fn(),
  };
  const anims = { exists: vi.fn(() => animsExist) };
  const animator = new FighterAnimator(
    sprite,
    rangerId,
    gender,
    'ranger-' + gender + '-' + rangerId,
    anims,
  );
  return { animator, sprite };
}

describe('FighterAnimator', () => {
  it('muestra la pose derrotada del Axem Naranja masculino en KO', () => {
    const { animator, sprite } = createAnimator();
    const pose = animator.update({
      state: 'ko',
      stateTimeMs: 120,
      elapsedMs: 120,
      position: { z: 0 },
    });

    expect(sprite.stop).toHaveBeenCalledOnce();
    expect(sprite.setTexture).toHaveBeenCalledWith('axem-orange-defeated');
    expect(sprite.play).not.toHaveBeenCalled();
    expect(pose.angle).toBe(0);
    expect(pose.x).toBe(0);
    expect(pose.y).toBe(0);
    expect(pose.flash).toBe(false);
  });

  it('conserva la rotación procedural de KO para personajes sin pose masculina', () => {
    const { animator, sprite } = createAnimator('violet', 'female');
    const pose = animator.update({
      state: 'ko',
      stateTimeMs: 200,
      elapsedMs: 200,
      position: { z: 0 },
    });

    expect(sprite.setTexture).toHaveBeenCalledWith('ranger-female-violet');
    expect(pose.angle).toBeLessThan(0);
  });

  const fighter = (state, extra = {}) => ({
    state,
    stateTimeMs: 50,
    elapsedMs: 50,
    position: { z: 0 },
    powerUps: {},
    ...extra,
  });

  it('usa la hoja de idle del GIF en reposo, con el origen de las hojas GIF', () => {
    const { animator, sprite } = createAnimator('orange', 'male', true);
    animator.update(fighter('idle'));
    expect(sprite.play).toHaveBeenCalledWith('axem-orange-idle');
    expect(sprite.setOrigin.mock.calls.at(-1)[1]).toBeGreaterThan(1);
  });

  it('mantiene las hojas de correr y de doble hacha con origen en el borde inferior', () => {
    const { animator, sprite } = createAnimator('orange', 'male', true);
    animator.update(fighter('walk'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-run');
    expect(sprite.setOrigin).toHaveBeenLastCalledWith(0.5, 1);
    animator.update(fighter('attack', { position: { z: 12 } }));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-double-axe');
  });

  it('alterna los tres golpes en el suelo y usa jump, dash, teleport, daño y carga', () => {
    const { animator, sprite } = createAnimator('orange', 'male', true);
    const played = [];
    for (const state of ['attack', 'idle', 'attack', 'idle', 'attack']) {
      animator.update(fighter(state));
      played.push(sprite.play.mock.calls.at(-1)[0]);
    }
    expect(played.filter((key) => key.includes('punch'))).toEqual([
      'axem-orange-punch-01', 'axem-orange-punch-02', 'axem-orange-punch-03',
    ]);

    animator.update(fighter('idle', { position: { z: 20 } }));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-jump');
    animator.update(fighter('dash'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-dash');
    animator.update(fighter('teleport'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-teleport');
    animator.update(fighter('hurt'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-hurt-combo');
    animator.update(fighter('block'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-guard');
    animator.update(fighter('block-hit'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-guard-hit');
    animator.update(fighter('dodge'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-roll');
    animator.update(fighter('land'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-land');
    animator.update(fighter('special-attack'));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-special-attack');
    animator.update(fighter('idle', { powerUps: { fury: 3000 } }));
    expect(sprite.play).toHaveBeenLastCalledWith('axem-orange-charge');
  });
});
