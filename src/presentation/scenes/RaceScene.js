import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { maleAnimationKey, spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';
import { KENNEY_FX } from '../../infrastructure/assets/kenneyFxAssets.js';
import { playRaceMusic } from '../../infrastructure/audio/GameMusic.js';

export const MOTORCYCLE_LANE_COUNT = 4;
export const MOTORCYCLE_LANE_BASELINES = Object.freeze([151, 181, 211, 241]);
export const MOTORCYCLE_LANE_SCALES = Object.freeze([0.62, 0.76, 0.9, 1.04]);
export const MOTORCYCLE_RACE_OBSTACLES = Object.freeze([
  Object.freeze({ kind: 'barrier', lane: 0, distance: 420 }),
  Object.freeze({ kind: 'oil', lane: 2, distance: 610 }),
  Object.freeze({ kind: 'crate', lane: 1, distance: 880 }),
  Object.freeze({ kind: 'barrier', lane: 3, distance: 1120 }),
  Object.freeze({ kind: 'oil', lane: 0, distance: 1380 }),
  Object.freeze({ kind: 'crate', lane: 2, distance: 1640 }),
  Object.freeze({ kind: 'barrier', lane: 1, distance: 1910 }),
  Object.freeze({ kind: 'oil', lane: 3, distance: 2180 }),
  Object.freeze({ kind: 'crate', lane: 0, distance: 2470 }),
  Object.freeze({ kind: 'barrier', lane: 2, distance: 2760 }),
  Object.freeze({ kind: 'oil', lane: 1, distance: 3070 }),
  Object.freeze({ kind: 'crate', lane: 3, distance: 3380 }),
]);

const RACE_DISTANCE = 3800;
const PLAYER_X = 112;
const OPPONENT_X = 170;
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

export function normalizeMotorcycleLane(lane) {
  return clamp(Math.round(Number(lane) || 0), 0, MOTORCYCLE_LANE_COUNT - 1);
}

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('RaceScene');
  }

  create() {
    createRaceTextures(this);
    playRaceMusic(this, 'motorcycleRace');
    this.distance = 0;
    this.speed = 210;
    this.boost = 100;
    this.countdownMs = COUNTDOWN_MS;
    this.finished = false;
    this.trackOffset = 0;
    this.sceneryOffset = 0;
    this.obstacles = MOTORCYCLE_RACE_OBSTACLES.map((item) => ({ ...item, resolved: false, hitRacers: new Set() }));
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
    });

    this.background = this.add.graphics().setDepth(0);
    this.track = this.add.graphics().setDepth(10);
    this.scenery = [];
    this.#drawEnvironment();
    this.#drawTrack();
    this.player = this.#createRacer(RANGER_IDS.VIOLET, 'J1', 0, true);
    this.opponents = [
      this.#createRacer(RANGER_IDS.ORANGE, 'IA 1', 1, false),
      this.#createRacer(RANGER_IDS.ORANGE, 'IA 2', 2, false),
      this.#createRacer(RANGER_IDS.ORANGE, 'IA 3', 3, false),
    ];
    this.racers = [this.player, ...this.opponents];
    this.obstacleSprites = this.obstacles.map((obstacle) => this.add.image(0, 0, this.#obstacleTexture(obstacle.kind))
      .setDepth(30));
    this.hud = this.add.graphics().setDepth(80);
    this.title = this.#text('CARRERA AXEM · MOTOS', GAME_WIDTH / 2, 12, '#ffe1a5', 9);
    this.status = this.#text('3', GAME_WIDTH / 2, 112, '#fff0c9', 25);
    this.instructions = this.#text('↑ / ↓ CAMBIAR CARRIL · → / D ACELERAR · ← / A FRENAR · ESPACIO NITRO',
      GAME_WIDTH / 2, GAME_HEIGHT - 7, '#f0dfc2', 5);
    this.distanceLabel = this.#text('J1 · 0 M', 63, 18, '#e7dcff', 5);
    this.nitroLabel = this.#text('NITRO', GAME_WIDTH - 48, 8, '#a8e8ff', 4);
    this.#drawHud();
  }

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.scene.start('MenuScene');
      return;
    }
    if (this.finished) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.scene.start('MenuScene');
      if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) this.scene.restart();
      return;
    }
    if (this.countdownMs > 0) {
      this.countdownMs = Math.max(0, this.countdownMs - delta);
      const count = Math.ceil(this.countdownMs / 1000);
      this.status.setText(count ? String(count) : '¡YA!');
      if (!this.countdownMs) this.time.delayedCall(450, () => this.status?.setText(''));
      return;
    }

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
    const targetSpeed = 205 + (accelerate ? 105 : 0) - (brake ? 92 : 0) + (boosting ? 105 : 0);
    this.speed = Phaser.Math.Linear(this.speed, clamp(targetSpeed, 85, 410), Math.min(1, frame * 3.2));
    this.distance += this.speed * frame;
    this.player.distance = this.distance;
    this.boost = clamp(this.boost + (boosting ? -38 : 13) * frame, 0, 100);
    this.trackOffset = (this.trackOffset + this.speed * frame * 0.9) % 34;
    this.sceneryOffset += this.speed * frame * 0.52;

    this.#updateOpponents(time, frame);
    this.#updateObstacles(frame);
    this.#updateScenery();
    this.#drawTrack();
    this.#syncRacers(time);
    this.#drawHud();

    if (this.racers.some((racer) => racer.distance >= RACE_DISTANCE)) {
      const sorted = [...this.racers].sort((a, b) => b.distance - a.distance);
      this.#finish(sorted[0] === this.player);
    }
  }

  #createRacer(rangerId, label, lane, isPlayer) {
    const texture = rangerId === RANGER_IDS.VIOLET
      ? spriteKeyFor(rangerId, 'female')
      : maleAnimationKey(rangerId, 'bike');
    const sprite = this.add.sprite(isPlayer ? PLAYER_X : OPPONENT_X, MOTORCYCLE_LANE_BASELINES[lane], texture)
      .setOrigin(0.5, 0.82)
      .setScale(MOTORCYCLE_LANE_SCALES[lane] * (isPlayer ? 0.78 : 0.7))
      .setDepth(36 + lane);
    if (rangerId === RANGER_IDS.ORANGE && this.anims.exists(maleAnimationKey(rangerId, 'bike'))) {
      sprite.play(maleAnimationKey(rangerId, 'bike'));
    }
    const vehicle = rangerId === RANGER_IDS.VIOLET
      ? this.add.image(sprite.x, sprite.y + 8, 'bike-race-motorcycle')
        .setOrigin(0.5, 0.75).setScale(MOTORCYCLE_LANE_SCALES[lane] * 0.78).setDepth(34 + lane)
      : null;
    const labelText = this.#text(label, sprite.x, sprite.y - 27, isPlayer ? '#e3d4ff' : '#ffe0b2', 5);
    return {
      rangerId, label, lane, targetLane: lane, isPlayer, sprite, vehicle, labelText,
      distance: isPlayer ? 0 : lane * 18,
      stunMs: 0, laneSwitchMs: 0, crashed: false,
    };
  }

  #changeLane(racer, direction) {
    if (racer.laneSwitchMs > 0) return;
    racer.targetLane = normalizeMotorcycleLane(racer.lane + direction);
    if (racer.targetLane !== racer.lane) racer.laneSwitchMs = LANE_SWITCH_MS;
  }

  #updateOpponents(time, frame) {
    this.opponents.forEach((racer, index) => {
      racer.distance += (this.speed * (0.88 + index * 0.035) + Math.sin(time / (390 + index * 55)) * 15) * frame;
      racer.laneSwitchMs = Math.max(0, racer.laneSwitchMs - frame * 1000);
      const upcoming = this.obstacles.find((obstacle) => !obstacle.resolved &&
        obstacle.lane === racer.lane && obstacle.distance - this.distance < 125 &&
        obstacle.distance - this.distance > 0);
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
      const screenX = PLAYER_X + (obstacle.distance - this.distance) * 0.19;
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
        const racerX = racer.isPlayer ? PLAYER_X : OPPONENT_X;
        if (Math.abs(screenX - racerX) < (obstacle.kind === 'oil' ? 18 : 20)) {
          racer.stunMs = 720;
          if (racer.isPlayer) this.boost = Math.max(0, this.boost - 22);
          racer.distance -= 20;
          if (racer.isPlayer) this.distance = Math.max(0, this.distance - 20);
          obstacle.hitRacers.add(racer.label);
        }
      }
    });
  }

  #updateScenery() {
    if (Math.floor(this.sceneryOffset / 105) > this.lastSceneryChunk) {
      this.lastSceneryChunk = Math.floor(this.sceneryOffset / 105);
      const side = this.lastSceneryChunk % 2 ? 1 : -1;
      const texture = this.lastSceneryChunk % 4 === 0 ? 'bike-race-rock' : 'bike-race-tree';
      const item = this.add.image(side < 0 ? 12 : GAME_WIDTH - 12,
        108 + (this.lastSceneryChunk % 3) * 10, texture).setDepth(8).setScale(0.45 + (this.lastSceneryChunk % 3) * 0.1);
      this.scenery.push({ item, chunk: this.lastSceneryChunk });
    }
    for (const entry of this.scenery) {
      entry.item.x -= this.speed * 0.0005 * 16;
      if (entry.item.x < -40 || entry.item.x > GAME_WIDTH + 40) entry.item.destroy();
    }
    this.scenery = this.scenery.filter(({ item }) => item.active);
  }

  #obstacleTexture(kind) {
    return kind === 'barrier' ? 'bike-race-barrier' : kind === 'crate' ? 'bike-race-crate' : 'bike-race-oil';
  }

  #drawEnvironment() {
    const g = this.background;
    g.fillGradientStyle(0x1b2a3c, 0x1b2a3c, 0x546a5d, 0x546a5d, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x182d29, 1).fillTriangle(0, 134, 76, 35, 160, 134);
    g.fillStyle(0x29443a, 1).fillTriangle(100, 137, 230, 24, 350, 137);
    g.fillStyle(0x1d352d, 1).fillTriangle(300, 140, 414, 43, 480, 140);
    g.fillStyle(0x66805a, 1).fillRect(0, 119, GAME_WIDTH, 18);
    g.fillStyle(0x273b31, 1).fillRect(0, 134, GAME_WIDTH, 136);
    g.fillStyle(0x8d8a79, 1).fillRect(0, 136, GAME_WIDTH, 4);
    for (let x = 0; x < GAME_WIDTH; x += 42) {
      g.fillStyle(0xc0ae85, 0.5).fillRect(x, 122 + (x % 3) * 2, 15, 2);
    }
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
  }

  #syncRacers(time) {
    for (const racer of this.racers) {
      const baseline = MOTORCYCLE_LANE_BASELINES[racer.lane];
      const targetY = Phaser.Math.Linear(baseline, MOTORCYCLE_LANE_BASELINES[racer.targetLane],
        racer.laneSwitchMs > 0 ? 1 - racer.laneSwitchMs / LANE_SWITCH_MS : 1);
      const x = racer.isPlayer ? PLAYER_X : OPPONENT_X + Math.sin(time / 500 + racer.lane) * 5;
      racer.sprite.setPosition(x, targetY + (racer.stunMs > 0 ? Math.sin(time / 25) * 2 : 0));
      racer.sprite.setScale(MOTORCYCLE_LANE_SCALES[racer.lane] * (racer.isPlayer ? 0.78 : 0.7));
      if (racer.rangerId === RANGER_IDS.VIOLET) racer.sprite.setAngle(Math.sin(time / 160) * 1.5);
      racer.labelText.setPosition(x, targetY - 27);
      if (racer.vehicle) racer.vehicle.setPosition(x, targetY + 8).setScale(MOTORCYCLE_LANE_SCALES[racer.lane] * 0.78);
    }
  }

  #drawHud() {
    this.hud.clear();
    this.hud.fillStyle(0x111725, 0.88).fillRoundedRect(8, 5, GAME_WIDTH - 16, 28, 4);
    this.hud.fillStyle(0x9b85d1, 1).fillRect(17, 27, 132 * clamp(this.distance / RACE_DISTANCE, 0, 1), 2);
    this.hud.fillStyle(0x172033, 1).fillRect(GAME_WIDTH - 76, 12, 56, 5);
    this.hud.fillStyle(0x78c9e8, 1).fillRect(GAME_WIDTH - 75, 13, 54 * this.boost / 100, 3);
    this.distanceLabel.setText('J1 · ' + Math.floor(this.distance) + ' M');
  }

  #finish(playerWon) {
    this.finished = true;
    this.status.setText(playerWon ? '¡J1 GANA LA CARRERA!' : '¡GANA LA IA!').setFontSize(11);
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
