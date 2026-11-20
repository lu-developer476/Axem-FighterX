import { describe, expect, it, vi } from 'vitest';
import { FighterAnimator } from './FighterAnimator.js';

function createAnimator(rangerId = 'orange', gender = 'male') {
  const sprite = {
    play: vi.fn(),
    stop: vi.fn(),
    setTexture: vi.fn(),
  };
  const anims = { exists: vi.fn(() => false) };
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
    const { animator, sprite } = createAnimator('orange', 'female');
    const pose = animator.update({
      state: 'ko',
      stateTimeMs: 200,
      elapsedMs: 200,
      position: { z: 0 },
    });

    expect(sprite.setTexture).toHaveBeenCalledWith('ranger-female-orange');
    expect(pose.angle).toBeLessThan(0);
  });
});
