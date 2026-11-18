import Phaser from 'phaser';
import { spriteManifest, spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    for (const [rangerId, path] of Object.entries(spriteManifest)) {
      this.load.image(spriteKeyFor(rangerId), path);
    }
  }

  create() {
    this.scene.start('FightScene');
  }
}
