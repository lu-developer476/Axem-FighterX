import { ARENA } from '../../domain/arena/arena.js';
import { PICKUP_TYPES } from '../../domain/entities/PowerUpPickup.js';
import { FX_PARTICLES } from '../../infrastructure/graphics/FxTextureFactory.js';
import { KENNEY_FX } from '../../infrastructure/assets/kenneyFxAssets.js';

const PICKUP_STYLE = {
  [PICKUP_TYPES.HEALTH]: { texture: FX_PARTICLES.heart, color: 0xff668d, scale: 2.1 },
  [PICKUP_TYPES.FURY]: { texture: FX_PARTICLES.sword, color: 0xffa64d, scale: 1.7 },
  [PICKUP_TYPES.HASTE]: { texture: FX_PARTICLES.boot, color: 0x70ddff, scale: 1.7 },
  [PICKUP_TYPES.SHIELD]: { texture: FX_PARTICLES.shield, color: 0x9da9ff, scale: 1.7 },
};

/** Dibuja el icono del objeto activo con un aura de color, sin rótulos ni sombras. */
export class PickupView {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.sprite = null;
    this.type = null;
  }

  /**
   * @param {import('../../domain/entities/PowerUpPickup.js').PowerUpPickup | null} pickup
   * @param {number} timeMs
   */
  sync(pickup, timeMs) {
    if (!pickup) {
      this.#clear();
      return;
    }

    if (!this.sprite || this.type !== pickup.type) this.#create(pickup.type);

    const x = Math.round(pickup.x);
    const y = Math.round(ARENA.groundY - 26 + Math.sin(timeMs / 220) * 3);
    this.sprite.setPosition(x, y).setAngle(Math.sin(timeMs / 280) * 5);
    this.aura
      ?.setPosition(x, y)
      .setScale(2.1 + Math.sin(timeMs / 170) * 0.12)
      .setAlpha(0.26 + (Math.sin(timeMs / 210) + 1) * 0.08);

    const blinking = pickup.remainingMs < 2500;
    const visible = !blinking || Math.floor(timeMs / 120) % 2 === 0;
    this.sprite.setVisible(visible);
  }

  #create(type) {
    this.#clear();
    const style = PICKUP_STYLE[type];
    if (!style) return;
    this.type = type;
    this.aura = this.scene.add
      .image(0, 0, KENNEY_FX.magic.key)
      .setScale(2.1)
      .setTint(style.color)
      .setAlpha(0.34)
      .setDepth(89);
    this.sprite = this.scene.add
      .image(0, 0, style.texture)
      .setScale(style.scale)
      .setTint(style.color)
      .setDepth(90);
  }

  #clear() {
    this.sprite?.destroy();
    this.aura?.destroy();
    this.sprite = null;
    this.aura = null;
    this.type = null;
  }
}
