import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { spriteKeyFor, spriteManifest } from '../../infrastructure/assets/assetManifest.js';
import { listAvailableSheets } from '../../infrastructure/assets/sheetCatalog.js';
import { createFxTextures } from '../../infrastructure/graphics/FxTextureFactory.js';
import { createStageTextures } from '../../infrastructure/graphics/StageTextureFactory.js';
import { registerCharacterAnimations } from '../animation/registerCharacterAnimations.js';
import { registerFxAnimations } from '../animation/registerFxAnimations.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Cargando…', { fontFamily: 'monospace', fontSize: '10px', color: '#9a96c0' })
      .setOrigin(0.5);

    for (const [rangerId, path] of Object.entries(spriteManifest)) {
      this.load.image(spriteKeyFor(rangerId), path);
    }
    // Solo se cargan las hojas de sprites que existen en el proyecto.
    for (const sheet of listAvailableSheets()) this.load.image(sheet.key, sheet.url);
  }

  create() {
    createStageTextures(this);
    createFxTextures(this);
    registerFxAnimations(this);
    registerCharacterAnimations(this);
    this.scene.start('FightScene');
  }
}
