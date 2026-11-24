import { spriteFacingFor, GIF_ORIGIN_Y } from '../../infrastructure/assets/characterAnimationData.js';
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

/** Reproduce las secuencias cuadro a cuadro derivadas de los GIF originales de Axem Red. */
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
    const action = ACTION_BY_STATE[state];
    if (!action) return;
    const originY = action === 'run' ? 1 : GIF_ORIGIN_Y;
    this.sprite.setOrigin?.(0.5, originY);
    const key = maleAnimationKey(this.rangerId, action);
    if (this.animations?.exists?.(key)) this.sprite.play(key, true);
  }
}
