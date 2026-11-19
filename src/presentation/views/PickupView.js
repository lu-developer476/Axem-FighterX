import { ARENA } from '../../domain/arena/arena.js';
import { PICKUP_TYPES } from '../../domain/entities/PowerUpPickup.js';
import { FX_PARTICLES } from '../../infrastructure/graphics/FxTextureFactory.js';

const PICKUP_STYLE = {
  [PICKUP_TYPES.HEALTH]: { texture: FX_PARTICLES.heart, label: 'VIDA +25', color: 0xff668d, scale: 2.1 },
  [PICKUP_TYPES.FURY]: { texture: FX_PARTICLES.sword, label: 'FURIA', color: 0xffa64d, scale: 1.7 },
  [PICKUP_TYPES.HASTE]: { texture: FX_PARTICLES.boot, label: 'RAPIDEZ', color: 0x70ddff, scale: 1.7 },
  [PICKUP_TYPES.SHIELD]: { texture: FX_PARTICLES.shield, label: 'ESCUDO', color: 0x9da9ff, scale: 1.7 },
};

/** Dibuja el objeto activo con un halo, icono y nombre legible. */
export class PickupView {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.sprite = null;
    this.glow = null;
    this.label = null;
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

    const style = PICKUP_STYLE[pickup.type];
    const bob = Math.sin(timeMs / 220) * 3;
    const x = Math.round(pickup.x);
    const y = Math.round(ARENA.groundY - 26 + bob);
    this.glow.setPosition(x, y + 7).setAlpha(0.2 + (Math.sin(timeMs / 150) + 1) * 0.08);
    this.sprite.setPosition(x, y).setAngle(Math.sin(timeMs / 280) * 5);
    this.label.setPosition(x, y - 20);

    const blinking = pickup.remainingMs < 2500;
    const visible = !blinking || Math.floor(timeMs / 120) % 2 === 0;
    this.sprite.setVisible(visible);
    this.label.setVisible(visible);
    this.glow.setVisible(visible);
  }

  #create(type) {
    this.#clear();
    const style = PICKUP_STYLE[type];
    if (!style) return;
    this.type = type;
    this.glow = this.scene.add
      .ellipse(0, 0, 28, 14, style.color, 0.25)
      .setDepth(88);
    this.sprite = this.scene.add
      .image(0, 0, style.texture)
      .setScale(style.scale)
      .setTint(style.color)
      .setDepth(90);
    this.label = this.scene.add
      .text(0, 0, style.label, {
        fontFamily: 'monospace',
        fontSize: '6px',
        fontStyle: 'bold',
        color: '#fff1c9',
        stroke: '#0d0b16',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(91);
  }

  #clear() {
    this.sprite?.destroy();
    this.glow?.destroy();
    this.label?.destroy();
    this.sprite = null;
    this.glow = null;
    this.label = null;
    this.type = null;
  }
}
