import { GIF_ORIGIN_Y, animationKey } from '../../infrastructure/assets/characterAnimationData.js';
import { maleAnimationKey } from '../../infrastructure/assets/assetManifest.js';
import { spriteFacingFor } from '../../infrastructure/assets/characterAnimationData.js';
import { flashOnlyPose, poseFor } from './proceduralPoses.js';

const PUNCH_ACTIONS = Object.freeze(['punch-01', 'punch-02', 'punch-03']);

/** Poder de furia activo: el Axem se muestra cargado. */
const FURY_KEY = 'fury';

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
    this.punchIndex = -1;
    this.forcedState = null;
  }

  /** La pose base y las hojas GIF usan la misma orientación nativa declarada para cada fuente. */
  get spriteFacing() {
    return spriteFacingFor(this.rangerId, this.gender);
  }

  /** @param {import('../../domain/entities/Fighter.js').Fighter} fighter */
  update(fighter) {
    const currentState = fighter.state === 'dash' && this.gender !== 'male' ? 'walk' : fighter.state;
    const visualState = this.forcedState ?? currentState;
    const animationState = this.gender === 'male'
      ? (this.forcedState ?? this.#maleAnimationState(fighter))
      : visualState;
    if (animationState !== this.state) this.#enter(animationState);
    return this.usingSheet
      ? flashOnlyPose(this.forcedState ?? fighter.state, fighter.stateTimeMs)
      : poseFor(visualState, this.forcedState ? fighter.elapsedMs : fighter.stateTimeMs, fighter.elapsedMs);
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

  /**
   * Elige la animación masculina. La clave devuelta empieza por la acción:
   * `run`, `double-axe` y `defeated` usan hojas de 53×83; el resto, hojas de los GIF.
   */
  #maleAnimationState(fighter) {
    const inAir = (fighter.position?.z ?? 0) > 0;
    switch (fighter.state) {
      case 'walk':
        return 'run';
      case 'dash':
        return 'dash';
      case 'dodge':
        return 'roll';
      case 'block':
        return 'guard';
      case 'block-hit':
        return 'guard-hit';
      case 'land':
        return 'land';
      case 'special-attack':
        return 'special-attack';
      case 'attack':
        return inAir ? 'double-axe' : 'punch';
      case 'hurt':
        return 'hurt-combo';
      case 'teleport':
        return 'teleport';
      case 'ko':
        return 'ko';
      default:
        if (inAir) return 'jump';
        return (fighter.powerUps?.[FURY_KEY] ?? 0) > 0 ? 'charge' : 'idle';
    }
  }

  #enter(state) {
    this.state = state;

    if (state === 'ko' && this.gender === 'male'
      && !this.anims.exists(maleAnimationKey(this.rangerId, 'ko'))) {
      this.sprite.stop();
      this.sprite.setTexture(maleAnimationKey(this.rangerId, 'defeated'));
      this.sprite.setOrigin?.(0.5, 1);
      this.usingSheet = true;
      return;
    }

    let key;
    let gifSheet = false;
    if (this.gender === 'male') {
      let action = state;
      if (state === 'punch') {
        this.punchIndex = (this.punchIndex + 1) % PUNCH_ACTIONS.length;
        action = PUNCH_ACTIONS[this.punchIndex];
      }
      key = maleAnimationKey(this.rangerId, action);
      gifSheet = action !== 'run' && action !== 'double-axe';
    } else {
      key = animationKey(this.rangerId, state);
    }

    if (this.anims.exists(key)) {
      // Las hojas GIF y las de 53×83 apoyan los pies a distinta altura de su celda.
      this.sprite.setOrigin?.(0.5, gifSheet ? GIF_ORIGIN_Y : 1);
      this.sprite.play(key);
      this.usingSheet = true;
    } else {
      this.sprite.stop();
      this.sprite.setTexture(this.fallbackTexture);
      this.sprite.setOrigin?.(0.5, 1);
      this.usingSheet = false;
    }
  }
}
