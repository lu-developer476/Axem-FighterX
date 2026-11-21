import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import {
  RANGER_GENDERS,
  spriteKeyFor,
  spriteUrlFor,
  menuSpriteKeyFor,
  menuSpriteUrlFor,
  maleAnimationKey,
  maleAnimationUrl,
} from '../../infrastructure/assets/assetManifest.js';
import { GIF_ACTIONS, GIF_CELL } from '../../infrastructure/assets/characterAnimationData.js';
import { KENNEY_FX } from '../../infrastructure/assets/kenneyFxAssets.js';
import { createFxTextures } from '../../infrastructure/graphics/FxTextureFactory.js';
import { STAGE_MAP_ASSETS, STAGE_TILESET_ASSETS } from '../../infrastructure/assets/stageAssetManifest.js';
import { createStageAssetTextures } from '../../infrastructure/graphics/StageAssetTextureFactory.js';
import whitePuffAtlasUrl from '../../../art/source/effects/kenney-smoke-particles/white-puff-atlas.png';
import { registerCharacterAnimations } from '../animation/registerCharacterAnimations.js';
import { registerFxAnimations } from '../animation/registerFxAnimations.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // El filtrado point (nearest-neighbor) evita interpolar y suavizar los píxeles.
    // Se aplica a texturas actuales y a todas las que se incorporen durante la ejecución,
    // independientemente de si provienen del recoloreo o de archivos agregados al proyecto.
    const pointFilter = Phaser.Textures.FilterMode.NEAREST;
    const applyPointFilter = (_key, texture) => {
      if (texture && typeof texture.setFilter === 'function') {
        texture.setFilter(pointFilter);
      }
    };

    this.textures.on(Phaser.Textures.Events.ADD, applyPointFilter);
    Object.values(this.textures.list).forEach((texture) => {
      applyPointFilter(texture.key, texture);
    });
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0818).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 91, 'Axem FighterX', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#f4d18b',
      stroke: '#3b2149',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 119, 'PREPARANDO EL COMBATE', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b9afd2',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const status = this.add.text(GAME_WIDTH / 2, 145, 'CARGANDO RECURSOS...', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#8f86ae',
    }).setOrigin(0.5);
    const percentage = this.add.text(GAME_WIDTH / 2, 177, '0%', {
      fontFamily: 'monospace',
      fontSize: '10px',
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

    // Cada variante (color + género) tiene su retrato generado desde las referencias.
    for (const gender of RANGER_GENDERS) {
      for (const rangerId of [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE]) {
        this.load.image(
          spriteKeyFor(rangerId, gender),
          spriteUrlFor(rangerId, gender),
        );
      }
    }
    for (const rangerId of [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE]) {
      this.load.image(menuSpriteKeyFor(rangerId), menuSpriteUrlFor(rangerId));
      for (const action of ['run', 'bike', 'double-axe']) {
        this.load.spritesheet(maleAnimationKey(rangerId, action), maleAnimationUrl(rangerId, action), {
          frameWidth: 53,
          frameHeight: 83,
        });
      }
      for (const action of GIF_ACTIONS) {
        this.load.spritesheet(maleAnimationKey(rangerId, action), maleAnimationUrl(rangerId, action), {
          frameWidth: GIF_CELL.width,
          frameHeight: GIF_CELL.height,
        });
      }
      this.load.image(
        maleAnimationKey(rangerId, 'defeated'),
        maleAnimationUrl(rangerId, 'defeated'),
      );
    }
    this.load.image('title-art', import.meta.env.BASE_URL + 'generated/title.png');
    Object.values(STAGE_MAP_ASSETS).forEach(({ key, url }) => this.load.image(key, url));
    Object.values(STAGE_TILESET_ASSETS).forEach(({ key, url }) => this.load.image(key, url));
    Object.values(KENNEY_FX).forEach(({ key, url }) => this.load.image(key, url));
    this.load.spritesheet('kenney-white-puff', whitePuffAtlasUrl, {
      frameWidth: 381,
      frameHeight: 346,
    });
  }

  create() {
    createStageAssetTextures(this);
    createFxTextures(this);
    registerFxAnimations(this);
    registerCharacterAnimations(this);
    this.scene.start('MenuScene');
  }
}
