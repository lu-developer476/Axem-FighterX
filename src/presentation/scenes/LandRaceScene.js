import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { TREADMILL_RUNNER_X } from '../../domain/race/treadmillRaceRules.js';
import {
  LAND_RACE_LANE_Y,
  LAND_RACE_LANE_SCALE,
  LAND_RACE_RUNNER_X_BOUNDS,
  clampLandRaceRunnerX,
  getLandRaceGapJumpProgress,
  LAND_RACE_WORLD_SCALE,
  LAND_RACE_GAP_TRIGGER_DISTANCE,
  LAND_RACE_GAP_JUMP_DURATION_MS,
  LAND_RACE_GAP_FALL_DURATION_MS,
  createLandRaceObstacles,
} from '../../domain/race/landRaceTrackRules.js';
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
import { STAGE_TILESET_ASSETS } from '../../infrastructure/assets/stageAssetManifest.js';
import { resolveRaceCourseAssets } from '../../infrastructure/assets/raceCourseAssets.js';
import { LAND_RACE_OBJECT_SPECS, RACE_COURSE_ENVIRONMENT, RACE_COURSE_ENVIRONMENT_LAYOUT } from '../../infrastructure/assets/raceCourseEnvironment.js';
import {
  createLoopingMapTexture,
  createTilesetEnvironmentSprites,
  createTilesetObjectTextures,
} from '../../infrastructure/graphics/StageAssetTextureFactory.js';
import { RACE_DISTANCE_OPTIONS, repeatCoursePattern } from '../../domain/race/raceCourseRules.js';
import { RaceSession } from '../../domain/race/RaceSession.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { genderForRanger } from '../../domain/rangers/rangerVariants.js';
import { spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';
import { playRaceMusic } from '../../infrastructure/audio/GameMusic.js';

const PLAYER_RUNNER_X = TREADMILL_RUNNER_X;
const LAND_OBJECT_SCALE = LAND_RACE_WORLD_SCALE;
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

    const courseAssets = resolveRaceCourseAssets('terrestrial', [], STAGE_TILESET_ASSETS);
    const courseTexturePrefix = 'land-course-' + this.game.loop.frame;
    const tilesetsById = new Map(courseAssets.tilesets.map((asset) => [asset.id, asset]));
    this.courseObjectSpecs = LAND_RACE_OBJECT_SPECS;
    this.courseObjectTextures = createTilesetObjectTextures(
      this,
      LAND_RACE_OBJECT_SPECS.map((spec) => ({
        id: spec.id,
        asset: tilesetsById.get(spec.assetId),
        ...spec.source,
      })),
      { prefix: courseTexturePrefix + '-interaction' },
    );
    const mapKey = this.textures.exists(courseAssets.backgroundKey)
      ? createLoopingMapTexture(this, [{ key: courseAssets.backgroundKey }], {
          key: courseTexturePrefix + '-parallax',
          height: GAME_HEIGHT,
        })
      : null;
    this.environmentObjects = createTilesetEnvironmentSprites(
      this,
      courseAssets.tilesets,
      RACE_COURSE_ENVIRONMENT.terrestrial,
      { prefix: courseTexturePrefix + '-object', ...RACE_COURSE_ENVIRONMENT_LAYOUT.terrestrial },
    );
    this.stageLayers = [];
    if (mapKey) {
      this.stageLayers.push({
        layer: this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, mapKey)
          .setOrigin(0)
          .setDepth(-100),
        factor: 0.12,
      });
    }

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
    this.status = this.#text('ELEGÍ LA DISTANCIA', GAME_WIDTH / 2, 120, '#fff0c9', 12);
    this.staminaLabel = this.#text('RESISTENCIA', 62, 245, '#b8e7f4', 6);
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
    this.player = this.#createRacer(RANGER_IDS.ORANGE, true);
    this.rival = this.#createRacer(RANGER_IDS.ORANGE, false);
    // Ambos arrancan exactamente sobre la misma línea; la distancia solo mueve la cinta.
    this.player.distance = 0;
    this.rival.distance = 0;
    this.runners = [this.player, this.rival];
    this.#createTrackObjects();
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
    this.#syncTrackObjects();
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
    const laneIndex = 0;
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
    const racerGif = this.add.dom(runnerX, groundY - 16).createFromHTML(
      '<img src="' + animationSources.idle + '" data-animation="idle" alt="' + racerName + '" style="width:84px;height:56px;object-fit:contain;image-rendering:pixelated;pointer-events:none;">',
    ).setScale(laneScale).setDepth(44);
    const racer = {
      rangerId,
      gender: genderForRanger(rangerId),
      animationSources,
      gif: racerGif,
      laneY,
      laneIndex,
      laneScale,
      isPlayer,
      visualOffset,
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
      gapStartDistance: null,
      gapEndDistance: null,
      fallRemainingMs: 0,
      fallDurationMs: 0,
      fallEndDistance: null,
    };
    this.#setMode(racer, 'idle');
    return racer;
  }


  #generateRaceObstacles() {
    return createLandRaceObstacles(LAND_RACE_OBSTACLES, this.finishDistance, {
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
    const runnerX = PLAYER_RUNNER_X;
    this.obstacleSprites = this.obstacles.map((obstacle) => {
      if (obstacle.type === 'gap') return null;
      const spec = this.courseObjectSpecs.find(({ id }) => id === obstacle.type);
      return this.add.image(runnerX, this.player.laneY, this.courseObjectTextures[obstacle.type])
        .setDisplaySize(spec?.displayWidth ?? 44, spec?.displayHeight ?? 52)
        .setOrigin(0.5, 1)
        .setDepth(34);
    });
    this.obstacleLabels = this.obstacles.map((obstacle) => {
      const definition = this.courseObjectSpecs.find(({ id }) => id === obstacle.type);
      const isJump = obstacle.action === 'jump';
      const instruction = obstacle.type === 'gap'
        ? '¡SALTO!'
        : (isJump ? '↑ ' : '↓ ') + (definition?.instruction ?? 'OBSTÁCULO');
      return this.add.text(runnerX, this.player.laneY - (obstacle.type === 'gap' ? 28 : 18), instruction, {
        fontFamily: 'monospace',
        fontSize: obstacle.type === 'gap' ? '8px' : '7px',
        fontStyle: 'bold',
        color: obstacle.type === 'gap' ? '#ff8585' : (isJump ? '#ffdc8b' : '#a8eeff'),
        backgroundColor: '#10131d',
        padding: { left: 3, right: 3, top: 1, bottom: 1 },
        stroke: '#10131d',
        strokeThickness: 2,
        align: 'center',
      }).setOrigin(0.5).setDepth(48);
    });
    const staminaSpec = this.courseObjectSpecs.find(({ id }) => id === 'stamina');
    this.pickupSprites = this.pickups.map(() =>
      this.add.image(PLAYER_RUNNER_X, this.player.laneY - 27, this.courseObjectTextures.stamina)
        .setDisplaySize(staminaSpec?.displayWidth ?? 16, staminaSpec?.displayHeight ?? 32)
        .setDepth(38),
    );
  }

  #syncTrackObjects() {
    const runnerX = this.#runnerX(this.player);
    this.obstacles.forEach((obstacle, index) => {
      const x = runnerX + (obstacle.distance - this.player.distance) * LAND_OBJECT_SCALE;
      const y = this.player.laneY + RUNNER_FOOT_OFFSET -
        (obstacle.type === 'gap' ? 22 : (obstacle.action === 'jump' ? 8 : 4));
      const stillPending = this.runners.some((racer) =>
        racer.distance < obstacle.distance + (obstacle.width ?? 0),
      );
      const visible = stillPending && x > -36 && x < GAME_WIDTH + 36;
      this.obstacleSprites[index]?.setPosition(x, y)
        .setDepth(34)
        .setVisible(visible);
      this.obstacleLabels[index]
        ?.setPosition(x, obstacle.type === 'gap' ? y - 9 : y - 24)
        .setDepth(48)
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
      if (Math.abs(x - (playerX + this.player.visualOffset)) < 14) {
        pickup.collected = true;
        sprite.setVisible(false);
        this.player.stamina = Math.min(STAMINA_MAX, this.player.stamina + 30);
      }
    });
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
    this.environmentObjects.forEach(({ image, worldX, scrollFactor }) => {
      image.x = worldX - cameraDistance * scrollFactor;
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

  #startAction(racer, action) {
    if (racer.actionRemainingMs > 0 || racer.stumbleMs > 0 || this.session.finished) return;
    const nextObstacle = this.obstacles[racer.obstacleIndex];
    const distanceToGap = nextObstacle?.distance - racer.distance;
    const isGapJump = action === 'jump' && nextObstacle?.type === 'gap' &&
      distanceToGap >= 0 && distanceToGap <= LAND_RACE_GAP_TRIGGER_DISTANCE;
    const duration = isGapJump ? LAND_RACE_GAP_JUMP_DURATION_MS : ACTION_DURATION_MS[action];
    if (!duration) return;

    racer.actionMode = action;
    racer.actionDurationMs = duration;
    racer.actionElapsedMs = 0;
    racer.actionRemainingMs = duration;
    this.#setMode(racer, action);
  }

  #fallAcrossGap(racer, endDistance) {
    racer.gapStartDistance = null;
    racer.gapEndDistance = null;
    racer.fallDurationMs = LAND_RACE_GAP_FALL_DURATION_MS;
    racer.fallRemainingMs = LAND_RACE_GAP_FALL_DURATION_MS;
    racer.fallEndDistance = endDistance;
    racer.actionMode = null;
    racer.actionDurationMs = 0;
    racer.actionElapsedMs = 0;
    racer.actionRemainingMs = 0;
    racer.stumbleMs = 0;
    racer.stamina = Math.max(0, racer.stamina - 18);
    this.#setMode(racer, 'walk');
  }

  #advanceRacer(racer, delta, controls) {
    const previousDistance = racer.distance;
    const isPlayer = racer.isPlayer;
    const accelerate = Boolean(controls?.accelerate && !controls?.brake);
    const brake = Boolean(controls?.brake && !controls?.accelerate);

    if (racer.fallRemainingMs > 0) {
      racer.fallRemainingMs = Math.max(0, racer.fallRemainingMs - delta);
      if (racer.fallRemainingMs === 0) {
        racer.distance = Math.max(racer.distance, racer.fallEndDistance ?? racer.distance);
        racer.fallEndDistance = null;
        racer.fallDurationMs = 0;
        this.#setMode(racer, isPlayer && !accelerate ? 'walk' : 'run');
      }
      return;
    }

    if (!isPlayer) {
      const nextObstacle = this.obstacles[racer.obstacleIndex];
      const triggerDistance = nextObstacle?.type === 'gap'
        ? LAND_RACE_GAP_TRIGGER_DISTANCE
        : 92;
      if (nextObstacle && nextObstacle.distance - racer.distance <= triggerDistance &&
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
      if (obstacle.type === 'gap') {
        const gapEndDistance = obstacle.distance + obstacle.width;
        if (cleared) {
          racer.gapStartDistance = obstacle.distance;
          racer.gapEndDistance = gapEndDistance;
          racer.stamina = Math.min(STAMINA_MAX, racer.stamina + 8);
        } else {
          this.#fallAcrossGap(racer, gapEndDistance);
        }
      } else if (cleared) {
        racer.stamina = Math.min(STAMINA_MAX, racer.stamina + 8);
      } else {
        racer.stumbleMs = 620;
        racer.stamina = Math.max(0, racer.stamina - 8);
        this.#setMode(racer, 'walk');
      }
      racer.obstacleIndex += 1;
    }

    if (racer.gapEndDistance !== null) {
      if (racer.distance >= racer.gapEndDistance) {
        racer.gapStartDistance = null;
        racer.gapEndDistance = null;
        if (racer.actionMode === 'jump') {
          racer.actionMode = null;
          racer.actionRemainingMs = 0;
          this.#setMode(racer, isPlayer && !accelerate ? 'walk' : 'run');
        }
      } else if (racer.actionMode !== 'jump' || racer.actionRemainingMs <= 0) {
        this.#fallAcrossGap(racer, racer.gapEndDistance);
      }
    }

  }

  #syncRacer(racer) {
    const x = this.#runnerX(racer) + racer.visualOffset;
    const groundY = racer.laneY + RUNNER_FOOT_OFFSET;
    const fallProgress = racer.fallDurationMs > 0
      ? Phaser.Math.Clamp(1 - racer.fallRemainingMs / racer.fallDurationMs, 0, 1)
      : 0;
    const fallDrop = Math.sin(fallProgress * Math.PI / 2) * 48;
    const fallAlpha = 1 - fallProgress;
    const runPhase = racer.distance / 16;
    const movingBob = racer.mode === 'run' || racer.mode === 'walk' || racer.mode === 'dash'
      ? Math.abs(Math.sin(runPhase)) * 2.2
      : 0;
    let lift = 0;
    if (racer.actionMode === 'jump' && racer.actionDurationMs > 0) {
      if (racer.gapStartDistance !== null && racer.gapEndDistance !== null) {
        const progress = getLandRaceGapJumpProgress(
          racer.distance,
          racer.gapStartDistance,
          racer.gapEndDistance,
        );
        lift = Math.sin(progress * Math.PI) * 27;
      } else if (this.obstacles[racer.obstacleIndex]?.type !== 'gap') {
        const progress = Phaser.Math.Clamp(racer.actionElapsedMs / racer.actionDurationMs, 0, 1);
        lift = Math.sin(progress * Math.PI) * 27;
      }
    }

    racer.sprite.setPosition(Math.round(x), Math.round(groundY - lift - movingBob + fallDrop))
      .setDepth(42)
      .setScale(racer.laneScale * (racer.actionMode === 'roll' ? 0.9 : 1))
      .setAlpha(fallAlpha);
    racer.gif?.setPosition(Math.round(x), Math.round(groundY - lift - movingBob - 16 + fallDrop))
      .setDepth(44)
      .setScale(racer.laneScale)
      .setAlpha(fallAlpha);
    racer.shadow.setPosition(Math.round(x), groundY + 1);
    racer.shadow.setScale(racer.laneScale * (1 - lift / 90), racer.laneScale)
      .setAlpha(fallAlpha);
    const poseScale = racer.actionMode === 'roll'
      ? 0.9
      : (racer.mode === 'run' || racer.mode === 'walk' ? 0.82 : 0.9);
    racer.sprite.setScale(racer.laneScale * poseScale, racer.laneScale * (racer.actionMode === 'roll' ? 0.68 : 1));
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
