import { ARENA } from '../../domain/arena/arena.js';
import { FighterState } from '../../domain/entities/FighterState.js';
import { characterAnimationData } from '../../infrastructure/assets/characterAnimationData.js';
import { FighterAnimator } from '../animation/FighterAnimator.js';
import { shouldFlip } from './orientation.js';

/** Los pies pueden tocar el suelo; al flotar se elevan según la amplitud del luchador. */
const FLOAT_HEIGHT = 0;
const FIGHTER_DEPTH = 100;

/**
 * Vista de Phaser de un Fighter: sprite + sombra. Solo dibuja; no decide reglas.
 * La orientación sale del dominio (hacia donde el jugador se movió por última vez).
 */
export class FighterView {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../../domain/entities/Fighter.js').Fighter} fighter
   */
  constructor(scene, fighter) {
    this.fighter = fighter;
    this.data = characterAnimationData[fighter.id];

    this.shadow = scene.add.ellipse(0, ARENA.groundY, 44, 8, 0x000000, 0.4).setDepth(FIGHTER_DEPTH - 1);
    this.sprite = scene.add.sprite(0, 0, this.data.fallbackTexture).setOrigin(0.5, 1);
    this.animator = new FighterAnimator(this.sprite, fighter.id, this.data.fallbackTexture, scene.anims);
    this.sync();
  }

  sync() {
    const { fighter, sprite, data } = this;
    const pose = this.animator.update(fighter);
    const facing = fighter.facing;
    const lift = fighter.state === FighterState.KO ? 0 : fighter.hoverOffset;

    const baseScale = data.displayHeight / sprite.frame.realHeight;
    sprite.setScale(baseScale * pose.scaleX, baseScale * pose.scaleY);
    sprite.setFlipX(shouldFlip(facing, data.spriteFacing));
    sprite.setAngle(pose.angle * facing);
    sprite.setAlpha(pose.alpha);
    sprite.setPosition(
      Math.round(fighter.position.x + pose.x * facing),
      Math.round(fighter.position.y - FLOAT_HEIGHT + lift + pose.y),
    );
    if (pose.flash) sprite.setTintFill(0xffffff);
    else sprite.clearTint();
    sprite.setDepth(FIGHTER_DEPTH + (fighter.state === FighterState.ATTACK ? 2 : 0));

    const height = FLOAT_HEIGHT + lift;
    this.shadow.setPosition(Math.round(fighter.position.x), ARENA.groundY);
    this.shadow.setScale(Math.max(0.5, 1 - height * 0.025), 1);
    this.shadow.setAlpha(pose.alpha * 0.4);
  }
}
