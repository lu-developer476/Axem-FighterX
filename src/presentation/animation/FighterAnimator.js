import { animationKey } from '../../infrastructure/assets/characterAnimationData.js';
import { maleAnimationKey } from '../../infrastructure/assets/assetManifest.js';
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
  constructor(sprite, rangerId, gender, fallbackTexture, anims) {
    this.sprite = sprite;
    this.rangerId = rangerId;
    this.gender = gender;
    this.fallbackTexture = fallbackTexture;
    this.anims = anims;
    this.state = null;
    this.usingSheet = false;
  }

  /** @param {import('../../domain/entities/Fighter.js').Fighter} fighter */
  update(fighter) {
    const animationState = fighter.state === 'walk' && this.gender === 'male'
      ? 'walk'
      : fighter.state === 'attack' && this.gender === 'male' && fighter.position.z > 0
        ? 'air-attack'
        : fighter.state;
    if (animationState !== this.state) this.#enter(animationState);
    return this.usingSheet
      ? flashOnlyPose(fighter.state, fighter.stateTimeMs)
      : poseFor(fighter.state, fighter.stateTimeMs, fighter.elapsedMs);
  }

  #enter(state) {
    this.state = state;
    const maleAction = state === 'walk' ? 'run' : state === 'air-attack' ? 'double-axe' : null;
    const key = maleAction && this.gender === 'male'
      ? maleAnimationKey(this.rangerId, maleAction)
      : animationKey(this.rangerId, state);
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
