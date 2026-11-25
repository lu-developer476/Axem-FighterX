import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/gameConfig.js';
import {
  spriteKeyFor,
  spriteUrlFor,
  menuSpriteKeyFor,
  menuSpriteUrlFor,
  maleAnimationKey,
  maleAnimationUrl,
} from '../../infrastructure/assets/assetManifest.js';
import { AVAILABLE_RANGER_VARIANTS } from '../../domain/rangers/rangerVariants.js';
import { GIF_ACTIONS, GIF_CELL } from '../../infrastructure/assets/characterAnimationData.js';
import { registerCharacterAnimations } from '../animation/registerCharacterAnimations.js';
import { createFxTextures } from '../../infrastructure/graphics/FxTextureFactory.js';
import { STAGE_MAP_ASSETS } from '../../infrastructure/assets/stageAssetManifest.js';
import { createStageAssetTextures } from '../../infrastructure/graphics/StageAssetTextureFactory.js';
import { registerFxAnimations } from '../animation/registerFxAnimations.js';
import { PICKUP_ASSETS, pickupTextureKeyFor } from '../../infrastructure/assets/pickupAssetManifest.js';

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
    this.cameras.main.setBackgroundColor('#000000');
    const status = this.add.text(GAME_WIDTH / 2, 8, 'Cargando recursos...', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#d6c9e8',
      letterSpacing: 1,
    }).setOrigin(0.5, 0);

    this.load.on('fileprogress', () => {
      status.setText('Cargando recursos...');
    });
    this.load.on('loaderror', (file) => {
      console.error('No se pudo cargar un recurso:', file?.key ?? file?.src ?? file);
    });

    // Solo se cargan recursos de la variante completa: Axem Naranja masculino.
    for (const { id, gender } of AVAILABLE_RANGER_VARIANTS) {
      this.load.image(spriteKeyFor(id, gender), spriteUrlFor(id, gender));
      this.load.image(menuSpriteKeyFor(id, gender), menuSpriteUrlFor(id, gender));
      for (const action of ['run', 'bike']) {
        const key = maleAnimationKey(id, action);
        this.load.spritesheet(key, maleAnimationUrl(id, action), { frameWidth: 53, frameHeight: 83 });
      }
      for (const action of GIF_ACTIONS) {
        const key = maleAnimationKey(id, action);
        this.load.spritesheet(key, maleAnimationUrl(id, action), {
          frameWidth: GIF_CELL.width,
          frameHeight: GIF_CELL.height,
        });
      }
    }
    // Todos los PNG de pickups/ se cargan automáticamente.
    Object.entries(PICKUP_ASSETS).forEach(([name, url]) => {
      this.load.image(pickupTextureKeyFor(name), url);
    });
    this.load.image('title-art', import.meta.env.BASE_URL + 'generated/title.png');
    Object.values(STAGE_MAP_ASSETS).forEach(({ key, url }) => this.load.image(key, url));
  }

  create() {
    document.title = 'Súper Axem Rangers FighterX';
    createStageAssetTextures(this);
    createFxTextures(this);
    registerFxAnimations(this);
    registerCharacterAnimations(this);
    this.scene.start('MenuScene');
  }
}
