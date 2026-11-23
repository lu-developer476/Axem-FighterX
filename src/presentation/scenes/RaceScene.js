import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { TREADMILL_RUNNER_X } from '../../domain/race/treadmillRaceRules.js';
import { STAGE_TILESET_ASSETS } from '../../infrastructure/assets/stageAssetManifest.js';
import {
  createLoopingRaceTextures,
  createTilesetStampTextures,
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
} from '../../domain/race/motorcycleRaceRules.js';

const PLAYER_X = TREADMILL_RUNNER_X;
const COUNTDOWN_MS = 3000;
const LANE_SWITCH_MS = 145;
const RACE_TILESET_IDS = Object.freeze(['sidescroll-tileset']);
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
  createTexture(scene, 'bike-race-barrier', 42, 24, (g) => {
    g.fillStyle(0x252332, 1).fillRect(5, 4, 5, 20).fillRect(32, 4, 5, 20);
    g.fillStyle(0xe7d7b5, 1).fillRect(3, 3, 36, 6);
    g.fillStyle(0xc85d50, 1).fillRect(7, 3, 7, 6).fillRect(21, 3, 7, 6);
    g.fillStyle(0xf3bf72, 1).fillRect(5, 21, 10, 3).fillRect(27, 21, 10, 3);
  });
  createTexture(scene, 'bike-race-crate', 24, 24, (g) => {
    g.fillStyle(0x62452f, 1).fillRect(1, 1, 22, 22);
    g.lineStyle(2, 0xc99a5c, 1).strokeRect(2, 2, 20, 20);
    g.lineBetween(3, 3, 21, 21).lineBetween(21, 3, 3, 21);
    g.fillStyle(0xe5bd7c, 1).fillRect(10, 3, 4, 18);
  });
  createTexture(scene, 'bike-race-oil', 38, 15, (g) => {
    g.fillStyle(0x121722, 0.9).fillEllipse(19, 8, 37, 14);
    g.fillStyle(0x45516a, 0.85).fillEllipse(13, 6, 13, 3);
    g.fillStyle(0x171c2c, 1).fillEllipse(27, 10, 11, 4);
  });
  createTexture(scene, 'bike-race-tree', 36, 64, (g) => {
    g.fillStyle(0x493a31, 1).fillRect(15, 31, 7, 32);
    g.fillStyle(0x214b3b, 1).fillTriangle(18, 0, 1, 39, 35, 39);
    g.fillStyle(0x367052, 1).fillTriangle(18, 12, 3, 49, 33, 49);
    g.fillStyle(0x71945d, 1).fillRect(13, 23, 8, 3);
  });
  createTexture(scene, 'bike-race-rock', 34, 21, (g) => {
    g.fillStyle(0x343b3d, 1).fillTriangle(1, 20, 11, 2, 20, 20);
    g.fillStyle(0x51595a, 1).fillTriangle(12, 20, 24, 0, 33, 20);
    g.fillStyle(0x899083, 1).fillRect(12, 8, 7, 2);
  });
}

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('RaceScene');
  }

  create() {
    createRaceTextures(this);
    createTexture(this, 'bike-race-boost', 22, 22, (g) => {
      g.fillStyle(0x174c68, 1).fillCircle(11, 11, 10);
      g.lineStyle(2, 0x8ee8ff, 1).strokeCircle(11, 11, 8);
      g.fillStyle(0xbaf5ff, 1).fillTriangle(12, 3, 7, 12, 12, 12);
      g.fillTriangle(12, 10, 16, 10, 10, 19);
    });
    createTexture(this, 'bike-race-slow', 22, 22, (g) => {
      g.fillStyle(0x6a2d42, 1).fillCircle(11, 11, 10);
      g.lineStyle(2, 0xffb0a0, 1).strokeCircle(11, 11, 8);
      g.fillStyle(0xffd1a5, 1).fillRect(5, 10, 12, 3);
    });
    playRaceMusic(this, 'motorcycleRace');
    this.session = new RaceSession({ countdownDurationMs: COUNTDOWN_MS });
    this.distance = 0;
    this.raceDistance = 0;
    this.speed = 210;
    this.boost = 100;
    this.selectingCharacter = false;
    this.selectedVariant = { id: RANGER_IDS.ORANGE, gender: 'male' };
    this.trackOffset = 0;
    this.sceneryOffset = 0;
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
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      jump: Phaser.Input.Keyboard.KeyCodes.J,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
    });
    this.pauseNavigationKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });

    this.track = this.add.graphics().setDepth(10);
    this.scenery = [];
    const raceTilesets = STAGE_TILESET_ASSETS.filter((asset) => RACE_TILESET_IDS.includes(asset.id));
    const worldKeys = createLoopingRaceTextures(this, raceTilesets, {
      prefix: 'bike-world-' + this.game.loop.frame,
      trackTop: 139,
      seed: 809,
    });
    this.stageLayers = worldKeys.map((key, index) =>
      this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key)
        .setOrigin(0)
        .setDepth(-100 + index)
        .setAlpha(index === 0 ? 0.9 : 0.58),
    );
    this.sceneryTextures = createTilesetStampTextures(this, raceTilesets, {
      prefix: 'bike-prop-' + this.game.loop.frame,
      countPerAsset: 5,
      seed: 911,
    });
    this.#drawTrack();
    this.hud = this.add.graphics().setDepth(80);
    this.status = this.#text('ELEGÍ LA DISTANCIA', GAME_WIDTH / 2, 48, '#fff0c9', 10);
    this.instructions = this.#text('↑ / ↓ DISTANCIA · ENTER CONFIRMAR · ESC MENÚ',
      GAME_WIDTH / 2, GAME_HEIGHT - 7, '#f0dfc2', 6);
    this.distanceLabel = this.#text('J1 · 0 M', 63, 18, '#e7dcff', 5);
    this.nitroLabel = this.#text('NITRO', GAME_WIDTH - 48, 8, '#a8e8ff', 4);
    this.pauseMenu = new PauseMenuView(this, {
      onResume: () => this.#resume(),
      onReturnToMenu: () => this.scene.start('MenuScene'),
      onSelectDistance: (distance) => this.#startRace(distance),
      distanceOptions: RACE_DISTANCE_OPTIONS,
      controlsTitle: 'CONTROLES · CARRERA AXEM',
      controls: [
        '↑ / W · SUBIR DE CARRIL',
        '↓ / S · BAJAR DE CARRIL',
        '→ / D · ACELERAR',
        '← / A · FRENAR',
        'J · SALTAR · ESPACIO · NITRO',
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

    if (Phaser.Input.Keyboard.JustDown(this.keys.jump)) this.player.jumpMs = 620;
    for (const racer of this.racers) racer.jumpMs = Math.max(0, (racer.jumpMs ?? 0) - delta);
    const accelerate = this.keys.right.isDown || this.keys.d.isDown;
    const brake = this.keys.left.isDown || this.keys.a.isDown;
    const boosting = this.keys.space.isDown && this.boost > 0;
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      this.#changeLane(this.player, -1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      this.#changeLane(this.player, 1);
    }

    this.player.laneSwitchMs = Math.max(0, this.player.laneSwitchMs - delta);
    if (this.player.laneSwitchMs === 0) this.player.lane = this.player.targetLane;
    const frame = Math.min(delta, 50) / 1000;
    this.speedEffectMs = Math.max(0, this.speedEffectMs - delta);
    if (this.speedEffectMs === 0) this.speedEffect = 0;
    const targetSpeed = 172 + (accelerate ? 100 : 0) - (brake ? 70 : 0)
      + (boosting ? 135 : 0) + this.speedEffect;
    this.speed = Phaser.Math.Linear(this.speed, clamp(targetSpeed, 85, 410), Math.min(1, frame * 3.2));
    this.distance += this.speed * frame;
    this.player.distance = this.distance;
    this.boost = clamp(this.boost + (boosting ? -34 : 16) * frame, 0, 100);
    this.trackOffset = (this.trackOffset + this.speed * frame * 0.9) % 34;
    this.sceneryOffset += this.speed * frame * 0.52;
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
    this.#updateScenery(frame);
    this.#drawTrack();
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
      racer.labelText?.setVisible(false);
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
      racer.labelText?.setVisible(true);
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
    this.selectionLabel.setText('J1 · AXEM ' + (isViolet ? 'VIOLETA' : 'NARANJA'))
      .setColor(isViolet ? '#e3d4ff' : '#ffc58e');
  }

  #startRace(distance) {
    this.session.start(distance, COUNTDOWN_MS);
    this.pauseMenu.hide();
    this.raceDistance = distance;
    this.distance = 0;
    this.trackOffset = 0;
    this.sceneryOffset = 0;
    this.lastSceneryChunk = -1;
    this.scenery.forEach(({ item }) => item.destroy());
    this.scenery = [];
    const obstacleKinds = ['barrier', 'oil', 'crate'];
    this.obstacles = repeatCoursePattern(MOTORCYCLE_RACE_OBSTACLES, this.raceDistance, {
      cycleDistance: 3600,
      finishPadding: 180,
    }).map((item) => ({
      ...item,
      lane: Phaser.Math.Between(0, MOTORCYCLE_LANE_COUNT - 1),
      kind: Phaser.Utils.Array.GetRandom(obstacleKinds),
      resolved: false,
      hitRacers: new Set(),
    }));
    this.selectingCharacter = false;
    this.selectionPreview?.destroy();
    this.selectionVehicle?.destroy();
    this.selectionLabel?.destroy();
    this.status.setText('3').setFontSize(25);
    this.instructions.setText('↑ / ↓ CARRIL · → / D ACELERAR · ← / A FRENAR · J SALTAR · ESPACIO NITRO')
      .setFontSize(5);

    const orangeSelection = { id: RANGER_IDS.ORANGE, gender: 'male' };
    this.player = this.#createRacer(orangeSelection, 'J1 · AXEM NARANJA', 1, true);
    this.opponents = [
      this.#createRacer(orangeSelection, 'AXEM RED', 2, false),
    ];
    // Ambos arrancan en la misma vertical y con distancia cero.
    this.player.distance = 0;
    this.opponents[0].distance = 0;
    this.racers = [this.player, ...this.opponents];
    this.obstacleSprites = this.obstacles.map((obstacle) =>
      this.add.image(0, 0, this.#obstacleTexture(obstacle.kind)).setDepth(30),
    );
    this.pickups = repeatCoursePattern([
      { distance: 280, kind: 'boost', lane: 0 },
      { distance: 840, kind: 'slow', lane: 2 },
      { distance: 1380, kind: 'boost', lane: 1 },
      { distance: 1940, kind: 'boost', lane: 3 },
      { distance: 2500, kind: 'slow', lane: 2 },
      { distance: 3100, kind: 'boost', lane: 1 },
    ], this.raceDistance, {
      cycleDistance: 3400,
      finishPadding: 80,
    }).map((pickup) => ({
      ...pickup,
      lane: Phaser.Math.Between(0, MOTORCYCLE_LANE_COUNT - 1),
      collected: false,
    }));
    this.pickupBackdropSprites = this.pickups.map((pickup, index) => {
      const texture = this.sceneryTextures.length
        ? this.sceneryTextures[index % this.sceneryTextures.length]
        : this.#obstacleTexture(pickup.kind === 'boost' ? 'crate' : 'oil');
      return this.add.image(0, 0, texture).setDepth(31).setAlpha(0.82)
        .setScale(0.78);
    });
    this.pickupSprites = this.pickups.map((pickup) =>
      this.add.image(0, 0, pickup.kind === 'boost' ? 'bike-race-boost' : 'bike-race-slow')
        .setDepth(32),
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
      .setScale(MOTORCYCLE_LANE_SCALES[lane] * (isPlayer ? 0.78 : 0.7))
      .setDepth(36 + lane);
    const animationKey = 'axem-' + gender + '-' + rangerId + '-bike';
    if (this.anims.exists(animationKey)) sprite.play(animationKey);
    const vehicle = this.add.image(sprite.x, sprite.y + 8, 'bike-race-motorcycle')
      .setOrigin(0.5, 0.75)
      .setScale(MOTORCYCLE_LANE_SCALES[lane] * 0.78)
      .setDepth(34 + lane);
    sprite.setVisible(false);
    vehicle.setVisible(false);
    const racerBikeGifUrl = isPlayer ? raceBikeGifUrl : redRaceBikeGifUrl;
    const gif = this.add.dom(sprite.x, sprite.y - 25).createFromHTML(
      '<img src="' + racerBikeGifUrl + '" alt="' + label + '" style="width:62px;height:54px;object-fit:contain;image-rendering:pixelated;pointer-events:none;">',
    ).setDepth(48);
    const labelText = this.#text(label, sprite.x, sprite.y - 35, isPlayer ? '#ffc58e' : '#ff9b9b', 5);
    return {
      rangerId, gender, label, lane, targetLane: lane, isPlayer, sprite, vehicle, gif, labelText,
      distance: 0,
      stunMs: 0, jumpMs: 0, laneSwitchMs: 0, crashed: false,
    };
  }

  #racerX(_racer) {
    // El corredor queda fijo en la cinta; acelerar modifica velocidad y distancia, no X.
    return PLAYER_X;
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
      const upcoming = this.obstacles.find((obstacle) => !obstacle.resolved &&
        obstacle.lane === racer.lane && obstacle.distance - racer.distance < 125 &&
        obstacle.distance - racer.distance > 0);
      if (upcoming && racer.laneSwitchMs <= 0 && Math.random() < 0.045) {
        this.#changeLane(racer, racer.lane === 3 ? -1 : 1);
      }
      if (racer.stunMs > 0) racer.stunMs = Math.max(0, racer.stunMs - frame * 1000);
      if (racer.laneSwitchMs === 0) racer.lane = racer.targetLane;
      const y = Phaser.Math.Linear(MOTORCYCLE_LANE_BASELINES[racer.lane],
        MOTORCYCLE_LANE_BASELINES[racer.targetLane], 1 - racer.laneSwitchMs / LANE_SWITCH_MS);
      racer.sprite.y = y;
      racer.labelText.y = y - 27;
    });
  }

  #updateObstacles(frame) {
    this.obstacles.forEach((obstacle, index) => {
      const laneRacer = this.racers.find((racer) => racer.lane === obstacle.lane);
      const laneOriginX = laneRacer ? this.#racerX(laneRacer) : PLAYER_X;
      const laneDistance = laneRacer?.distance ?? this.distance;
      const screenX = laneOriginX + (obstacle.distance - laneDistance) * 0.19;
      const y = MOTORCYCLE_LANE_BASELINES[obstacle.lane] + 3;
      const sprite = this.obstacleSprites[index];
      sprite.setPosition(screenX, y).setScale(MOTORCYCLE_LANE_SCALES[obstacle.lane]);
      if (screenX < -30) {
        sprite.setVisible(false);
        obstacle.resolved = true;
        return;
      }
      sprite.setVisible(true);
      for (const racer of this.racers) {
        if (racer.crashed || racer.lane !== obstacle.lane || obstacle.hitRacers.has(racer.label)) continue;
        const racerX = this.#racerX(racer);
        const racerDistance = racer.isPlayer ? this.distance : racer.distance;
        const collisionX = racerX + (obstacle.distance - racerDistance) * 0.19;
        if (Math.abs(collisionX - racerX) < (obstacle.kind === 'oil' ? 18 : 20)) {
          if (racer.isPlayer && racer.jumpMs > 0 && obstacle.kind !== 'oil') {
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
      const backdrop = this.pickupBackdropSprites[index];
      if (pickup.collected) {
        sprite.setVisible(false);
        backdrop?.setVisible(false);
        return;
      }
      const x = PLAYER_X + (pickup.distance - this.distance) * 0.19;
      const y = MOTORCYCLE_LANE_BASELINES[pickup.lane] - 9;
      backdrop?.setPosition(x, y).setVisible(x > -24 && x < GAME_WIDTH + 24);
      sprite.setPosition(x, y).setVisible(x > -24 && x < GAME_WIDTH + 24);
      if (this.player.lane === pickup.lane && Math.abs(x - PLAYER_X) < 18) {
        pickup.collected = true;
        sprite.setVisible(false);
        this.speedEffect = pickup.kind === 'boost' ? 105 : -75;
        this.speedEffectMs = 1900;
        if (pickup.kind === 'boost') this.boost = clamp(this.boost + 24, 0, 100);
        this.cameras.main.flash(90, 110, pickup.kind === 'boost' ? 220 : 120, 255);
      }
    });
  }

  #updateScenery(frame) {
    const nextChunk = Math.floor(this.sceneryOffset / 155);
    while (this.lastSceneryChunk < nextChunk) {
      this.lastSceneryChunk += 1;
      if (!this.sceneryTextures.length) break;
      const index = this.lastSceneryChunk;
      const key = this.sceneryTextures[index % this.sceneryTextures.length];
      const y = 82 + (index % 4) * 13;
      const item = this.add.image(GAME_WIDTH + 36, y, key)
        .setDepth(8)
        .setFlipX(index % 2 === 1)
        .setScale(index % 3 === 0 ? 1.35 : 1);
      this.scenery.push({ item, chunk: index });
    }
    const scroll = this.speed * frame * 0.42;
    for (const entry of this.scenery) {
      entry.item.x -= scroll;
      if (entry.item.x < -64) entry.item.destroy();
    }
    this.scenery = this.scenery.filter(({ item }) => item.active);
  }

  #obstacleTexture(kind) {
    return kind === 'barrier' ? 'bike-race-barrier' : kind === 'crate' ? 'bike-race-crate' : 'bike-race-oil';
  }

  #drawTrack() {
    const g = this.track;
    g.clear();
    g.fillStyle(0x252a30, 1).fillRect(0, 139, GAME_WIDTH, 131);
    g.fillStyle(0x333a40, 1).fillRect(0, 143, GAME_WIDTH, 122);
    g.fillStyle(0x6b6d64, 1).fillRect(0, 141, GAME_WIDTH, 2);
    g.fillStyle(0x6b6d64, 1).fillRect(0, 265, GAME_WIDTH, 2);
    for (let lane = 0; lane < MOTORCYCLE_LANE_COUNT; lane += 1) {
      const y = 145 + lane * 30;
      if (lane > 0) {
        g.lineStyle(1, 0xb8b9a9, 0.65);
        g.lineBetween(0, y, GAME_WIDTH, y);
      }
      for (let x = -34; x < GAME_WIDTH; x += 34) {
        const stripe = (x - this.trackOffset) % 34;
        g.fillStyle(0xe5d9bc, 0.32).fillRect(stripe, y + 13, 13, 1);
      }
      g.fillStyle(0x1d242b, 0.22).fillRect(0, y + 1, GAME_WIDTH, 1);
    }
    g.fillStyle(0xf1d8a8, 1).fillRect(6, 143, 3, 120);
    g.fillStyle(0xf1d8a8, 1).fillRect(GAME_WIDTH - 9, 143, 3, 120);
    g.lineStyle(3, 0xffedc6, 0.96).lineBetween(64, 143, 64, 263);
    g.lineStyle(1, 0x483c42, 0.9).lineBetween(68, 143, 68, 263);
  }

  #syncRacers(time) {
    for (const racer of this.racers) {
      const baseline = MOTORCYCLE_LANE_BASELINES[racer.lane];
      const targetY = Phaser.Math.Linear(baseline, MOTORCYCLE_LANE_BASELINES[racer.targetLane],
        racer.laneSwitchMs > 0 ? 1 - racer.laneSwitchMs / LANE_SWITCH_MS : 1);
      const x = this.#racerX(racer);
      racer.sprite.setPosition(x, targetY + (racer.stunMs > 0 ? Math.sin(time / 25) * 2 : 0))
        .setDepth(36 + racer.lane);
      racer.sprite.setScale(MOTORCYCLE_LANE_SCALES[racer.lane] * (racer.isPlayer ? 0.78 : 0.7));
      racer.sprite.setAngle(Math.sin(time / 160 + racer.lane) * 1.5);
      racer.labelText.setPosition(x, targetY - 35);
      const jumpLift = racer.jumpMs > 0 ? Math.sin((1 - racer.jumpMs / 620) * Math.PI) * 15 : 0;
      racer.gif?.setPosition(x, targetY - 20 - jumpLift).setDepth(48 + racer.lane);
      if (racer.vehicle) racer.vehicle.setPosition(x, targetY + 8).setScale(MOTORCYCLE_LANE_SCALES[racer.lane] * 0.78);
    }
  }

  #drawHud() {
    this.hud.clear();
    this.hud.fillStyle(0x111725, 0.88).fillRoundedRect(8, 5, GAME_WIDTH - 16, 28, 4);
    this.hud.fillStyle(0x9b85d1, 1).fillRect(17, 27, 132 * clamp(this.distance / this.raceDistance, 0, 1), 2);
    this.hud.fillStyle(0x172033, 1).fillRect(GAME_WIDTH - 76, 12, 56, 5);
    this.hud.fillStyle(0x78c9e8, 1).fillRect(GAME_WIDTH - 75, 13, 54 * this.boost / 100, 3);
    this.distanceLabel.setText('J1 · ' + Math.floor(this.distance) + ' / ' + this.raceDistance + ' M');
  }

  #emitNitroFlash(time) {
    this.lastNitroFlashAt = time;
    const y = MOTORCYCLE_LANE_BASELINES[this.player.lane] - 9;
    const burst = this.add.container(PLAYER_X - 24, y).setDepth(68);
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
    this.status.setText(playerWon ? '¡J1 GANA LA CARRERA!' : '¡GANA AXEM RED!').setFontSize(11);
    this.instructions.setText('R · REINICIAR     ENTER / ESC · MENÚ');
    this.cameras.main.flash(180, 255, 245, 218);
  }

  #text(value, x, y, color, size) {
    return this.add.text(x, y, value, {
      fontFamily: 'monospace', fontSize: size + 'px', color,
      stroke: '#111423', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(90);
  }
}
