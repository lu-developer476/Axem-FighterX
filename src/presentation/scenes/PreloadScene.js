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
import titleArtUrl from '../../../art/source/title.png?url';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0818).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 91, 'Axem FighterX', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#f4d18b',
      stroke: '#3b2149',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 119, 'PREPARANDO EL COMBATE', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#b9afd2',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const status = this.add.text(GAME_WIDTH / 2, 145, 'CARGANDO RECURSOS...', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#8f86ae',
    }).setOrigin(0.5);
    const percentage = this.add.text(GAME_WIDTH / 2, 177, '0%', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#f4d18b',
    }).setOrigin(0.5);
    const progressBar = this.add.graphics();

    const drawProgress = (value) => {
      const progress = Phaser.Math.Clamp(value, 0, 1);
      progressBar.clear();
      progressBar.fillStyle(0x241b3b, 1);
      progressBar.fillRect(137, 159, 206, 7);
      progressBar.lineStyle(1, 0x75638f, 1);
      progressBar.strokeRect(137, 159, 206, 7);
      progressBar.fillStyle(0xd68b65, 1);
      progressBar.fillRect(140, 162, 200 * progress, 1);
      progressBar.fillStyle(0xf3c878, 1);
      progressBar.fillRect(140, 163, 200 * progress, 1);
      percentage.setText(Math.round(progress * 100) + '%');
    };

    drawProgress(0);
    this.load.on('progress', drawProgress);
    this.load.on('fileprogress', (file) => {
      status.setText('CARGANDO ' + file.key.toUpperCase());
    });
    this.load.on('loaderror', (file) => {
      status.setText('NO SE PUDO CARGAR ' + file.key.toUpperCase());
    });

    for (const [rangerId, url] of Object.entries(spriteManifest)) {
      this.load.image(sourceKeyFor(rangerId), url);
    }
    // Solo se cargan las hojas de sprites que existen en el proyecto.
    for (const sheet of listAvailableSheets()) this.load.image(sheet.key, sheet.url);
    this.load.image('title-art', titleArtUrl);
  }

  create() {
    createStageTextures(this);
    createFxTextures(this);
    this.#prepareBasePoses();
    registerFxAnimations(this);
    registerCharacterAnimations(this);
    this.scene.start('MenuScene');
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
