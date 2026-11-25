import { ARENA } from '../../domain/arena/arena.js';
import { PICKUP_TYPES } from '../../domain/entities/PowerUpPickup.js';
import { fxFrameKey } from '../../infrastructure/graphics/FxTextureFactory.js';
import {
  PICKUP_ASSET_STANDARD,
  pickupTextureKeyFor,
} from '../../infrastructure/assets/pickupAssetManifest.js';

const PICKUP_STYLE = {
  [PICKUP_TYPES.HEALTH]: { asset: 'heart', color: 0xff668d },
  [PICKUP_TYPES.FURY]: { asset: 'sword', color: 0xffa64d },
  [PICKUP_TYPES.HASTE]: { asset: 'thunder', color: 0x70ddff },
  [PICKUP_TYPES.SHIELD]: { asset: 'shield', color: 0x9da9ff },
};

/** Dibuja el pickup conservando proporción y tamaño máximo del arte visible. */
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

    const textureKey = pickupTextureKeyFor(style.asset);
    if (!this.scene.textures.exists(textureKey)) return;

    const artworkSize = Math.max(
      PICKUP_ASSET_STANDARD.artwork.maxWidth,
      PICKUP_ASSET_STANDARD.artwork.maxHeight,
    );
    const scale = PICKUP_ASSET_STANDARD.display.maxVisibleSize / artworkSize;

    this.type = type;
    this.aura = this.scene.add
      .image(0, 0, fxFrameKey('healRing', 0))
      .setScale(2.1)
      .setTint(style.color)
      .setAlpha(0.34)
      .setDepth(89);
    // La transparencia del margen no reduce el tamaño visible del objeto.
    this.sprite = this.scene.add
      .image(0, 0, textureKey)
      .setScale(scale)
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
