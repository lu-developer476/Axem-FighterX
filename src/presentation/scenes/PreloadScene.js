import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import {
  spriteKeyFor,
  spriteUrlFor,
  menuSpriteKeyFor,
  menuSpriteUrlFor,
} from '../../infrastructure/assets/assetManifest.js';
import { AVAILABLE_RANGER_VARIANTS, genderForRanger } from '../../domain/rangers/rangerVariants.js';
import { KENNEY_FX } from '../../infrastructure/assets/kenneyFxAssets.js';
import { createFxTextures } from '../../infrastructure/graphics/FxTextureFactory.js';
import { STAGE_MAP_ASSETS, STAGE_TILESET_ASSETS } from '../../infrastructure/assets/stageAssetManifest.js';
import { createStageAssetTextures } from '../../infrastructure/graphics/StageAssetTextureFactory.js';
import whitePuffAtlasUrl from '../../../art/source/effects/kenney-smoke-particles/white-puff-atlas.png';
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
    this.add.text(GAME_WIDTH / 2, 105, 'PREPARANDO EL COMBATE', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b9afd2',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const status = this.add.text(GAME_WIDTH / 2, 131, 'Cargando recursos...', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#8f86ae',
    }).setOrigin(0.5);
    const percentage = this.add.text(GAME_WIDTH / 2, 163, '0%', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f4d18b',
    }).setOrigin(0.5);
    const progressBar = this.add.graphics();

    const drawProgress = (value) => {
      const progress = Phaser.Math.Clamp(value, 0, 1);
      progressBar.clear();
      progressBar.fillStyle(0x241b3b, 1);
      progressBar.fillRect(137, 145, 206, 7);
      progressBar.lineStyle(1, 0x75638f, 1);
      progressBar.strokeRect(137, 145, 206, 7);
      progressBar.fillStyle(0xd68b65, 1);
      progressBar.fillRect(140, 148, 200 * progress, 1);
      progressBar.fillStyle(0xf3c878, 1);
      progressBar.fillRect(140, 149, 200 * progress, 1);
      percentage.setText(Math.round(progress * 100) + '%');
    };

    drawProgress(0);
    this.load.on('progress', drawProgress);
    this.load.on('fileprogress', () => {
      status.setText('Cargando recursos...');
    });
    this.load.on('loaderror', () => {
      status.setText('No se pudo cargar un recurso');
    });

    // Carga únicamente las identidades canónicas: Orange masculino y Violet femenino.
    for (const { id, gender } of AVAILABLE_RANGER_VARIANTS) {
      this.load.image(spriteKeyFor(id, gender), spriteUrlFor(id, gender));
      for (const action of ['run', 'bike']) {
        const key = 'axem-' + gender + '-' + id + '-' + action;
        this.load.spritesheet(
          key,
          import.meta.env.BASE_URL + 'generated/' + key + '.png',
          { frameWidth: 53, frameHeight: 83 },
        );
      }
    }
    for (const rangerId of [RANGER_IDS.ORANGE, RANGER_IDS.VIOLET]) {
      const gender = genderForRanger(rangerId);
      this.load.image(
        menuSpriteKeyFor(rangerId, gender),
        menuSpriteUrlFor(rangerId, gender),
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
    document.title = 'Súper Axem Rangers FighterX';
    createStageAssetTextures(this);
    createFxTextures(this);
    registerFxAnimations(this);
    for (const { id, gender } of AVAILABLE_RANGER_VARIANTS) {
      for (const action of ['run', 'bike']) {
        const key = 'axem-' + gender + '-' + id + '-' + action;
        if (!this.anims.exists(key) && this.textures.exists(key)) {
          const texture = this.textures.get(key);
          const frames = this.anims.generateFrameNumbers(key, { start: 0, end: texture.frameTotal - 2 });
          if (frames.length) this.anims.create({
            key,
            frames,
            frameRate: action === 'bike' ? 9 : 10,
            repeat: -1,
          });
        }
      }
    }
    this.scene.start('MenuScene');
  }
}
