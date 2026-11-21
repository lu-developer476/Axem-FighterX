import { ARENA } from '../../domain/arena/arena.js';
import { GAME_HEIGHT } from '../../config/gameConfig.js';
import {
  DEFAULT_STAGE_ID,
  getStage,
} from '../../infrastructure/assets/stageAssetManifest.js';

/** Dibuja el mapa o el fondo procedural que corresponde al escenario seleccionado. */
export class StageView {
  constructor(scene, stageId = DEFAULT_STAGE_ID, { backgroundColor = null } = {}) {
    this.scene = scene;
    this.stage = getStage(stageId);
    this.stageId = this.stage?.id ?? DEFAULT_STAGE_ID;
    this.background = null;
    this.solidBackground = typeof backgroundColor === 'string' && /^#[\da-f]{6}$/i.test(backgroundColor)
      ? backgroundColor
      : null;

    if (this.solidBackground) {
      scene.add.rectangle(
        0,
        0,
        ARENA.width,
        GAME_HEIGHT,
        Number.parseInt(this.solidBackground.slice(1), 16),
        1,
      )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-100);
      return;
    }

    const textureKey = this.stage?.backgroundKey ?? this.stage?.proceduralKey;
    if (!textureKey || !scene.textures.exists(textureKey)) {
      scene.add.rectangle(0, 0, ARENA.width, GAME_HEIGHT, 0x0d0b16, 1)
        .setOrigin(0, 0)
        .setDepth(-100);
      return;
    }

    const source = scene.textures.get(textureKey).getSourceImage();
    const scale = Math.max(ARENA.width / source.width, GAME_HEIGHT / source.height);
    const displayWidth = Math.ceil(source.width * scale);
    const displayHeight = Math.ceil(source.height * scale);
    const x = Math.floor((ARENA.width - displayWidth) / 2);
    const y = Math.floor((GAME_HEIGHT - displayHeight) / 2);

    this.background = scene.add.image(x, y, textureKey)
      .setOrigin(0, 0)
      .setDisplaySize(displayWidth, displayHeight)
      .setScrollFactor(1)
      .setDepth(-100);
  }

  handleEvents() {}

  update() {}
}
