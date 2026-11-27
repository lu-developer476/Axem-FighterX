import { ARENA } from '../../domain/arena/arena.js';
import { FighterState } from '../../domain/entities/FighterState.js';
import { characterAnimationData } from '../../infrastructure/assets/characterAnimationData.js';
import { spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';
import {
  BROWN_DUST_GIF,
  KI_AURA_GIF,
  TRANSFORMATION_AURA_GIF,
  healthAuraGifFor,
} from '../../infrastructure/assets/combatGifManifest.js';
import { FighterAnimator } from '../animation/FighterAnimator.js';
import { GifOverlay } from './GifOverlay.js';
import { shouldFlip } from './orientation.js';

const FLOAT_HEIGHT = 0;
const FIGHTER_DEPTH = 100;

/** Vista animada de un luchador: sprites, GIFs de estado y auras de combate. */
export class FighterView {
  constructor(scene, fighter) {
    this.scene = scene;
    this.fighter = fighter;
    this.data = characterAnimationData[fighter.id] ?? characterAnimationData.orange;
    this.defeated = false;
    const fallbackTexture = spriteKeyFor(fighter.id, fighter.gender);

    this.shadow = scene.add.ellipse(0, ARENA.groundY, 44, 8, 0x000000, 0.4).setDepth(FIGHTER_DEPTH - 1);
    this.sprite = scene.add.sprite(0, 0, fallbackTexture).setOrigin(0.5, 1);
    this.animator = new FighterAnimator(this.sprite, fighter.id, fighter.gender, fallbackTexture, scene.anims, scene);
    this.kiAura = new GifOverlay(scene, { width: 124, height: 124, depth: FIGHTER_DEPTH - 5, originY: 0.72 });
    this.transformationAura = new GifOverlay(scene, { width: 154, height: 154, depth: FIGHTER_DEPTH - 6, originY: 0.72 });
    this.healthAura = new GifOverlay(scene, { width: 120, height: 120, depth: FIGHTER_DEPTH + 2, originY: 0.72 });
    this.brownDust = new GifOverlay(scene, { width: 138, height: 76, depth: FIGHTER_DEPTH + 3, originY: 1 });
    this.healthAuraSource = healthAuraGifFor(fighter.id);
    this.healthAura.setSource(this.healthAuraSource);
    this.brownDust.setSource(BROWN_DUST_GIF);
    this.kiAura.setSource(KI_AURA_GIF);
    this.transformationAura.setSource(TRANSFORMATION_AURA_GIF);
    this.sync();
  }

  sync() {
    const { fighter, sprite } = this;
    const pose = this.animator.update(fighter);
    const facing = fighter.facing;
    const lift = fighter.state === FighterState.KO ? 0 : fighter.hoverOffset;

    const frameHeight = Math.max(1, sprite.frame?.height ?? sprite.height ?? this.data.displayHeight);
    const baseScale = (this.data.displayHeight * 0.82) / frameHeight;
    sprite.setScale(baseScale * pose.scaleX, baseScale * pose.scaleY);
    const flipX = shouldFlip(facing, this.animator.spriteFacing);
    sprite.setFlipX(flipX);
    sprite.setAngle(pose.angle * facing);
    sprite.setAlpha(pose.alpha);
    const x = Math.round(fighter.position.x + pose.x * facing);
    const y = Math.round(fighter.position.y - FLOAT_HEIGHT - fighter.position.z - lift + pose.y);
    sprite.setPosition(x, y);
    if (pose.flash) sprite.setTintFill(0xffffff);
    else sprite.clearTint();
    const laneDepth = FIGHTER_DEPTH + Math.round(fighter.position.y - fighter.position.z * 0.35);
    sprite.setDepth(laneDepth + (fighter.state === FighterState.ATTACK ? 2 : 0));

    const gifScale = (this.data.displayHeight * 0.82) / 100;
    this.animator.syncGif({
      x,
      y,
      scale: gifScale,
      alpha: pose.alpha,
      flipX,
      depth: laneDepth + 1,
      visible: true,
    });

    const kiCharging = fighter.state === FighterState.CHARGE_KI;
    this.kiAura.sync({
      x,
      y: y - 30,
      scale: gifScale * 1.12,
      alpha: 0.92,
      depth: laneDepth - 5,
      flipX,
      visible: kiCharging,
    });

    this.transformationAura.sync({
      x,
      y: y - 31,
      scale: gifScale * 1.25,
      alpha: 0.9,
      depth: laneDepth - 6,
      flipX,
      visible: fighter.transformed,
    });

    const healthRatio = fighter.maxHealth > 0 ? fighter.health / fighter.maxHealth : 1;
    const missingHealth = 1 - healthRatio;
    const healthAuraVisible = Boolean(this.healthAuraSource) && (missingHealth > 0.06 || !fighter.isAlive || this.defeated);
    this.healthAura.sync({
      x,
      y: y - 23,
      scale: gifScale * (0.86 + missingHealth * 0.3),
      alpha: Math.min(0.92, 0.22 + missingHealth * 0.9),
      depth: laneDepth + 2,
      flipX,
      visible: healthAuraVisible,
    });

    const dustVisible = this.defeated || !fighter.isAlive || fighter.isInHitCombo;
    this.brownDust.sync({
      x,
      y: fighter.position.y + 2,
      scale: gifScale * 1.05,
      alpha: this.defeated || !fighter.isAlive ? 0.95 : 0.72,
      depth: laneDepth + 4,
      flipX,
      visible: dustVisible,
    });

    const laneRange = ARENA.maxY - ARENA.minY;
    const laneProgress = laneRange > 0
      ? Math.max(0, Math.min(1, (fighter.position.y - ARENA.minY) / laneRange))
      : 1;
    const altitudeRatio = fighter.maxAltitude > 0 ? fighter.position.z / fighter.maxAltitude : 0;
    const shadowScale = 0.72 + laneProgress * 0.28;
    const flightScale = 1 - altitudeRatio * 0.3;
    this.shadow.setPosition(Math.round(fighter.position.x), Math.round(fighter.position.y));
    this.shadow.setScale(shadowScale * flightScale, shadowScale * flightScale);
    this.shadow.setDepth(laneDepth - 1);
    this.shadow.setAlpha(pose.alpha * (0.4 - altitudeRatio * 0.2));
  }

  showVictory() {
    this.defeated = false;
    this.animator.showVictory();
    if (this.fighter.gender !== 'male') {
      this.victoryTween = this.scene.tweens.add({
        targets: this.sprite,
        y: this.sprite.y - 8,
        angle: -5,
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  showDefeated() {
    this.defeated = true;
    this.animator.showDefeated();
    this.sync();
  }

  showRecovery() {
    this.defeated = false;
    this.animator.showRecovery();
    this.sync();
    this.scene.time.delayedCall(720, () => {
      if (this.animator.forcedState === 'recovery') this.animator.clearForcedState();
      this.sync();
    });
  }

  clearVictory() {
    this.victoryTween?.stop();
    this.victoryTween = null;
    this.defeated = false;
    this.sprite.setAngle(0);
    this.animator.clearForcedState();
  }

  destroy() {
    this.animator.destroy();
    this.kiAura.destroy();
    this.transformationAura.destroy();
    this.healthAura.destroy();
    this.brownDust.destroy();
    this.shadow.destroy();
    this.sprite.destroy();
  }
}
