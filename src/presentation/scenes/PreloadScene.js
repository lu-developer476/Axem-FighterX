import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { sourceKeyFor, spriteKeyFor, spriteManifest } from '../../infrastructure/assets/assetManifest.js';
import { characterAnimationData } from '../../infrastructure/assets/characterAnimationData.js';
import { listAvailableSheets } from '../../infrastructure/assets/sheetCatalog.js';
import { createFxTextures } from '../../infrastructure/graphics/FxTextureFactory.js';
import { prepareSpriteTexture } from '../../infrastructure/graphics/prepareSpriteTexture.js';
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

    for (const [rangerId, url] of Object.entries(spriteManifest)) {
      this.load.image(sourceKeyFor(rangerId), url);
    }
    // Solo se cargan las hojas de sprites que existen en el proyecto.
    for (const sheet of listAvailableSheets()) this.load.image(sheet.key, sheet.url);
  }

  create() {
    createStageTextures(this);
    createFxTextures(this);
    this.#prepareBasePoses();
    registerFxAnimations(this);
    registerCharacterAnimations(this);
    this.scene.start('FightScene');
  }

  /** Reduce los PNG de art/source a la resolución del juego (pixel art nítido). */
  #prepareBasePoses() {
    for (const [rangerId, data] of Object.entries(characterAnimationData)) {
      const prepared = prepareSpriteTexture(this, {
        sourceKey: sourceKeyFor(rangerId),
        targetKey: spriteKeyFor(rangerId),
        nativeSize: data.pose?.nativeSize,
        targetHeight: data.displayHeight,
      });
      if (prepared) continue;
      // El PNG ya tiene tamaño de juego: se usa tal cual.
      const source = this.textures.get(sourceKeyFor(rangerId)).getSourceImage();
      this.textures.addImage(spriteKeyFor(rangerId), source);
      this.textures.remove(sourceKeyFor(rangerId));
    }
  }
}
