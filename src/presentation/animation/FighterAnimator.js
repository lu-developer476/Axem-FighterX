import { spriteFacingFor } from '../../infrastructure/assets/characterAnimationData.js';
import { maleAnimationKey, spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';
import { fighterGifFor, resultGifFor } from '../../infrastructure/assets/combatGifManifest.js';
import { GifOverlay } from '../views/GifOverlay.js';
import { flashOnlyPose } from './proceduralPoses.js';

const LEGACY_ACTION_BY_STATE = Object.freeze({
  idle: 'idle',
  walk: 'run',
  dash: 'dash',
  dodge: 'roll',
  block: 'guard',
  'block-hit': 'hurt-combo',
  attack: 'attack',
  'special-attack': 'charge',
  'charge-ki': 'charge',
  hurt: 'hurt-combo',
  land: 'jump',
  teleport: 'teleport',
  victory: 'victory',
  defeated: 'ko',
  ko: 'ko',
});

function actionFor(state, fighter) {
  if (state === 'victory') return 'victory';
  if (state === 'defeated') return 'defeated';
  if (state === 'recovery') return 'hurt';
  if (state === 'idle' || state === 'walk') {
    return fighter.isLevitating || (fighter.position.z ?? 0) > 0 ? 'levitate' : state === 'idle' ? 'idle' : 'run';
  }
  if (state === 'attack') return 'attack-' + String(fighter.attackComboIndex || 1).padStart(2, '0');
  if (state === 'hurt') return fighter.isInHitCombo && fighter.stateTimeMs >= 110 ? 'hurt' : 'hit';
  if (state === 'block-hit') return 'hit';
  if (state === 'charge-ki') return 'charge';
  return ({
    dash: 'dash',
    dodge: 'dodge',
    block: 'block',
    'special-attack': fighter.id === 'orange' ? 'charge' : 'special-attack',
    land: 'idle',
    teleport: 'teleport',
    ko: 'hurt',
  })[state] ?? 'idle';
}

/** Selecciona GIFs auténticos de cada Axem y conserva el sprite como fallback. */
export class FighterAnimator {
  constructor(sprite, rangerId, gender, fallbackTexture, animations, scene = null) {
    this.sprite = sprite;
    this.rangerId = rangerId;
    this.gender = gender;
    this.fallbackTexture = fallbackTexture;
    this.animations = animations;
    this.scene = scene ?? sprite.scene ?? null;
    this.overlay = this.scene ? new GifOverlay(this.scene, { width: 150, height: 100, depth: 101 }) : null;
    this.state = null;
    this.forcedState = null;
    this.lastFighter = null;
    this.currentGif = null;
  }

  get spriteFacing() {
    return spriteFacingFor(this.rangerId, this.gender);
  }

  update(fighter) {
    this.lastFighter = fighter;
    const visualState = this.forcedState ?? fighter.state;
    const action = actionFor(visualState, fighter);
    const signature = [visualState, action, fighter.transformed ? 'super' : 'base', fighter.attackComboIndex, fighter.stateTimeMs < 110 ? 'early' : 'late'].join(':');
    if (signature !== this.state) this.#enter(visualState, fighter, action);
    return flashOnlyPose(visualState, this.forcedState ? fighter.elapsedMs : fighter.stateTimeMs);
  }

  syncGif({ x, y, scale, alpha, flipX, depth, visible = true }) {
    if (!this.overlay) return;
    this.overlay.sync({ x, y, scale, alpha, flipX, depth, visible: visible && Boolean(this.currentGif) });
  }

  showVictory() {
    this.forcedState = 'victory';
    if (this.lastFighter) this.#enter('victory', this.lastFighter, 'victory');
  }

  showDefeated() {
    this.forcedState = 'defeated';
    if (this.lastFighter) this.#enter('defeated', this.lastFighter, 'defeated');
  }

  showRecovery() {
    this.forcedState = 'recovery';
    if (this.lastFighter) this.#enter('recovery', this.lastFighter, 'hurt');
  }

  clearForcedState() {
    if (!this.forcedState) return;
    this.forcedState = null;
    this.state = null;
    this.currentGif = null;
    this.overlay?.setSource(null);
    this.sprite.setVisible?.(true);
    this.sprite.stop();
  }

  destroy() {
    this.overlay?.destroy();
  }

  #enter(state, fighter, action) {
    this.state = [state, action, fighter.transformed ? 'super' : 'base', fighter.attackComboIndex, fighter.stateTimeMs < 110 ? 'early' : 'late'].join(':');
    this.sprite.stop();
    const transformedTexture = spriteKeyFor(this.rangerId, this.gender, fighter.transformed);
    this.sprite.setTexture(transformedTexture || this.fallbackTexture);
    this.sprite.setOrigin(0.5, 1);

    let source = null;
    if (state === 'victory') source = resultGifFor(this.rangerId, 'ko');
    else if (state === 'defeated') source = resultGifFor(this.rangerId, 'defeated');
    else source = fighterGifFor(this.rangerId, action, fighter.transformed);
    if (state === 'victory' && !source) source = fighterGifFor(this.rangerId, 'idle', fighter.transformed);
    if (state === 'defeated' && !source) source = fighterGifFor(this.rangerId, 'hurt', fighter.transformed);

    this.currentGif = source;
    if (this.overlay) {
      this.overlay.setSource(source);
      this.sprite.setVisible?.(!source);
      if (source) return;
    }
    if (!this.overlay && source) {
      // Legacy tests/adapters without a Phaser scene still exercise animation keys.
      const legacyAction = LEGACY_ACTION_BY_STATE[state] ?? action;
      const key = maleAnimationKey(this.rangerId, legacyAction);
      if (this.animations?.exists?.(key)) this.sprite.play(key, true);
      return;
    }
    const key = maleAnimationKey(this.rangerId, LEGACY_ACTION_BY_STATE[state] ?? action);
    if (this.animations?.exists?.(key)) this.sprite.play(key, true);
  }
}
