import { spriteFacingFor } from '../../infrastructure/assets/characterAnimationData.js';
import { maleAnimationKey } from '../../infrastructure/assets/assetManifest.js';
import { flashOnlyPose } from './proceduralPoses.js';

const ACTION_BY_STATE = Object.freeze({
  idle: 'idle',
  walk: 'run',
  dash: 'dash',
  dodge: 'roll',
  block: 'guard',
  'block-hit': 'hurt-combo',
  attack: 'attack',
  'special-attack': 'charge',
  hurt: 'hurt-combo',
  land: 'jump',
  teleport: 'teleport',
  victory: 'victory',
  ko: 'ko',
});

/** Reproduce las animaciones que tienen hojas PNG fuente versionadas; el resto usa el artwork estático. */
export class FighterAnimator {
  constructor(sprite, rangerId, gender, fallbackTexture, animations) {
    this.sprite = sprite;
    this.rangerId = rangerId;
    this.gender = gender;
    this.fallbackTexture = fallbackTexture;
    this.animations = animations;
    this.state = null;
    this.forcedState = null;
  }

  get spriteFacing() {
    return spriteFacingFor(this.rangerId, this.gender);
  }

  update(fighter) {
    const visualState = this.forcedState ?? fighter.state;
    if (visualState !== this.state) this.#enter(visualState);
    return flashOnlyPose(visualState, this.forcedState ? fighter.elapsedMs : fighter.stateTimeMs);
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
    this.sprite.setOrigin(0.5, 1);
    const action = ACTION_BY_STATE[state];
    if (!action) return;
    const key = maleAnimationKey(this.rangerId, action);
    if (!this.animations?.exists?.(key)) return;
    this.sprite.play(key, true);
  }
}
