import { spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';

/** Los PNG fuente miden 400x626; se reducen para el lienzo de 480x270. */
const DISPLAY_HEIGHT = 110;

/**
 * Vista de Phaser de un Fighter: sprite + sombra. Solo dibuja; no decide reglas.
 */
export class FighterView {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../../domain/entities/Fighter.js').Fighter} fighter
   */
  constructor(scene, fighter) {
    this.fighter = fighter;
    this.shadow = scene.add.ellipse(0, 0, 40, 8, 0x000000, 0.35);
    this.sprite = scene.add.image(0, 0, spriteKeyFor(fighter.id)).setOrigin(0.5, 1);
    this.sprite.setScale(DISPLAY_HEIGHT / this.sprite.height);
    this.sync();
  }

  sync() {
    const { position, facing, hoverOffset } = this.fighter;
    const lift = Math.abs(hoverOffset);
    this.shadow.setPosition(position.x, position.y);
    this.shadow.setScale(1 - lift * 0.03, 1);
    this.sprite.setPosition(position.x, position.y + hoverOffset - 8);
    this.sprite.setFlipX(facing === -1);
    this.sprite.setDepth(position.y);
    this.shadow.setDepth(position.y - 1);
  }
}
