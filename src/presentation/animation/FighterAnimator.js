import { animationKey } from '../../infrastructure/assets/characterAnimationData.js';
import { flashOnlyPose, poseFor } from './proceduralPoses.js';

/**
 * Decide cómo se anima un personaje en cada estado:
 *  - si existe la hoja de sprites de ese estado, la reproduce;
 *  - si no, usa la pose actual con una animación por código.
 */
export class FighterAnimator {
  /**
   * @param {Phaser.GameObjects.Sprite} sprite
   * @param {string} rangerId
   * @param {string} fallbackTexture
   * @param {Phaser.Animations.AnimationManager} anims
   */
  constructor(sprite, rangerId, fallbackTexture, anims) {
    this.sprite = sprite;
    this.rangerId = rangerId;
    this.fallbackTexture = fallbackTexture;
    this.anims = anims;
    this.state = null;
    this.usingSheet = false;
  }

  /** @param {import('../../domain/entities/Fighter.js').Fighter} fighter */
  update(fighter) {
    if (fighter.state !== this.state) this.#enter(fighter.state);
    return this.usingSheet
      ? flashOnlyPose(fighter.state, fighter.stateTimeMs)
      : poseFor(fighter.state, fighter.stateTimeMs, fighter.elapsedMs);
  }

  #enter(state) {
    this.state = state;
    const key = animationKey(this.rangerId, state);
    if (this.anims.exists(key)) {
      this.sprite.play(key);
      this.usingSheet = true;
    } else {
      this.sprite.stop();
      this.sprite.setTexture(this.fallbackTexture);
      this.usingSheet = false;
    }
  }
}
