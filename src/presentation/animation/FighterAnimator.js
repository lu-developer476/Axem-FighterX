import { spriteFacingFor } from '../../infrastructure/assets/characterAnimationData.js';
import { poseFor } from './proceduralPoses.js';

/**
 * Mantiene el arte Super Axem durante todo el combate.
 * Los estados se expresan mediante poses procedurales para no alternar con
 * hojas antiguas que mostrarían una versión visual distinta del personaje.
 */
export class FighterAnimator {
  constructor(sprite, rangerId, gender, fallbackTexture, _anims) {
    this.sprite = sprite;
    this.rangerId = rangerId;
    this.gender = gender;
    this.fallbackTexture = fallbackTexture;
    this.state = null;
    this.forcedState = null;
  }

  get spriteFacing() {
    return spriteFacingFor(this.rangerId, this.gender);
  }

  update(fighter) {
    const visualState = this.forcedState ?? fighter.state;
    if (visualState !== this.state) this.#enter(visualState);
    return poseFor(
      visualState,
      this.forcedState ? fighter.elapsedMs : fighter.stateTimeMs,
      fighter.elapsedMs,
    );
  }

  showVictory() {
    this.forcedState = 'victory';
    this.#enter('victory');
  }

  clearForcedState() {
    if (!this.forcedState) return;
    this.forcedState = null;
    this.state = null;
    this.sprite.stop();
  }

  #enter(state) {
    this.state = state;
    this.sprite.stop();
    this.sprite.setTexture(this.fallbackTexture);
    this.sprite.setOrigin?.(0.5, 1);
  }
}
