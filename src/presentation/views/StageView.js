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
  [STAGE_IDS.RUINS]: { hazeAlpha: 0.035, barrierBaseAlpha: 0.55, flicker: 0.08 },
  [STAGE_IDS.VOLCANO]: { hazeAlpha: 0.025, barrierBaseAlpha: 0.7, flicker: 0.1 },
  [STAGE_IDS.FOREST]: { hazeAlpha: 0.03, barrierBaseAlpha: 0.45, flicker: 0.06 },
  [STAGE_IDS.SANCTUARY]: { hazeAlpha: 0.02, barrierBaseAlpha: 0.62, flicker: 0.07 },
  [STAGE_IDS.DOWNTOWN]: { hazeAlpha: 0.018, barrierBaseAlpha: 0.4, flicker: 0.03 },
  [STAGE_IDS.MEADOW]: { hazeAlpha: 0.012, barrierBaseAlpha: 0.3, flicker: 0.02 },
  [STAGE_IDS.VOLCANO_MOUTH]: { hazeAlpha: 0.08, barrierBaseAlpha: 0.78, flicker: 0.16 },
};

/** Construye el escenario seleccionado o un fondo plano para el entrenamiento. */
export class StageView {
  /** @param {Phaser.Scene} scene @param {string} [stageId] @param {{ backgroundColor?: string | null, cinematic?: boolean }} [options] */
  constructor(scene, stageId = STAGE_IDS.RUINS, { backgroundColor = null, cinematic = false } = {}) {
    this.scene = scene;
    this.solidBackground = typeof backgroundColor === 'string' && /^#[\da-f]{6}$/i.test(backgroundColor)
      ? backgroundColor
      : null;
    this.parallaxLayers = [];

    if (this.solidBackground) {
      const color = Number.parseInt(this.solidBackground.slice(1), 16);
      scene.add.rectangle(0, 0, VIEW.width, VIEW.height, color, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-100);
      return;
    }

    this.stageId = STAGE_VISUALS[stageId] ? stageId : STAGE_IDS.RUINS;
    this.textures = getStageTextures(this.stageId);
    this.visuals = STAGE_VISUALS[this.stageId];

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
    // Las cinemáticas priorizan lectura y composición: sin niebla móvil ni capa de ruido en primer plano.
    if (!cinematic) {
      this.fog = scene.add
        .tileSprite(0, 168, VIEW.width, 40, this.textures.fog)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-75)
        .setAlpha(this.visuals.hazeAlpha);
      layer(this.textures.near, PARALLAX.near, -70);
    }
    layer(this.textures.floor, 1, -20, 0, ARENA.groundY);

    const usesStageSetPieces = [
      STAGE_IDS.DOWNTOWN,
      STAGE_IDS.MEADOW,
      STAGE_IDS.VOLCANO_MOUTH,
    ].includes(this.stageId);
    this.barriers = [];
    if (!usesStageSetPieces) {
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
    this.warningMarker = null;
  }

  handleEvents(events = []) {
    if (this.stageId !== STAGE_IDS.VOLCANO_MOUTH) return;

    for (const event of events) {
      if (event.type === 'hazard-warning') this.#showVentWarning(event);
      if (event.type === 'hazard-erupt') this.#eruptVent(event);
      if (event.type === 'hazard-end') {
        this.warningMarker?.destroy();
        this.warningMarker = null;
      }
    }
  }

  #showVentWarning(event) {
    this.warningMarker?.destroy();
    const marker = this.scene.add
      .ellipse(event.x, ARENA.groundY - 3, event.radiusX * 2, 12, 0xff6a24, 0.28)
      .setStrokeStyle(2, 0xffce70, 0.92)
      .setDepth(460);
    this.warningMarker = marker;
    this.scene.tweens.add({
      targets: marker,
      alpha: { from: 0.28, to: 0.88 },
      scaleX: { from: 0.94, to: 1.08 },
      duration: 190,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  #eruptVent(event) {
    this.warningMarker?.destroy();
    this.warningMarker = null;

    const plume = this.scene.add
      .ellipse(event.x, ARENA.groundY - 42, 30, 90, 0xff581b, 0.96)
      .setDepth(520)
      .setScale(0.8, 0.08);
    const core = this.scene.add
      .ellipse(event.x, ARENA.groundY - 35, 12, 66, 0xffd36a, 0.96)
      .setDepth(521)
      .setScale(0.8, 0.08);
    this.scene.tweens.add({
      targets: [plume, core],
      scaleY: 1,
      alpha: 0,
      duration: 560,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        plume.destroy();
        core.destroy();
      },
    });

    for (let i = 0; i < 9; i++) {
      const offset = i - 4;
      const rock = this.scene.add
        .rectangle(event.x + offset * 3, ARENA.groundY - 10, 4 + (i % 3), 4 + (i % 2), i % 2 ? 0xff812b : 0xffd16b)
        .setDepth(530)
        .setRotation(offset * 0.2);
      const targetX = event.x + offset * 12;
      const peakY = ARENA.groundY - 44 - (i % 4) * 13;
      this.scene.tweens.add({
        targets: rock,
        x: targetX,
        y: peakY,
        angle: offset * 100,
        duration: 180 + (i % 3) * 35,
        ease: 'Quad.easeOut',
        onComplete: () => this.scene.tweens.add({
          targets: rock,
          y: ARENA.groundY - 4,
          alpha: 0,
          duration: 290,
          ease: 'Quad.easeIn',
          onComplete: () => rock.destroy(),
        }),
      });
    }
  }

  update(timeMs, scrollX) {
    if (this.solidBackground) return;

    for (const { image, factor, originX } of this.parallaxLayers) {
      image.setX(Math.round(originX - scrollX * factor));
    }
    if (this.fog) this.fog.tilePositionX = Math.round(timeMs * 0.012 + scrollX * 0.4);
    const flicker = this.visuals.barrierBaseAlpha + this.visuals.flicker * (0.5 + 0.5 * Math.sin(timeMs / 90));
    for (const barrier of this.barriers) barrier.setAlpha(flicker);
  }
}
