import { ARENA } from '../../domain/arena/arena.js';
import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import {
  PARALLAX,
  PILLAR_HEIGHT,
  VIEW,
  WALL_HEIGHT,
  WALL_WIDTH,
} from '../../infrastructure/graphics/StageTextureFactory.js';
import { getStageTextures } from '../../infrastructure/graphics/StageThemeFactory.js';
import { flameAnimationKey } from '../animation/registerFxAnimations.js';

const PILLAR_X = 20;
const BARRIER_X = 26;
const STAGE_VISUALS = {
  [STAGE_IDS.RUINS]: { hazeAlpha: 0.12, barrierBaseAlpha: 0.55, flicker: 0.25 },
  [STAGE_IDS.VOLCANO]: { hazeAlpha: 0.06, barrierBaseAlpha: 0.7, flicker: 0.34 },
  [STAGE_IDS.FOREST]: { hazeAlpha: 0.1, barrierBaseAlpha: 0.45, flicker: 0.12 },
  [STAGE_IDS.SANCTUARY]: { hazeAlpha: 0.05, barrierBaseAlpha: 0.62, flicker: 0.16 },
};

/** Construye las capas, límites y detalles del escenario seleccionado. */
export class StageView {
  /** @param {Phaser.Scene} scene @param {string} [stageId] */
  constructor(scene, stageId = STAGE_IDS.RUINS) {
    this.stageId = STAGE_VISUALS[stageId] ? stageId : STAGE_IDS.RUINS;
    this.textures = getStageTextures(this.stageId);
    this.visuals = STAGE_VISUALS[this.stageId];
    this.parallaxLayers = [];

    // Las posiciones enteras evitan que el desplazamiento interpole píxeles.
    const layer = (key, factor, depth, x = 0, y = 0) => {
      const image = scene.add.image(x, y, key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(depth);
      this.parallaxLayers.push({ image, factor, originX: x });
      return image;
    };

    layer(this.textures.sky, 0, -100);
    layer(this.textures.far, PARALLAX.far, -90);
    layer(this.textures.mid, PARALLAX.mid, -80);
    this.fog = scene.add
      .tileSprite(0, 168, VIEW.width, 40, this.textures.fog)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-75)
      .setAlpha(this.visuals.hazeAlpha);
    layer(this.textures.near, PARALLAX.near, -70);
    layer(this.textures.floor, 1, -20, 0, ARENA.minY);

    for (const x of [0, ARENA.width - WALL_WIDTH]) {
      layer(this.textures.wall, 1, -15, x, ARENA.groundY - WALL_HEIGHT);
    }

    this.barriers = [BARRIER_X, ARENA.width - BARRIER_X].map((x) =>
      scene.add
        .image(x, ARENA.groundY, this.textures.barrier)
        .setOrigin(0.5, 1)
        .setDepth(-12),
    );

    for (const x of [PILLAR_X, ARENA.width - PILLAR_X]) {
      scene.add.image(x, ARENA.groundY, this.textures.pillar).setOrigin(0.5, 1).setDepth(-14);
      scene.add
        .sprite(x, ARENA.groundY - PILLAR_HEIGHT + 2, this.textures.flame(0))
        .setOrigin(0.5, 1)
        .setDepth(-13)
        .play(flameAnimationKey(this.stageId));
    }
  }

  /**
   * @param {number} timeMs tiempo total de la escena
   * @param {number} scrollX posición horizontal de la cámara
   */
  update(timeMs, scrollX) {
    for (const { image, factor, originX } of this.parallaxLayers) {
      image.setX(Math.round(originX - scrollX * factor));
    }
    this.fog.tilePositionX = Math.round(timeMs * 0.012 + scrollX * 0.4);
    const flicker = this.visuals.barrierBaseAlpha + this.visuals.flicker * (0.5 + 0.5 * Math.sin(timeMs / 90));
    for (const barrier of this.barriers) barrier.setAlpha(flicker);
  }
}
