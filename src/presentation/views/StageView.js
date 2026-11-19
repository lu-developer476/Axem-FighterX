import { ARENA } from '../../domain/arena/arena.js';
import {
  PARALLAX,
  PILLAR_HEIGHT,
  STAGE_TEXTURES,
  VIEW,
  WALL_HEIGHT,
  WALL_WIDTH,
} from '../../infrastructure/graphics/StageTextureFactory.js';
import { FLAME_ANIMATION } from '../animation/registerFxAnimations.js';

/** Posición de los pilares y barreras que marcan el borde del escenario. */
const PILLAR_X = 20;
const BARRIER_X = 26;

/**
 * Escenario "Ruinas de medianoche": cielo, montañas, castillo y pinos en capas
 * con parallax, niebla, suelo de ladrillos y límites visibles (muros, pilares con
 * antorcha y barreras brillantes).
 */
export class StageView {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    const layer = (key, factor, depth, x = 0, y = 0) =>
      scene.add.image(x, y, key).setOrigin(0, 0).setScrollFactor(factor).setDepth(depth);

    layer(STAGE_TEXTURES.sky, 0, -100);
    layer(STAGE_TEXTURES.far, PARALLAX.far, -90);
    layer(STAGE_TEXTURES.mid, PARALLAX.mid, -80);
    this.fog = scene.add
      .tileSprite(0, 168, VIEW.width, 40, STAGE_TEXTURES.fog)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-75)
      .setAlpha(0.5);
    layer(STAGE_TEXTURES.near, PARALLAX.near, -70);
    layer(STAGE_TEXTURES.floor, 1, -20, 0, ARENA.groundY);

    for (const x of [0, ARENA.width - WALL_WIDTH]) {
      layer(STAGE_TEXTURES.wall, 1, -15, x, ARENA.groundY - WALL_HEIGHT);
    }

    this.barriers = [BARRIER_X, ARENA.width - BARRIER_X].map((x) =>
      scene.add
        .image(x, ARENA.groundY, STAGE_TEXTURES.barrier)
        .setOrigin(0.5, 1)
        .setDepth(-12),
    );

    for (const x of [PILLAR_X, ARENA.width - PILLAR_X]) {
      scene.add.image(x, ARENA.groundY, STAGE_TEXTURES.pillar).setOrigin(0.5, 1).setDepth(-14);
      scene.add
        .sprite(x, ARENA.groundY - PILLAR_HEIGHT + 2, STAGE_TEXTURES.flame(0))
        .setOrigin(0.5, 1)
        .setDepth(-13)
        .play(FLAME_ANIMATION);
    }
  }

  /**
   * @param {number} timeMs tiempo total de la escena
   * @param {number} scrollX posición horizontal de la cámara
   */
  update(timeMs, scrollX) {
    this.fog.tilePositionX = timeMs * 0.012 + scrollX * 0.4;
    const flicker = 0.55 + 0.25 * Math.sin(timeMs / 90);
    for (const barrier of this.barriers) barrier.setAlpha(flicker);
  }
}
