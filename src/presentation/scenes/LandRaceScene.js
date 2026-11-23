import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import {
  TREADMILL_RUNNER_X,
  LAND_RACE_LANES,
  LAND_RACE_LANE_SCALES,
} from '../../domain/race/treadmillRaceRules.js';
import { getRaceCameraDistance, getRaceRunnerX } from '../../domain/race/raceLanePresentation.js';
import landIdleGifUrl from '../../../art/source/sprites/results/male/orange/idle.gif?url';
import landPoseGifUrl from '../../../art/source/sprites/results/male/orange/pose.gif?url';
import landRunGifUrl from '../../../art/source/sprites/results/male/orange/run.gif?url';
import landDashGifUrl from '../../../art/source/sprites/results/male/orange/dash.gif?url';
import landJumpGifUrl from '../../../art/source/sprites/results/male/orange/jump.gif?url';
import landRollGifUrl from '../../../art/source/sprites/results/male/orange/roll.gif?url';
import redRaceIdleGifUrl from '../../../art/source/sprites/references/axem-red/idle.gif?url';
import redRaceWalkGifUrl from '../../../art/source/sprites/references/axem-red/walk.gif?url';
import redRaceRunGifUrl from '../../../art/source/sprites/references/axem-red/run.gif?url';
import redRaceDashGifUrl from '../../../art/source/sprites/references/axem-red/dash.gif?url';
import redRaceJumpGifUrl from '../../../art/source/sprites/references/axem-red/jump.gif?url';
import { resolveLandRaceAnimationSources } from '../../domain/race/landRaceAnimationRules.js';
import { PauseMenuView } from '../views/PauseMenuView.js';
import { STAGE_MAP_ASSETS, STAGE_TILESET_ASSETS } from '../../infrastructure/assets/stageAssetManifest.js';
import {
  resolveRaceCourseAssets,
  resolveRaceCourseObjects,
} from '../../infrastructure/assets/raceCourseAssets.js';
import {
  createLoopingMapTexture,
  createLoopingRaceTextures,
  createTilesetObjectTextures,
} from '../../infrastructure/graphics/StageAssetTextureFactory.js';
import { RACE_DISTANCE_OPTIONS, repeatCoursePattern } from '../../domain/race/raceCourseRules.js';
import { RaceSession } from '../../domain/race/RaceSession.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { genderForRanger } from '../../domain/rangers/rangerVariants.js';
import { spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';
import { playRaceMusic } from '../../infrastructure/audio/GameMusic.js';

const RUNNER_LANES = LAND_RACE_LANES;
const RUNNER_LANE_SCALES = LAND_RACE_LANE_SCALES;
const PLAYER_RUNNER_X = TREADMILL_RUNNER_X;
const LAND_OBJECT_SCALE = 0.14;
const LAND_RACE_LOOP_DISTANCE = 1200;
const RUNNER_FOOT_OFFSET = 13;
const COUNTDOWN_MS = 3000;
const STAMINA_MAX = 100;

export const LAND_RACE_OBSTACLES = Object.freeze([
  Object.freeze({ distance: 190, action: 'jump', type: 'hurdle' }),
  Object.freeze({ distance: 370, action: 'roll', type: 'roll-gate' }),
  Object.freeze({ distance: 555, action: 'jump', type: 'hurdle' }),
  Object.freeze({ distance: 745, action: 'roll', type: 'roll-gate' }),
  Object.freeze({ distance: 930, action: 'jump', type: 'hurdle' }),
  Object.freeze({ distance: 1080, action: 'jump', type: 'hurdle' }),
]);

const ACTION_DURATION_MS = Object.freeze({ jump: 680, roll: 650 });

export class LandRaceScene extends Phaser.Scene {
  constructor() {
    super('LandRaceScene');
  }

  create() {
    playRaceMusic(this, 'landRace');
    this.session = new RaceSession({ countdownDurationMs: COUNTDOWN_MS });

    const { maps: courseMaps, tilesets: raceTilesets } = resolveRaceCourseAssets(
      'terrestrial',
      STAGE_MAP_ASSETS,
      STAGE_TILESET_ASSETS,
    );
    this.courseObjectSpecs = resolveRaceCourseObjects('terrestrial', raceTilesets);
    this.courseObjectTextures = createTilesetObjectTextures(
      this,
      this.courseObjectSpecs,
      { prefix: 'land-course-object-' + this.game.loop.frame },
    );
    const mapKey = createLoopingMapTexture(this, courseMaps, {
      key: 'land-course-' + this.game.loop.frame,
      height: GAME_HEIGHT,
      cropTop: 240,
      cropHeight: 720,
    });
    const worldKeys = mapKey
      ? [mapKey]
      : createLoopingRaceTextures(this, raceTilesets, {
          prefix: 'land-world-' + this.game.loop.frame,
          trackTop: 146,
          seed: 601,
        });
    this.stageLayers = worldKeys.map((key, index) =>
      this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key)
        .setOrigin(0)
        .setDepth(-100 + index)
        .setAlpha(index === 0 ? 1 : 0.68),
    );

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
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      jumpArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      roll: Phaser.Input.Keyboard.KeyCodes.S,
      rollArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
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
    this.playerName = this.#text('J1 · AXEM NARANJA', 118, 34, '#ffc58e', 6);
    this.rivalName = this.#text('RIVAL · AXEM RED', 360, 34, '#ff9b9b', 6);
    this.status = this.#text('ELEGÍ LA DISTANCIA', GAME_WIDTH / 2, 120, '#fff0c9', 12);
    this.staminaLabel = this.#text('RESISTENCIA', GAME_WIDTH / 2, 70, '#b8e7f4', 5);
    this.distanceLabel = this.#text('0 / 0 M', GAME_WIDTH / 2, 50, '#e7dcff', 5);
    this.pauseMenu = new PauseMenuView(this, {
      onResume: () => this.#resume(),
      onReturnToMenu: () => this.scene.start('MenuScene'),
      onSelectDistance: (distance) => this.#startRace(distance),
      distanceOptions: RACE_DISTANCE_OPTIONS,
      controlsTitle: 'CONTROLES · CARRERA TERRESTRE',
      controls: [
        'D / → · CORRER',
        'A / ← · FRENAR',
        'W / ↑ · SALTAR',
        'S / ↓ · RODAR',
        'RECOGÉ ENERGÍA PARA RECUPERAR RESISTENCIA',
        'AL FINAL · ENTER MENÚ · R REPETIR',
        'ESC · VOLVER AL MENÚ',
      ],
    });
    this.pauseMenu.showDistanceSelection();
  }

  #startRace(distance) {
    this.finishDistance = distance;
    this.distance = 0;
    this.obstacles = this.#generateRaceObstacles();
    this.pickups = this.#generateRacePickups();
    this.session.start(distance, COUNTDOWN_MS);
    this.pauseMenu.hide();
    this.player = this.#createRacer(RANGER_IDS.ORANGE, RUNNER_LANES[0], true);
    this.rival = this.#createRacer(RANGER_IDS.ORANGE, RUNNER_LANES[1], false);
    // Ambos arrancan exactamente sobre la misma línea; la distancia solo mueve la cinta.
    this.player.distance = 0;
    this.rival.distance = 0;
    this.runners = [this.player, this.rival];
    this.#createTrackObjects();
    this.status.setText('3').setFontSize(24);
    this.distanceLabel.setText('0 / ' + Math.round(distance) + ' M');
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
    if (Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
        Phaser.Input.Keyboard.JustDown(this.keys.jumpArrow)) {
      this.#startAction(this.player, 'jump');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.roll) ||
        Phaser.Input.Keyboard.JustDown(this.keys.rollArrow)) {
      this.#startAction(this.player, 'roll');
    }

    this.#advanceRacer(this.player, delta, { accelerate, brake });
    this.#advanceRacer(this.rival, delta, null);
    this.distance = this.player.distance;
    this.#updateEnvironment();
    this.#syncRacer(this.player);
    this.#syncRacer(this.rival);
    this.#syncTrackObjects(this.player);
    this.#syncTrackObjects(this.rival);
    this.#syncPickups();
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
    this.playerName?.setVisible(false);
    this.rivalName?.setVisible(false);
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
    this.playerName?.setVisible(true);
    this.rivalName?.setVisible(true);
  }

  #runnerX(racer) {
    const playerDistance = this.player?.distance ?? 0;
    const cameraDistance = getRaceCameraDistance(
      playerDistance,
      PLAYER_RUNNER_X,
      132,
      LAND_OBJECT_SCALE,
    );
    return Phaser.Math.Clamp(
      getRaceRunnerX(PLAYER_RUNNER_X, racer.distance, cameraDistance, LAND_OBJECT_SCALE),
      38,
      132,
    );
  }

  #createRacer(rangerId, laneY, isPlayer) {
    const idleKey = spriteKeyFor(rangerId, genderForRanger(rangerId));
    const laneIndex = RUNNER_LANES.indexOf(laneY);
    const laneScale = RUNNER_LANE_SCALES[Math.max(0, laneIndex)];
    const runnerX = PLAYER_RUNNER_X;
    const sprite = this.add.sprite(runnerX, laneY + RUNNER_FOOT_OFFSET, idleKey)
      .setOrigin(0.5, 1)
      .setScale(laneScale)
      .setDepth(42 + laneIndex);
    const shadow = this.add.ellipse(runnerX, laneY + RUNNER_FOOT_OFFSET, 34, 6, 0x241b2a, 0.52)
      .setScale(laneScale)
      .setDepth(31 + laneIndex);

    const animationSources = resolveLandRaceAnimationSources(
      isPlayer ? 'orange' : 'red',
      isPlayer
        ? {
          idle: landIdleGifUrl,
          pose: landPoseGifUrl,
          run: landRunGifUrl,
          dash: landDashGifUrl,
          jump: landJumpGifUrl,
          roll: landRollGifUrl,
        }
        : {
          idle: redRaceIdleGifUrl,
          walk: redRaceWalkGifUrl,
          run: redRaceRunGifUrl,
          dash: redRaceDashGifUrl,
          jump: redRaceJumpGifUrl,
        },
    );
    const racerName = isPlayer ? 'Axem Naranja' : 'Axem Red';
    const racerGif = this.add.dom(runnerX, laneY - 28).createFromHTML(
      '<img src="' + animationSources.idle + '" alt="' + racerName + '" style="width:48px;height:68px;object-fit:contain;image-rendering:pixelated;pointer-events:none;">',
    ).setScale(laneScale).setDepth(44 + laneIndex);
    const racer = {
      rangerId,
      gender: genderForRanger(rangerId),
      animationSources,
      gif: racerGif,
      laneY,
      laneIndex,
      laneScale,
      isPlayer,
      sprite,
      shadow,
      distance: 0,
      stamina: STAMINA_MAX,
      mode: null,
      actionMode: null,
      actionDurationMs: 0,
      actionElapsedMs: 0,
      actionRemainingMs: 0,
      stumbleMs: 0,
      obstacleIndex: 0,
      obstacleSprites: [],
      obstacleLabels: [],
    };
    this.#setMode(racer, 'idle');
    return racer;
  }


  #generateRaceObstacles() {
    return repeatCoursePattern(LAND_RACE_OBSTACLES, this.finishDistance, {
      cycleDistance: LAND_RACE_LOOP_DISTANCE,
      finishPadding: 90,
    });
  }

  #generateRacePickups() {
    return repeatCoursePattern([
      { distance: 280, kind: 'stamina' },
      { distance: 760, kind: 'stamina' },
      { distance: 1060, kind: 'stamina' },
    ], this.finishDistance, {
      cycleDistance: LAND_RACE_LOOP_DISTANCE,
      finishPadding: 35,
    }).map((pickup) => ({ ...pickup, collected: false }));
  }

  #createTrackObjects() {
    for (const racer of this.runners) {
      const runnerX = this.#runnerX(racer);
      racer.obstacleSprites = this.obstacles.map((obstacle) =>
        this.add.image(runnerX, racer.laneY, this.courseObjectTextures[obstacle.type])
          .setScale(racer.laneScale * (obstacle.type === 'hurdle' ? 0.62 : 0.5))
          .setDepth(34 + racer.laneIndex),
      );
      racer.obstacleLabels = this.obstacles.map((obstacle) => {
        const definition = this.courseObjectSpecs.find(({ id }) => id === obstacle.type);
        const isJump = definition?.action === 'jump';
        const instruction = (isJump ? '↑ ' : '↓ ') + (definition?.instruction ?? 'OBSTÁCULO');
        return this.add.text(runnerX, racer.laneY - 18, instruction, {
          fontFamily: 'monospace',
          fontSize: '7px',
          fontStyle: 'bold',
          color: isJump ? '#ffdc8b' : '#a8eeff',
          backgroundColor: '#10131d',
          padding: { left: 3, right: 3, top: 1, bottom: 1 },
          stroke: '#10131d',
          strokeThickness: 2,
          align: 'center',
        }).setOrigin(0.5).setDepth(48 + racer.laneIndex);
      });
    }
    this.pickupSprites = this.pickups.map(() =>
      this.add.image(PLAYER_RUNNER_X, this.player.laneY - 27, this.courseObjectTextures.stamina)
        .setTint(0x9eeeff)
        .setDepth(38),
    );
  }

  #syncTrackObjects(racer) {
    const runnerX = this.#runnerX(racer);
    racer.obstacleSprites.forEach((sprite, index) => {
      const obstacle = this.obstacles[index];
      const x = runnerX + (obstacle.distance - racer.distance) * LAND_OBJECT_SCALE;
      const y = racer.laneY + RUNNER_FOOT_OFFSET -
        (obstacle.action === 'jump' ? 8 : 4);
      const visible = index >= racer.obstacleIndex && x > -36 && x < GAME_WIDTH + 36;
      const obstacleScale = obstacle.type === 'hurdle' ? 0.62 : 0.5;
      sprite.setPosition(x, y)
        .setScale(racer.laneScale * obstacleScale)
        .setDepth(34 + racer.laneIndex)
        .setVisible(visible);
      racer.obstacleLabels[index]
        ?.setPosition(x, y - 24)
        .setDepth(48 + racer.laneIndex)
        .setVisible(visible);
    });
  }

  #syncPickups() {
    this.pickups.forEach((pickup, index) => {
      const sprite = this.pickupSprites[index];
      if (pickup.collected) {
        sprite.setVisible(false);
        return;
      }
      const playerX = this.#runnerX(this.player);
      const x = playerX + (pickup.distance - this.player.distance) * LAND_OBJECT_SCALE;
      sprite.setPosition(x, this.player.laneY - 27)
        .setDepth(38 + this.player.laneIndex)
        .setScale(this.player.laneScale * 0.72)
        .setVisible(x > -24 && x < GAME_WIDTH + 24);
      if (Math.abs(x - playerX) < 14) {
        pickup.collected = true;
        sprite.setVisible(false);
        this.player.stamina = Math.min(STAMINA_MAX, this.player.stamina + 30);
      }
    });
  }

  #updateEnvironment() {
    this.stageLayers.forEach((layer, index) => {
      layer.tilePositionX = this.distance * (index === 0 ? 0.12 : 0.28);
    });

  }


  #setMode(racer, mode) {
    if (racer.mode === mode) return;
    const image = racer.gif?.node?.querySelector('img');
    if (image && racer.animationSources?.[mode]) image.src = racer.animationSources[mode];
    racer.sprite.stop();
    racer.sprite.setVisible(false);
    racer.mode = mode;
  }

  #startAction(racer, action) {
    if (racer.actionRemainingMs > 0 || racer.stumbleMs > 0 || this.session.finished) return;
    const duration = ACTION_DURATION_MS[action];
    if (!duration) return;

    racer.actionMode = action;
    racer.actionDurationMs = duration;
    racer.actionElapsedMs = 0;
    racer.actionRemainingMs = duration;
    this.#setMode(racer, action);
  }

  #advanceRacer(racer, delta, controls) {
    const previousDistance = racer.distance;
    const isPlayer = racer.isPlayer;
    const accelerate = Boolean(controls?.accelerate && !controls?.brake);
    const brake = Boolean(controls?.brake && !controls?.accelerate);

    if (!isPlayer) {
      const nextObstacle = this.obstacles[racer.obstacleIndex];
      if (nextObstacle && nextObstacle.distance - racer.distance <= 92 &&
          nextObstacle.distance > racer.distance && racer.actionRemainingMs <= 0 &&
          racer.stumbleMs <= 0) {
        this.#startAction(racer, nextObstacle.action);
      }
    }

    if (racer.actionRemainingMs > 0) {
      racer.actionElapsedMs += delta;
      racer.actionRemainingMs = Math.max(0, racer.actionRemainingMs - delta);
      if (racer.actionRemainingMs === 0) {
        racer.actionMode = null;
        const nextMode = isPlayer ? (accelerate ? 'run' : 'walk') : 'run';
        if (racer.stumbleMs <= 0) this.#setMode(racer, nextMode);
      }
    }

    if (racer.stumbleMs > 0) {
      racer.stumbleMs = Math.max(0, racer.stumbleMs - delta);
      if (racer.stumbleMs === 0) this.#setMode(racer, isPlayer && !accelerate ? 'walk' : 'run');
    }

    let speed;
    if (isPlayer) {
      if (accelerate && racer.stamina > 0) {
        speed = 208;
        racer.stamina = Math.max(0, racer.stamina - 29 * delta / 1000);
      } else {
        speed = brake ? 88 : 143;
        racer.stamina = Math.min(STAMINA_MAX, racer.stamina + 21 * delta / 1000);
      }
      if (racer.stumbleMs > 0) speed = 66;
      if (racer.actionMode === 'roll') speed *= 0.88;
      if (racer.stumbleMs <= 0 && racer.actionRemainingMs <= 0) {
        this.#setMode(racer, accelerate && racer.stamina > 0 ? 'dash' : 'run');
      }
    } else {
      speed = 164 + Math.sin(this.time.now / 510) * 5;
      if (racer.stumbleMs > 0) speed = 69;
      if (racer.actionMode === 'roll') speed *= 0.92;
      if (racer.stumbleMs <= 0 && racer.actionRemainingMs <= 0) this.#setMode(racer, 'run');
      racer.stamina = Math.min(STAMINA_MAX, racer.stamina + 8 * delta / 1000);
    }

    racer.distance = Math.min(this.finishDistance, racer.distance + speed * delta / 1000);

    const obstacle = this.obstacles[racer.obstacleIndex];
    if (obstacle && previousDistance < obstacle.distance && racer.distance >= obstacle.distance) {
      const cleared = racer.actionMode === obstacle.action && racer.actionRemainingMs > 0;
      if (cleared) {
        racer.stamina = Math.min(STAMINA_MAX, racer.stamina + 8);
      } else {
        racer.stumbleMs = 620;
        racer.stamina = Math.max(0, racer.stamina - 8);
        this.#setMode(racer, 'walk');
      }
      racer.obstacleSprites[racer.obstacleIndex]?.setVisible(false);
      racer.obstacleLabels[racer.obstacleIndex]?.setVisible(false);
      racer.obstacleIndex += 1;
    }

  }

  #syncRacer(racer) {
    const x = this.#runnerX(racer);
    const groundY = racer.laneY + RUNNER_FOOT_OFFSET;
    const runPhase = racer.distance / 16;
    const movingBob = racer.mode === 'run' || racer.mode === 'walk' || racer.mode === 'dash'
      ? Math.abs(Math.sin(runPhase)) * 2.2
      : 0;
    let lift = 0;
    if (racer.actionMode === 'jump' && racer.actionDurationMs > 0) {
      const progress = Phaser.Math.Clamp(racer.actionElapsedMs / racer.actionDurationMs, 0, 1);
      lift = Math.sin(progress * Math.PI) * 27;
    }

    racer.sprite.setPosition(Math.round(x), Math.round(groundY - lift - movingBob))
      .setDepth(42 + racer.laneIndex)
      .setScale(racer.laneScale * (racer.actionMode === 'roll' ? 0.9 : 1));
    racer.gif?.setPosition(Math.round(x), Math.round(groundY - lift - movingBob - 31))
      .setDepth(44 + racer.laneIndex)
      .setScale(racer.laneScale);
    racer.shadow.setPosition(Math.round(x), groundY + 1);
    racer.shadow.setScale(racer.laneScale * (1 - lift / 90), racer.laneScale);
    const poseScale = racer.actionMode === 'roll'
      ? 0.9
      : (racer.mode === 'run' || racer.mode === 'walk' ? 0.82 : 0.9);
    racer.sprite.setScale(racer.laneScale * poseScale, racer.laneScale * (racer.actionMode === 'roll' ? 0.68 : 1));
  }

  #drawHud() {
    this.hudGraphics.clear();
    const drawProgress = (x, y, width, distance, color) => {
      this.hudGraphics.fillStyle(0x101626, 0.95).fillRect(x, y, width, 4);
      this.hudGraphics.fillStyle(color, 1).fillRect(x + 1, y + 1,
        Math.round((width - 2) * Phaser.Math.Clamp(distance / this.finishDistance, 0, 1)), 2);
    };
    drawProgress(26, 42, 122, this.player.distance, 0xf0a064);
    drawProgress(332, 42, 122, this.rival.distance, 0xf06464);
    this.distanceLabel.setText(Math.floor(this.player.distance) + ' / ' + this.finishDistance + ' M');
    this.hudGraphics.fillStyle(0x121c2c, 1).fillRect(193, 77, 94, 5);
    this.hudGraphics.fillStyle(0x72c9e7, 1).fillRect(194, 78,
      Math.round(92 * this.player.stamina / STAMINA_MAX), 3);
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
