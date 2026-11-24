import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { TREADMILL_RUNNER_X } from '../../domain/race/treadmillRaceRules.js';
import {
  LAND_RACE_LANE_Y,
  LAND_RACE_LANE_SCALE,
  LAND_RACE_RUNNER_X_BOUNDS,
  clampLandRaceRunnerX,
  LAND_RACE_WORLD_SCALE,
} from '../../domain/race/landRaceTrackRules.js';
import { getRaceCameraDistance, getRaceRunnerX } from '../../domain/race/raceLanePresentation.js';
import landIdleGifUrl from '../../../art/source/sprites/results/male/orange/idle.gif?url';
import landPoseGifUrl from '../../../art/source/sprites/results/male/orange/pose.gif?url';
import landRunGifUrl from '../../../art/source/sprites/results/male/orange/run.gif?url';
import landDashGifUrl from '../../../art/source/sprites/results/male/orange/dash.gif?url';
import redRaceIdleGifUrl from '../../../art/source/sprites/references/axem-red/idle.gif?url';
import redRaceWalkGifUrl from '../../../art/source/sprites/references/axem-red/walk.gif?url';
import redRaceRunGifUrl from '../../../art/source/sprites/references/axem-red/run.gif?url';
import redRaceDashGifUrl from '../../../art/source/sprites/references/axem-red/dash.gif?url';
import { resolveLandRaceAnimationSources } from '../../domain/race/landRaceAnimationRules.js';
import { PauseMenuView } from '../views/PauseMenuView.js';
import { STAGE_MAP_ASSETS } from '../../infrastructure/assets/stageAssetManifest.js';
import { resolveRaceCourseAssets } from '../../infrastructure/assets/raceCourseAssets.js';

import { createLoopingMapTexture } from '../../infrastructure/graphics/StageAssetTextureFactory.js';
import { RaceSession } from '../../domain/race/RaceSession.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { genderForRanger } from '../../domain/rangers/rangerVariants.js';
import { spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';
import { playRaceMusic } from '../../infrastructure/audio/GameMusic.js';

const PLAYER_RUNNER_X = TREADMILL_RUNNER_X;
const LAND_OBJECT_SCALE = LAND_RACE_WORLD_SCALE;
const RUNNER_FOOT_OFFSET = 13;
const COUNTDOWN_MS = 3000;
const STAMINA_MAX = 100;


export class LandRaceScene extends Phaser.Scene {
  constructor() {
    super('LandRaceScene');
  }

  create() {
    playRaceMusic(this, 'landRace');
    this.session = new RaceSession({ countdownDurationMs: COUNTDOWN_MS });

    const courseAssets = resolveRaceCourseAssets('terrestrial', STAGE_MAP_ASSETS);
    const courseTexturePrefix = 'land-course-' + this.game.loop.frame;
    const mapKey = createLoopingMapTexture(this, courseAssets.maps, { key: courseTexturePrefix + '-desert', height: GAME_HEIGHT });
    if (!mapKey) throw new Error('No se pudo cargar desert.png para Carrera Terrestre.');
    this.stageLayers = [{ layer: this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, mapKey).setOrigin(0).setDepth(-100), factor: LAND_RACE_WORLD_SCALE }];
    this.distance = 0;
    this.finishDistance = 0;
    this.player = null;
    this.rival = null;
    this.runners = [];

    this.keys = this.input.keyboard.addKeys({
      accelerate: Phaser.Input.Keyboard.KeyCodes.D,
      accelerateArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      brake: Phaser.Input.Keyboard.KeyCodes.A,
      brakeArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
    });
    this.pauseNavigationKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });

    this.hudGraphics = this.add.graphics().setDepth(80);
    this.status = this.#text('ELEGÍ LA DISTANCIA', GAME_WIDTH / 2, 120, '#fff0c9', 12);
    this.staminaLabel = this.#text('RESISTENCIA', 62, 245, '#b8e7f4', 6);
    this.pauseMenu = new PauseMenuView(this, {
      onResume: () => this.#resume(),
      onReturnToMenu: () => this.scene.start('MenuScene'),
      onSelectDistance: null,
      distanceOptions: [],
      controlsTitle: 'CONTROLES · CARRERA TERRESTRE',
      controls: [
        'D / → · CORRER',
        'A / ← · FRENAR',
        'AL FINAL · ENTER MENÚ · R REPETIR',
        'ESC · VOLVER AL MENÚ',
      ],
    });
    this.#startRace(5000);
  }

  #startRace(distance) {
    this.finishDistance = distance;
    this.distance = 0;
    this.session.start(distance, COUNTDOWN_MS);
    this.pauseMenu.hide();
    this.player = this.#createRacer(RANGER_IDS.ORANGE, true);
    this.rival = this.#createRacer(RANGER_IDS.ORANGE, false);
    // Ambos arrancan exactamente sobre la misma línea; la distancia solo mueve la cinta.
    this.player.distance = 0;
    this.rival.distance = 0;
    this.runners = [this.player, this.rival];
    this.status.setText('3').setFontSize(24);
    this.#drawHud();
  }

  update(_time, delta) {
    if (this.session.selectingDistance) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
        this.scene.start('MenuScene');
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.pauseNavigationKeys.up)) this.pauseMenu.moveSelection(-1);
      if (Phaser.Input.Keyboard.JustDown(this.pauseNavigationKeys.down)) this.pauseMenu.moveSelection(1);
      if (Phaser.Input.Keyboard.JustDown(this.pauseNavigationKeys.enter)) this.pauseMenu.activateSelection();
      return;
    }

    if (this.session.paused) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.pause)) {
        this.#resume();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
        if (this.pauseMenu.showingControls) this.pauseMenu.showMenu();
        else this.#resume();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.pauseNavigationKeys.up)) this.pauseMenu.moveSelection(-1);
      if (Phaser.Input.Keyboard.JustDown(this.pauseNavigationKeys.down)) this.pauseMenu.moveSelection(1);
      if (Phaser.Input.Keyboard.JustDown(this.pauseNavigationKeys.enter)) this.pauseMenu.activateSelection();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.scene.start('MenuScene');
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.pause)) {
      this.#openPause();
      return;
    }

    if (this.session.finished) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.scene.start('MenuScene');
      if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) this.scene.restart();
      return;
    }

    if (this.session.countdownMs > 0) {
      this.session.advanceCountdown(delta);
      const count = Math.ceil(this.session.countdownMs / 1000);
      this.status.setText(count ? String(count) : '¡YA!');
      if (this.session.countdownMs === 0) {
        this.time.delayedCall(500, () => {
          if (!this.session.finished && this.status.active) this.status.setText('');
        });
      }
      this.#drawHud();
      return;
    }

    const accelerate = this.keys.accelerate.isDown || this.keys.accelerateArrow.isDown;
    const brake = this.keys.brake.isDown || this.keys.brakeArrow.isDown;

    this.#advanceRacer(this.player, delta, { accelerate, brake });
    this.#advanceRacer(this.rival, delta, null);
    this.distance = this.player.distance;
    this.#updateEnvironment();
    this.#syncRacer(this.player);
    this.#syncRacer(this.rival);
    this.#drawHud();

    if (this.player.distance >= this.finishDistance || this.rival.distance >= this.finishDistance) {
      this.#finish(this.player.distance >= this.rival.distance);
    }
  }

  #openPause() {
    if (this.session.paused) return;
    this.session.pause();
    this.tweens.pauseAll();
    this.anims.pauseAll();
    this.runners.forEach((racer) => {
      racer.gif?.setVisible(false);
      if (racer.gif?.node) racer.gif.node.style.visibility = 'hidden';
      racer.sprite?.setVisible(false);
      racer.shadow?.setVisible(false);
    });
    this.pauseMenu.showMenu();
  }

  #resume() {
    if (!this.session.paused) return;
    this.session.resume();
    this.pauseMenu.hide();
    this.tweens.resumeAll();
    this.anims.resumeAll();
    this.runners.forEach((racer) => {
      racer.gif?.setVisible(true);
      if (racer.gif?.node) racer.gif.node.style.visibility = '';
      racer.shadow?.setVisible(true);
    });
  }

  #runnerX(racer) {
    const playerDistance = this.player?.distance ?? 0;
    const cameraDistance = getRaceCameraDistance(
      playerDistance,
      PLAYER_RUNNER_X,
      LAND_RACE_RUNNER_X_BOUNDS.max,
      LAND_OBJECT_SCALE,
    );
    const screenX = getRaceRunnerX(
      PLAYER_RUNNER_X,
      racer.distance,
      cameraDistance,
      LAND_OBJECT_SCALE,
    );
    return clampLandRaceRunnerX(screenX + racer.visualOffset) - racer.visualOffset;
  }

  #createRacer(rangerId, isPlayer) {
    const idleKey = spriteKeyFor(rangerId, genderForRanger(rangerId));
    const laneY = LAND_RACE_LANE_Y;
    const laneScale = LAND_RACE_LANE_SCALE;
    const visualOffset = isPlayer ? -11 : 11;
    const runnerX = PLAYER_RUNNER_X + visualOffset;
    const groundY = laneY + RUNNER_FOOT_OFFSET;
    const sprite = this.add.sprite(runnerX, groundY, idleKey)
      .setOrigin(0.5, 1)
      .setScale(laneScale)
      .setDepth(42);
    const shadow = this.add.ellipse(runnerX, groundY + 1, 34, 6, 0x241b2a, 0.52)
      .setScale(laneScale)
      .setDepth(31);

    const animationSources = resolveLandRaceAnimationSources(
      isPlayer ? 'orange' : 'red',
      isPlayer
        ? {
          idle: landIdleGifUrl,
          pose: landPoseGifUrl,
          run: landRunGifUrl,
          dash: landDashGifUrl,
        }
        : {
          idle: redRaceIdleGifUrl,
          walk: redRaceWalkGifUrl,
          run: redRaceRunGifUrl,
          dash: redRaceDashGifUrl,
        },
    );
    const racerName = isPlayer ? 'Axem Naranja' : 'Axem Red';
    const racerGif = this.add.dom(runnerX, groundY - 16).createFromHTML(
      '<img src="' + animationSources.idle + '" data-animation="idle" alt="' + racerName + '" style="width:84px;height:56px;object-fit:contain;image-rendering:pixelated;pointer-events:none;">',
    ).setScale(laneScale).setDepth(44);
    const racer = {
      rangerId,
      gender: genderForRanger(rangerId),
      animationSources,
      gif: racerGif,
      laneY,
      laneScale,
      isPlayer,
      visualOffset,
      sprite,
      shadow,
      distance: 0,
      stamina: STAMINA_MAX,
      mode: null,
    };
    this.#setMode(racer, 'idle');
    return racer;
  }


  #updateEnvironment() {
    const cameraDistance = getRaceCameraDistance(
      this.distance,
      PLAYER_RUNNER_X,
      LAND_RACE_RUNNER_X_BOUNDS.max,
      LAND_OBJECT_SCALE,
    );
    this.stageLayers.forEach(({ layer, factor }) => {
      layer.tilePositionX = cameraDistance * factor;
    });

  }


  #setMode(racer, mode) {
    if (racer.mode === mode) return;
    const image = racer.gif?.node?.querySelector('img');
    if (image && racer.animationSources?.[mode]) {
      image.src = racer.animationSources[mode];
      image.dataset.animation = mode;
    }
    racer.sprite.stop();
    racer.sprite.setVisible(false);
    racer.mode = mode;
  }

  #advanceRacer(racer, delta, controls) {
    const isPlayer = racer.isPlayer;
    const accelerate = Boolean(controls?.accelerate && !controls?.brake);
    const brake = Boolean(controls?.brake && !controls?.accelerate);

    let speed;
    if (isPlayer) {
      if (accelerate && racer.stamina > 0) {
        speed = 208;
        racer.stamina = Math.max(0, racer.stamina - 29 * delta / 1000);
      } else {
        speed = brake ? 88 : 143;
        racer.stamina = Math.min(STAMINA_MAX, racer.stamina + 21 * delta / 1000);
      }
      this.#setMode(racer, accelerate && racer.stamina > 0 ? 'dash' : (brake ? 'walk' : 'run'));
    } else {
      speed = 164 + Math.sin(this.time.now / 510) * 5;
      racer.stamina = Math.min(STAMINA_MAX, racer.stamina + 8 * delta / 1000);
      this.#setMode(racer, 'run');
    }

    racer.distance = Math.min(this.finishDistance, racer.distance + speed * delta / 1000);
  }

  #syncRacer(racer) {
    const x = this.#runnerX(racer) + racer.visualOffset;
    const groundY = racer.laneY + RUNNER_FOOT_OFFSET;
    const runPhase = racer.distance / 16;
    const movingBob = racer.mode === 'run' || racer.mode === 'walk' || racer.mode === 'dash'
      ? Math.abs(Math.sin(runPhase)) * 2.2
      : 0;

    racer.sprite.setPosition(Math.round(x), Math.round(groundY - movingBob))
      .setDepth(42)
      .setScale(racer.laneScale * 0.82);
    racer.gif?.setPosition(Math.round(x), Math.round(groundY - movingBob - 16))
      .setDepth(44)
      .setScale(racer.laneScale);
    racer.shadow.setPosition(Math.round(x), groundY + 1)
      .setScale(racer.laneScale);
  }

  #drawHud() {
    this.hudGraphics.clear();
    this.hudGraphics.fillStyle(0x07131b, 0.92).fillRoundedRect(10, 238, 104, 27, 4);
    this.hudGraphics.lineStyle(1, 0x5baec2, 0.85).strokeRoundedRect(10, 238, 104, 27, 4);
    this.hudGraphics.fillStyle(0x121c2c, 1).fillRoundedRect(18, 256, 88, 5, 2);
    this.hudGraphics.fillStyle(0x72c9e7, 1).fillRoundedRect(
      19,
      257,
      Math.round(86 * this.player.stamina / STAMINA_MAX),
      3,
      1,
    );
  }

  #finish(playerWon) {
    this.session.finish({ playerWon });
    this.status.setText(playerWon ? '¡J1 GANA LA CARRERA!' : '¡GANA AXEM RED!')
      .setFontSize(11)
      .setColor('#fff0c9');
    this.player.sprite.setTint(playerWon ? 0xffffff : 0xb8aebd);
    this.rival.sprite.setTint(playerWon ? 0xb8aebd : 0xffffff);
    this.cameras.main.flash(170, 255, 245, 218);
  }

  #text(value, x, y, color, size) {
    return this.add.text(x, y, value, {
      fontFamily: 'monospace',
      fontSize: size + 'px',
      color,
      stroke: '#111423',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setDepth(90);
  }
}
