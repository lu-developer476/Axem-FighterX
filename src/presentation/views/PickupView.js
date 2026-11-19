import { ARENA } from '../../domain/arena/arena.js';
import { FX_PARTICLES } from '../../infrastructure/graphics/FxTextureFactory.js';

/** Dibuja el corazón de curación mientras exista en la partida. */
export class PickupView {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.sprite = null;
  }

  /**
   * @param {import('../../domain/entities/HealthPickup.js').HealthPickup | null} pickup
   * @param {number} timeMs
   */
  sync(pickup, timeMs) {
    if (!pickup) {
      if (this.sprite) {
        this.sprite.destroy();
        this.sprite = null;
      }
      return;
    }
    if (!this.sprite) {
      this.sprite = this.scene.add.image(pickup.x, ARENA.groundY, FX_PARTICLES.heart).setScale(2).setDepth(90);
    }
    const bob = Math.sin(timeMs / 220) * 3;
    this.sprite.setPosition(Math.round(pickup.x), Math.round(ARENA.groundY - 26 + bob));
    const blinking = pickup.remainingMs < 2500;
    this.sprite.setVisible(!blinking || Math.floor(timeMs / 120) % 2 === 0);
  }
}
