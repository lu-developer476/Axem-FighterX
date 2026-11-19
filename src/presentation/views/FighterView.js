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
      Math.round(fighter.position.y - FLOAT_HEIGHT - fighter.position.z - lift + pose.y),
    );
    if (pose.flash) sprite.setTintFill(0xffffff);
    else sprite.clearTint();
    // La elevación también modifica el orden de dibujo: un luchador en el aire
    // no queda artificialmente delante de otro que ocupa el mismo carril del suelo.
    const laneDepth = FIGHTER_DEPTH + Math.round(fighter.position.y - fighter.position.z * 0.35);
    sprite.setDepth(laneDepth + (fighter.state === FighterState.ATTACK ? 2 : 0));

    const laneProgress = (fighter.position.y - ARENA.minY) / (ARENA.maxY - ARENA.minY);
    const altitudeRatio = fighter.maxAltitude > 0 ? fighter.position.z / fighter.maxAltitude : 0;
    const shadowScale = 0.72 + laneProgress * 0.28;
    const flightScale = 1 - altitudeRatio * 0.3;
    this.shadow.setPosition(Math.round(fighter.position.x), Math.round(fighter.position.y));
    this.shadow.setScale(shadowScale * flightScale, shadowScale * flightScale);
    this.shadow.setDepth(laneDepth - 1);
    this.shadow.setAlpha(pose.alpha * (0.4 - altitudeRatio * 0.2));
  }
}
