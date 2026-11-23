import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { TREADMILL_RUNNER_X } from '../../domain/race/treadmillRaceRules.js';
import { getRaceCameraDistance, getRaceRunnerX } from '../../domain/race/raceLanePresentation.js';
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
import raceBikeGifUrl from '../../../art/source/sprites/results/male/orange/bike.gif?url';
import redRaceBikeGifUrl from '../../../art/source/sprites/references/axem-red/axem-ranger-bike.gif?url';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { AVAILABLE_RANGER_VARIANTS, getCounterpartSelection } from '../../domain/rangers/rangerVariants.js';
import { spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';
import { playRaceMusic } from '../../infrastructure/audio/GameMusic.js';
import { PauseMenuView } from '../views/PauseMenuView.js';
import {
  MOTORCYCLE_LANE_COUNT,
  MOTORCYCLE_LANE_BASELINES,
  MOTORCYCLE_LANE_SCALES,
  MOTORCYCLE_RACE_OBSTACLES,
  normalizeMotorcycleLane,
  advanceMotorcycleLateralOffset,
} from '../../domain/race/motorcycleRaceRules.js';

const PLAYER_X = TREADMILL_RUNNER_X;
const COUNTDOWN_MS = 3000;
const LANE_SWITCH_MS = 145;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function createTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function createRaceTextures(scene) {
  createTexture(scene, 'bike-race-motorcycle', 76, 34, (g) => {
    g.fillStyle(0x151a23, 1).fillCircle(14, 25, 9).fillCircle(60, 25, 9);
    g.fillStyle(0x9ca6a8, 1).fillCircle(14, 25, 4).fillCircle(60, 25, 4);
    g.lineStyle(4, 0x9a4d40, 1).lineBetween(14, 25, 34, 14).lineBetween(34, 14, 60, 25);
    g.lineStyle(3, 0xd7b26f, 1).lineBetween(34, 14, 44, 24).lineBetween(44, 24, 60, 25);
    g.fillStyle(0x333f51, 1).fillRoundedRect(27, 7, 23, 8, 3);
    g.fillStyle(0xd7b26f, 1).fillRect(42, 4, 13, 3);
  });
  createTexture(scene, 'bike-race-nitro-flash', 40, 28, (g) => {
    g.fillStyle(0xffffff, 1).fillRect(17, 2, 6, 24);
    g.fillStyle(0x8fe9ff, 1).fillRect(3, 12, 34, 4);
    g.fillStyle(0xd6fbff, 1).fillRect(9, 8, 22, 2);
    g.fillStyle(0x58bbff, 1).fillTriangle(3, 12, 15, 2, 15, 26);
    g.fillTriangle(37, 12, 25, 2, 25, 26);
  });

  // Los tilesets de cueva solo contienen terreno/estructuras/rocas. Los pickups
  // tienen iconografía propia para no confundir una decoración con un efecto.
  createTexture(scene, 'axem-pickup-boost', 36, 36, (g) => {
    g.fillStyle(0x101820, 1).fillRoundedRect(1, 1, 34, 34, 4);
    g.lineStyle(2, 0x75e8f3, 1).strokeRoundedRect(2, 2, 32, 32, 4);
    g.fillStyle(0x12616a, 1).fillRoundedRect(6, 6, 24, 24, 3);
    g.fillStyle(0xfff0b7, 1);
    g.fillTriangle(7, 8, 18, 18, 7, 28);
    g.fillTriangle(17, 8, 28, 18, 17, 28);
  });
  createTexture(scene, 'axem-pickup-slow', 36, 36, (g) => {
    g.fillStyle(0x101820, 1).fillRoundedRect(1, 1, 34, 34, 4);
    g.lineStyle(2, 0xff8b72, 1).strokeRoundedRect(2, 2, 32, 32, 4);
    g.fillStyle(0x702d37, 1).fillRoundedRect(6, 6, 24, 24, 3);
    g.fillStyle(0xffeadf, 1).fillRect(16, 7, 4, 12);
    g.fillTriangle(8, 17, 28, 17, 18, 29);
  });

}

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('RaceScene');
  }

  create() {
    createRaceTextures(this);
    playRaceMusic(this, 'motorcycleRace');
    this.session = new RaceSession({ countdownDurationMs: COUNTDOWN_MS });
    this.distance = 0;
    this.raceDistance = 0;
    this.speed = 210;
    this.boost = 100;
    this.selectingCharacter = false;
    this.selectedVariant = { id: RANGER_IDS.ORANGE, gender: 'male' };
    this.lastSceneryChunk = -1;
    this.obstacles = [];
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      nitro: Phaser.Input.Keyboard.KeyCodes.N,
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

    const { maps: courseMaps, tilesets: raceTilesets } = resolveRaceCourseAssets(
      'axem',
      STAGE_MAP_ASSETS,
      STAGE_TILESET_ASSETS,
    );
    this.courseObjectTextures = createTilesetObjectTextures(
      this,
      resolveRaceCourseObjects('axem', raceTilesets),
      { prefix: 'bike-course-object-' + this.game.loop.frame },
    );
    const mapKey = createLoopingMapTexture(this, courseMaps, {
      key: 'bike-course-' + this.game.loop.frame,
      height: GAME_HEIGHT,
    });
    const worldKeys = mapKey
      ? [mapKey]
      : createLoopingRaceTextures(this, raceTilesets, {
          prefix: 'bike-world-' + this.game.loop.frame,
          trackTop: 139,
          seed: 809,
        });
    this.stageLayers = worldKeys.map((key, index) =>
      this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key)
        .setOrigin(0)
        .setDepth(-100 + index)
        .setAlpha(index === 0 ? 1 : 0.58),
    );
    this.hud = this.add.graphics().setDepth(80);
    this.status = this.#text('ELEGÍ LA DISTANCIA', GAME_WIDTH / 2, 48, '#fff0c9', 10);
    this.distanceLabel = this.#text('0 M', 105, GAME_HEIGHT - 20, '#e7dcff', 5);
    this.nitroLabel = this.#text('NITRO', GAME_WIDTH - 62, GAME_HEIGHT - 25, '#a8e8ff', 4);
    this.pauseMenu = new PauseMenuView(this, {
      onResume: () => this.#resume(),
      onReturnToMenu: () => this.scene.start('MenuScene'),
      onSelectDistance: (distance) => this.#startRace(distance),
      distanceOptions: RACE_DISTANCE_OPTIONS,
      controlsTitle: 'CONTROLES · CARRERA AXEM',
      controls: [
        '← / → · MOVERSE DENTRO DEL CARRIL',
        '↑ / ↓ o W / S · CAMBIAR DE CARRIL',
        'D · ACELERAR · A · FRENAR',
        'ESPACIO · SALTAR',
        'N · NITRO',
        'AL FINAL · ENTER MENÚ · R REPETIR',
        'ESC · VOLVER AL MENÚ',
      ],
    });

    this.pauseMenu.showDistanceSelection();
  }


  update(time, delta) {
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
    if (this.selectingCharacter) {
      const choosePrevious = Phaser.Input.Keyboard.JustDown(this.keys.left) ||
        Phaser.Input.Keyboard.JustDown(this.keys.a);
      const chooseNext = Phaser.Input.Keyboard.JustDown(this.keys.right) ||
        Phaser.Input.Keyboard.JustDown(this.keys.d);
      if (choosePrevious || chooseNext) {
        const currentIndex = AVAILABLE_RANGER_VARIANTS.findIndex((variant) =>
          variant.id === this.selectedVariant.id && variant.gender === this.selectedVariant.gender,
        );
        const direction = choosePrevious ? -1 : 1;
        const nextIndex = (currentIndex + direction + AVAILABLE_RANGER_VARIANTS.length) %
          AVAILABLE_RANGER_VARIANTS.length;
        this.selectedVariant = { ...AVAILABLE_RANGER_VARIANTS[nextIndex] };
        this.#refreshSelectionPreview();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.#startRace();
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
      if (!this.session.countdownMs) this.time.delayedCall(450, () => this.status?.setText(''));
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) this.player.jumpMs = 620;
    for (const racer of this.racers) racer.jumpMs = Math.max(0, (racer.jumpMs ?? 0) - delta);
    const accelerate = this.keys.d.isDown;
    const brake = this.keys.a.isDown;
    const boosting = this.keys.nitro.isDown && this.boost > 0;
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      this.#changeLane(this.player, -1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      this.#changeLane(this.player, 1);
    }

    this.player.laneSwitchMs = Math.max(0, this.player.laneSwitchMs - delta);
    if (this.player.laneSwitchMs === 0) this.player.lane = this.player.targetLane;
    const frame = Math.min(delta, 50) / 1000;
    const steering = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    this.player.lateralOffset = Phaser.Math.Clamp(
      advanceMotorcycleLateralOffset(this.player.lateralOffset, steering, delta),
      -142,
      142,
    );
    this.speedEffectMs = Math.max(0, this.speedEffectMs - delta);
    if (this.speedEffectMs === 0) this.speedEffect = 0;
    const targetSpeed = 172 + (accelerate ? 100 : 0) - (brake ? 70 : 0)
      + (boosting ? 135 : 0) + this.speedEffect;
    this.speed = Phaser.Math.Linear(this.speed, clamp(targetSpeed, 85, 410), Math.min(1, frame * 3.2));
    this.distance += this.speed * frame;
    this.player.distance = this.distance;
    this.boost = clamp(this.boost + (boosting ? -34 : 16) * frame, 0, 100);
    this.stageLayers.forEach((layer, index) => {
      layer.tilePositionX = this.distance * (index === 0 ? 0.14 : 0.34);
    });
    if (boosting && (!this.wasBoosting || time - this.lastNitroFlashAt >= 120)) {
      this.#emitNitroFlash(time);
    }
    this.wasBoosting = boosting;

    this.#updateOpponents(time, frame);
    this.#updateObstacles(frame);
    this.#updatePickups();
    this.#syncRacers(time);
    this.#drawHud();

    if (this.racers.some((racer) => racer.distance >= this.raceDistance)) {
      const sorted = [...this.racers].sort((a, b) => b.distance - a.distance);
      this.#finish(sorted[0] === this.player);
    }
  }

  #openPause() {
    if (this.session.paused) return;
    this.session.pause();
    this.tweens.pauseAll();
    this.anims.pauseAll();
    this.racers?.forEach((racer) => {
      racer.gif?.setVisible(false);
      if (racer.gif?.node) racer.gif.node.style.visibility = 'hidden';
      racer.sprite?.setVisible(false);
      racer.vehicle?.setVisible(false);
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
    this.racers?.forEach((racer) => {
      racer.gif?.setVisible(true);
      if (racer.gif?.node) racer.gif.node.style.visibility = '';
      racer.shadow?.setVisible(true);
    });
  }

  #refreshSelectionPreview() {
    const { id, gender } = this.selectedVariant;
    const isViolet = id === RANGER_IDS.VIOLET;
    this.selectionPreview.stop();
    this.selectionPreview
      .setTexture(spriteKeyFor(id, gender))
      .setScale(0.9)
      .setAngle(0);
    this.selectionVehicle.setVisible(true);
    this.selectionLabel.setText('AXEM ' + (isViolet ? 'VIOLETA' : 'NARANJA'))
      .setColor(isViolet ? '#e3d4ff' : '#ffc58e');
  }

  #startRace(distance) {
    this.session.start(distance, COUNTDOWN_MS);
    this.pauseMenu.hide();
    this.raceDistance = distance;
    this.distance = 0;
    this.lastSceneryChunk = -1;
    this.obstacles = repeatCoursePattern(MOTORCYCLE_RACE_OBSTACLES, this.raceDistance, {
      cycleDistance: 3600,
      finishPadding: 180,
    }).map((item) => ({
      ...item,
      lane: normalizeMotorcycleLane(item.lane),
      resolved: false,
      hitRacers: new Set(),
    }));
    this.selectingCharacter = false;
    this.selectionPreview?.destroy();
    this.selectionVehicle?.destroy();
    this.selectionLabel?.destroy();
    this.status.setText('3').setFontSize(25);
    const orangeSelection = { id: RANGER_IDS.ORANGE, gender: 'male' };
    this.player = this.#createRacer(orangeSelection, 'AXEM NARANJA', 0, true);
    this.opponents = [
      this.#createRacer(orangeSelection, 'AXEM RED', 1, false),
    ];
    // Ambos arrancan en la misma vertical y con distancia cero.
    this.player.distance = 0;
    this.opponents[0].distance = 0;
    this.racers = [this.player, ...this.opponents];
    this.obstacleSprites = this.obstacles.map((obstacle) =>
      this.add.image(0, 0, this.courseObjectTextures[obstacle.kind]).setDepth(30),
    );
    this.pickups = repeatCoursePattern([
      { distance: 280, kind: 'boost', lane: 0 },
      { distance: 840, kind: 'slow', lane: 1 },
      { distance: 1380, kind: 'boost', lane: 1 },
      { distance: 1940, kind: 'boost', lane: 0 },
      { distance: 2500, kind: 'slow', lane: 1 },
      { distance: 3100, kind: 'boost', lane: 1 },
    ], this.raceDistance, {
      cycleDistance: 3400,
      finishPadding: 80,
    }).map((pickup) => ({
      ...pickup,
      lane: normalizeMotorcycleLane(pickup.lane),
      collected: false,
    }));
    this.pickupSprites = this.pickups.map((pickup) =>
      this.add.image(0, 0, pickup.kind === 'boost' ? 'axem-pickup-boost' : 'axem-pickup-slow')
        .setDepth(32),
    );
    this.pickupLabels = this.pickups.map((pickup) =>
      this.add.text(0, 0, pickup.kind === 'boost' ? 'ACELERA' : 'FRENA', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: pickup.kind === 'boost' ? '#9cecff' : '#ffb2a0',
        stroke: '#10131d',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(35),
    );
    this.speedEffect = 0;
    this.speedEffectMs = 0;
    this.wasBoosting = false;
    this.lastNitroFlashAt = Number.NEGATIVE_INFINITY;
    this.#drawHud();
  }

  #createRacer(selection, label, lane, isPlayer) {
    const { id: rangerId, gender } = selection;
    const texture = spriteKeyFor(rangerId, gender);
    const sprite = this.add.sprite(PLAYER_X, MOTORCYCLE_LANE_BASELINES[lane], texture)
      .setOrigin(0.5, 0.82)
      .setScale(MOTORCYCLE_LANE_SCALES[lane] * (isPlayer ? 0.98 : 0.9))
      .setDepth(36 + lane);
    const animationKey = 'axem-' + gender + '-' + rangerId + '-bike';
    if (this.anims.exists(animationKey)) sprite.play(animationKey);
    const vehicle = this.add.image(sprite.x, sprite.y + 8, 'bike-race-motorcycle')
      .setOrigin(0.5, 0.75)
      .setScale(MOTORCYCLE_LANE_SCALES[lane] * 0.92)
      .setDepth(34 + lane);
    const shadow = this.add.ellipse(sprite.x, sprite.y + 13, 38, 7, 0x111820, 0.48)
      .setScale(MOTORCYCLE_LANE_SCALES[lane])
      .setDepth(33 + lane);
    sprite.setVisible(false);
    vehicle.setVisible(false);
    const racerBikeGifUrl = isPlayer ? raceBikeGifUrl : redRaceBikeGifUrl;
    const gif = this.add.dom(sprite.x, sprite.y - 25).createFromHTML(
      '<img src="' + racerBikeGifUrl + '" alt="' + label + '" style="width:84px;height:76px;object-fit:contain;image-rendering:pixelated;pointer-events:none;">',
    ).setDepth(48).setScale(MOTORCYCLE_LANE_SCALES[lane] * 1.04);
    return {
      rangerId, gender, label, lane, targetLane: lane, isPlayer, sprite, vehicle, shadow, gif,
      distance: 0, lateralOffset: 0,
      stunMs: 0, jumpMs: 0, laneSwitchMs: 0, crashed: false,
    };
  }

  #worldX(distance) {
    const cameraDistance = getRaceCameraDistance(this.distance, PLAYER_X, 126, 0.19);
    return getRaceRunnerX(PLAYER_X, distance, cameraDistance, 0.19);
  }

  #racerX(racer) {
    return Phaser.Math.Clamp(
      this.#worldX(racer.distance) + (racer.lateralOffset ?? 0),
      42,
      GAME_WIDTH - 42,
    );
  }

  #changeLane(racer, direction) {
    if (racer.laneSwitchMs > 0) return;
    racer.targetLane = normalizeMotorcycleLane(racer.lane + direction);
    if (racer.targetLane !== racer.lane) racer.laneSwitchMs = LANE_SWITCH_MS;
  }

  #updateOpponents(time, frame) {
    this.opponents.forEach((racer, index) => {
      racer.distance += (196 + index * 7 + Math.sin(time / (390 + index * 55)) * 15) * frame;
      racer.laneSwitchMs = Math.max(0, racer.laneSwitchMs - frame * 1000);
      racer.lateralOffset = Math.sin(time / (520 + index * 85)) * 28;
      const upcoming = this.obstacles.find((obstacle) => !obstacle.resolved &&
        obstacle.lane === racer.lane && obstacle.distance - racer.distance < 125 &&
        obstacle.distance - racer.distance > 0);
      if (upcoming && racer.laneSwitchMs <= 0 && Math.random() < 0.045) {
        this.#changeLane(racer, racer.lane === MOTORCYCLE_LANE_COUNT - 1 ? -1 : 1);
      }
      if (racer.stunMs > 0) racer.stunMs = Math.max(0, racer.stunMs - frame * 1000);
      if (racer.laneSwitchMs === 0) racer.lane = racer.targetLane;
      const y = Phaser.Math.Linear(MOTORCYCLE_LANE_BASELINES[racer.lane],
        MOTORCYCLE_LANE_BASELINES[racer.targetLane], 1 - racer.laneSwitchMs / LANE_SWITCH_MS);
      racer.sprite.y = y;
    });
  }

  #updateObstacles(frame) {
    this.obstacles.forEach((obstacle, index) => {
      const screenX = this.#worldX(obstacle.distance);
      const y = MOTORCYCLE_LANE_BASELINES[obstacle.lane] + 3;
      const sprite = this.obstacleSprites[index];
      sprite.setPosition(screenX, y)
        .setScale(MOTORCYCLE_LANE_SCALES[obstacle.lane] * (obstacle.kind === 'stone-pillar' ? 0.52 : 0.42))
        .setDepth(30 + obstacle.lane);
      if (screenX < -30) {
        sprite.setVisible(false);
        obstacle.resolved = true;
        return;
      }
      sprite.setVisible(true);
      for (const racer of this.racers) {
        if (racer.crashed || racer.lane !== obstacle.lane || obstacle.hitRacers.has(racer.label)) continue;
        const racerX = this.#racerX(racer);
        if (Math.abs(screenX - racerX) < (obstacle.kind === 'oil' ? 18 : 20)) {
          if (racer.isPlayer && racer.jumpMs > 0) {
            obstacle.hitRacers.add(racer.label);
            continue;
          }
          racer.stunMs = 720;
          if (racer.isPlayer) this.boost = Math.max(0, this.boost - 22);
          racer.distance -= 20;
          if (racer.isPlayer) this.distance = Math.max(0, this.distance - 20);
          obstacle.hitRacers.add(racer.label);
        }
      }
    });
  }

  #updatePickups() {
    this.pickups.forEach((pickup, index) => {
      const sprite = this.pickupSprites[index];
      const label = this.pickupLabels[index];
      if (pickup.collected) {
        sprite.setVisible(false);
        label.setVisible(false);
        return;
      }
      const playerX = this.#racerX(this.player);
      const x = this.#worldX(pickup.distance);
      const y = MOTORCYCLE_LANE_BASELINES[pickup.lane] - 9;
      const visible = x > -34 && x < GAME_WIDTH + 34;
      sprite.setPosition(x, y)
        .setScale(MOTORCYCLE_LANE_SCALES[pickup.lane] * 0.72)
        .setDepth(32 + pickup.lane)
        .setVisible(visible);
      label.setPosition(x, y + 20)
        .setVisible(visible);
      if (this.player.lane === pickup.lane && Math.abs(x - playerX) < 18) {
        pickup.collected = true;
        sprite.setVisible(false);
        label.setVisible(false);
        this.speedEffect = pickup.kind === 'boost' ? 105 : -75;
        this.speedEffectMs = 1900;
        if (pickup.kind === 'boost') this.boost = clamp(this.boost + 24, 0, 100);
        this.cameras.main.flash(90, 110, pickup.kind === 'boost' ? 220 : 120, 255);
      }
    });
  }


  #syncRacers(time) {
    for (const racer of this.racers) {
      const baseline = MOTORCYCLE_LANE_BASELINES[racer.lane];
      const laneScale = MOTORCYCLE_LANE_SCALES[racer.lane];
      const targetY = Phaser.Math.Linear(baseline, MOTORCYCLE_LANE_BASELINES[racer.targetLane],
        racer.laneSwitchMs > 0 ? 1 - racer.laneSwitchMs / LANE_SWITCH_MS : 1);
      const x = this.#racerX(racer);
      racer.sprite.setPosition(x, targetY + (racer.stunMs > 0 ? Math.sin(time / 25) * 2 : 0))
        .setDepth(36 + racer.lane);
      racer.sprite.setScale(laneScale * (racer.isPlayer ? 0.98 : 0.9));
      racer.sprite.setAngle(Math.sin(time / 160 + racer.lane) * 1.5);
      const jumpLift = racer.jumpMs > 0 ? Math.sin((1 - racer.jumpMs / 620) * Math.PI) * 15 : 0;
      racer.gif?.setPosition(x, targetY - 20 - jumpLift)
        .setDepth(48 + racer.lane)
        .setScale(laneScale * 1.04);
      racer.shadow?.setPosition(x, targetY + 12).setScale(laneScale);
      if (racer.vehicle) racer.vehicle.setPosition(x, targetY + 8)
        .setScale(laneScale * 0.92).setDepth(34 + racer.lane);
    }
  }

  #drawHud() {
    this.hud.clear();
    const top = GAME_HEIGHT - 31;
    this.hud.fillStyle(0x111725, 0.9).fillRoundedRect(8, top, GAME_WIDTH - 16, 25, 4);
    this.hud.fillStyle(0x9b85d1, 1).fillRect(18, top + 17,
      205 * clamp(this.distance / this.raceDistance, 0, 1), 3);
    this.hud.fillStyle(0x172033, 1).fillRect(GAME_WIDTH - 118, top + 16, 96, 6);
    this.hud.fillStyle(0x78c9e8, 1).fillRect(GAME_WIDTH - 117, top + 17,
      94 * this.boost / 100, 4);
    this.distanceLabel.setPosition(103, top + 9)
      .setText(Math.floor(this.distance) + ' / ' + this.raceDistance + ' M');
    this.nitroLabel.setPosition(GAME_WIDTH - 70, top + 6);
  }

  #emitNitroFlash(time) {
    this.lastNitroFlashAt = time;
    const y = MOTORCYCLE_LANE_BASELINES[this.player.lane] - 9;
    const burst = this.add.container(this.#racerX(this.player) - 24, y).setDepth(68);
    const core = this.add.image(0, 0, 'bike-race-nitro-flash')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.1 + Math.random() * 0.25);
    burst.add(core);
    for (let index = 0; index < 4; index += 1) {
      const spark = this.add.image(
        Phaser.Math.Between(-8, 8),
        Phaser.Math.Between(-10, 10),
        'bike-race-nitro-flash',
      ).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.18, 0.38))
        .setAngle(Phaser.Math.Between(-35, 35));
      burst.add(spark);
      this.tweens.add({
        targets: spark,
        x: spark.x - Phaser.Math.Between(24, 48),
        y: spark.y + Phaser.Math.Between(-16, 16),
        alpha: 0,
        scale: 0.05,
        duration: Phaser.Math.Between(130, 230),
        ease: 'Cubic.easeOut',
      });
    }
    this.tweens.add({
      targets: [core, burst],
      x: '-=34',
      scaleX: 1.8,
      scaleY: 1.3,
      alpha: 0,
      duration: 190,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy(),
    });
    if (!this.wasBoosting) {
      this.cameras.main.flash(110, 120, 220, 255);
      this.cameras.main.shake(130, 0.0022);
      this.cameras.main.zoomTo(1.035, 100);
      this.time.delayedCall(170, () => this.cameras.main?.zoomTo(1, 150));
    }
  }

  #finish(playerWon) {
    this.session.finish({ playerWon });
    this.status.setText(playerWon ? '¡GANASTE LA CARRERA!' : '¡GANA AXEM RED!').setFontSize(11);
    this.cameras.main.flash(180, 255, 245, 218);
  }

  #text(value, x, y, color, size) {
    return this.add.text(x, y, value, {
      fontFamily: 'monospace', fontSize: size + 'px', color,
      stroke: '#111423', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(90);
  }
}
