import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import landIdleGifUrl from '../../../art/source/sprites/results/male/orange/idle.gif?url';
import landPoseGifUrl from '../../../art/source/sprites/results/male/orange/pose.gif?url';
import landRunGifUrl from '../../../art/source/sprites/results/male/orange/run.gif?url';
import landDashGifUrl from '../../../art/source/sprites/results/male/orange/dash.gif?url';
import landJumpGifUrl from '../../../art/source/sprites/results/male/orange/jump.gif?url';
import landRollGifUrl from '../../../art/source/sprites/results/male/orange/roll.gif?url';
import { STAGE_TILESET_ASSETS } from '../../infrastructure/assets/stageAssetManifest.js';
import { createProceduralBackground } from '../../infrastructure/graphics/StageAssetTextureFactory.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { genderForRanger } from '../../domain/rangers/rangerVariants.js';
import { spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';
import { playRaceMusic } from '../../infrastructure/audio/GameMusic.js';

const FINISH_DISTANCE = 1200;
const TRACK_START_X = 62;
const TRACK_FINISH_X = 420;
const TRACK_SPAN = TRACK_FINISH_X - TRACK_START_X;
const RUNNER_LANES = Object.freeze([170, 218]);
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

function createTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

/** Sprites pixel-art propios de una pista de atletismo; no modifican las colisiones del combate. */
function createLandRaceTextures(scene) {
  createTexture(scene, 'land-race-crowd', 160, 34, (graphics) => {
    graphics.fillStyle(0x20243b, 1).fillRect(0, 0, 160, 34);
    const colors = [0xe8a36c, 0x8e83cf, 0x7cc1a4, 0xe7d28c, 0xd57a83, 0x8ab7db];
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 32; column += 1) {
        const x = column * 5 + (row % 2) * 2;
        const y = 3 + row * 7;
        const color = colors[(column * 3 + row * 5) % colors.length];
        graphics.fillStyle(0x151a2b, 1).fillRect(x, y + 2, 4, 4);
        graphics.fillStyle(color, 1).fillRect(x + 1, y, 3, 4);
        graphics.fillStyle(0xf0d9c0, 1).fillRect(x + 1, y - 1, 2, 2);
      }
    }
  });

  createTexture(scene, 'land-race-hurdle', 34, 24, (graphics) => {
    graphics.fillStyle(0x353344, 1).fillRect(5, 5, 3, 18);
    graphics.fillRect(26, 5, 3, 18);
    graphics.fillStyle(0xe9e3d5, 1).fillRect(3, 4, 29, 4);
    graphics.fillStyle(0xd66c58, 1).fillRect(7, 4, 5, 4);
    graphics.fillRect(18, 4, 5, 4);
    graphics.fillStyle(0xf6d18c, 1).fillRect(5, 21, 7, 2);
    graphics.fillRect(23, 21, 7, 2);
  });

  createTexture(scene, 'land-race-roll-gate', 34, 17, (graphics) => {
    graphics.fillStyle(0x384052, 1).fillRect(4, 11, 3, 6);
    graphics.fillRect(27, 11, 3, 6);
    graphics.fillStyle(0xf1c46f, 1).fillRect(3, 6, 29, 5);
    graphics.fillStyle(0x9a5266, 1).fillRect(8, 6, 5, 5);
    graphics.fillRect(21, 6, 5, 5);
    graphics.fillStyle(0xffe7af, 1).fillRect(14, 7, 6, 2);
  });

  createTexture(scene, 'land-race-start-block', 24, 12, (graphics) => {
    graphics.fillStyle(0x272b3b, 1).fillRect(2, 7, 20, 5);
    graphics.fillStyle(0xe0b46e, 1).fillRect(4, 4, 7, 4);
    graphics.fillRect(14, 2, 7, 6);
    graphics.fillStyle(0xf7e3b4, 1).fillRect(5, 4, 5, 1);
    graphics.fillRect(15, 2, 5, 1);
  });

  createTexture(scene, 'land-race-cone', 12, 16, (graphics) => {
    graphics.fillStyle(0x333344, 1).fillRect(1, 14, 10, 2);
    graphics.fillStyle(0xe47a4f, 1).fillRect(5, 3, 3, 11);
    graphics.fillRect(3, 8, 7, 3);
    graphics.fillStyle(0xffe0a0, 1).fillRect(4, 8, 5, 2);
    graphics.fillStyle(0xf5b36d, 1).fillRect(5, 2, 3, 2);
  });

  createTexture(scene, 'land-race-banner', 88, 20, (graphics) => {
    graphics.fillStyle(0x19182a, 1).fillRect(0, 0, 88, 20);
    graphics.fillStyle(0x9b79c5, 1).fillRect(0, 0, 88, 2);
    graphics.fillStyle(0xdba86e, 1).fillRect(0, 17, 88, 3);
    graphics.fillStyle(0x49365f, 1).fillRect(3, 4, 82, 11);
    graphics.fillStyle(0xf3dba9, 1).fillRect(7, 7, 8, 2);
    graphics.fillRect(18, 7, 4, 2);
    graphics.fillRect(25, 7, 7, 2);
    graphics.fillRect(36, 7, 4, 2);
    graphics.fillRect(43, 7, 7, 2);
    graphics.fillRect(54, 7, 4, 2);
    graphics.fillRect(61, 7, 8, 2);
    graphics.fillRect(73, 7, 8, 2);
    graphics.fillRect(13, 11, 62, 1);
  });

  createTexture(scene, 'land-race-finish-arch', 34, 72, (graphics) => {
    graphics.fillStyle(0x28273a, 1).fillRect(3, 0, 5, 71);
    graphics.fillRect(26, 0, 5, 71);
    graphics.fillStyle(0xe8d2a9, 1).fillRect(0, 0, 34, 8);
    graphics.fillStyle(0x8a5caa, 1).fillRect(2, 8, 30, 4);
    graphics.fillStyle(0xf0dfb9, 1).fillRect(5, 1, 5, 6);
    graphics.fillRect(15, 1, 5, 6);
    graphics.fillRect(25, 1, 5, 6);
    graphics.fillStyle(0xd36d5d, 1).fillRect(5, 14, 2, 48);
    graphics.fillRect(27, 14, 2, 48);
    graphics.fillStyle(0xedd8ae, 1).fillRect(8, 15, 2, 47);
    graphics.fillRect(24, 15, 2, 47);
  });
}

export class LandRaceScene extends Phaser.Scene {
  constructor() {
    super('LandRaceScene');
  }

  create() {
    playRaceMusic(this, 'landRace');
    createLandRaceTextures(this);
    const selectedStage = Phaser.Utils.Array.GetRandom(STAGE_TILESET_ASSETS);
    if (selectedStage) {
      const stageKey = 'race-stage-land-' + this.game.loop.frame;
      createProceduralBackground(this, selectedStage, {
        key: stageKey,
        seed: Phaser.Math.Between(1, 0x7fffffff),
      });
      this.add.image(0, 0, stageKey).setOrigin(0).setDepth(-100)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
    this.#drawStadium();
    this.distance = 0;
    this.finishDistance = Phaser.Math.Between(1250, 1600);
    this.obstacles = this.#generateRaceObstacles();
    this.countdownMs = COUNTDOWN_MS;
    this.finished = false;
    this.player = this.#createRacer(RANGER_IDS.ORANGE, RUNNER_LANES[0], true);
    this.rival = this.#createRacer(RANGER_IDS.ORANGE, RUNNER_LANES[1], false);
    this.#createTrackObjects();

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
    });

    this.hudGraphics = this.add.graphics().setDepth(80);
    this.title = this.#text('CARRERA TERRESTRE', GAME_WIDTH / 2, 20, '#ffe2aa', 11);
    this.playerName = this.#text('J1 · AXEM NARANJA', 87, 34, '#ffc58e', 6);
    this.rivalName = this.#text('RIVAL · AXEM NARANJA', 393, 34, '#ffc58e', 6);
    this.status = this.#text('3', GAME_WIDTH / 2, 120, '#fff0c9', 24);
    this.staminaLabel = this.#text('RESISTENCIA', GAME_WIDTH / 2, 70, '#b8e7f4', 5);
    this.controls = this.#text(
      'D/→ CORRER  ·  A/← FRENAR  ·  W/↑ SALTAR  ·  S/↓ RODAR',
      GAME_WIDTH / 2,
      GAME_HEIGHT - 8,
      '#f0dfc2',
      5,
    );
    this.#drawHud();
  }

  update(_time, delta) {
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
      if (this.countdownMs === 0) {
        this.time.delayedCall(500, () => {
          if (!this.finished && this.status.active) this.status.setText('');
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
    this.#syncRacer(this.player);
    this.#syncRacer(this.rival);
    this.#drawHud();

    if (this.player.distance >= this.finishDistance || this.rival.distance >= this.finishDistance) {
      this.#finish(this.player.distance >= this.rival.distance);
    }
  }

  #drawStadium() {
    this.add.image(82, 91, 'land-race-crowd').setScale(1.45).setAlpha(0.95);
    this.add.image(240, 91, 'land-race-crowd').setScale(1.45).setAlpha(0.95);
    this.add.image(398, 91, 'land-race-crowd').setScale(1.45).setAlpha(0.95);
    this.add.rectangle(GAME_WIDTH / 2, 117, GAME_WIDTH, 7, 0x111a2d);
    this.add.image(GAME_WIDTH / 2, 128, 'land-race-banner').setScale(1.05);

    const lights = this.add.graphics().setDepth(4);
    [28, 452].forEach((x) => {
      lights.fillStyle(0x101526, 1).fillRect(x - 2, 39, 4, 72);
      lights.fillStyle(0xf6e4af, 0.9).fillRect(x - 9, 37, 18, 4);
      lights.fillStyle(0xffeec6, 0.18).fillCircle(x, 54, 19);
    });

    this.add.rectangle(GAME_WIDTH / 2, 143, GAME_WIDTH, 18, 0x326344);
    this.add.rectangle(GAME_WIDTH / 2, 153, GAME_WIDTH, 5, 0x7a985d);
    this.add.rectangle(GAME_WIDTH / 2, 199, GAME_WIDTH, 98, 0x9c4c4d);
    this.add.rectangle(GAME_WIDTH / 2, 199, GAME_WIDTH, 92, 0xad5b56);
    this.add.rectangle(GAME_WIDTH / 2, 199, GAME_WIDTH, 2, 0xe5c8a4, 0.7);

    const laneLines = this.add.graphics().setDepth(8);
    laneLines.lineStyle(1, 0xf2dfc5, 0.75);
    laneLines.lineBetween(0, 194, GAME_WIDTH, 194);
    laneLines.lineBetween(0, 148, GAME_WIDTH, 148);
    laneLines.lineBetween(0, 244, GAME_WIDTH, 244);
    for (let x = 0; x < GAME_WIDTH; x += 28) {
      laneLines.fillStyle(0xf4dfc2, 0.35).fillRect(x, 171, 12, 1);
      laneLines.fillRect(x + 12, 218, 12, 1);
    }

    this.add.image(12, 153, 'land-race-cone').setOrigin(0.5, 1).setScale(1.2);
    this.add.image(GAME_WIDTH - 12, 153, 'land-race-cone').setOrigin(0.5, 1).setScale(1.2);
    this.add.image(TRACK_FINISH_X + 17, 194, 'land-race-finish-arch').setOrigin(0.5, 0.5).setDepth(25);

    const finish = this.add.graphics().setDepth(12);
    for (let row = 0; row < 10; row += 1) {
      finish.fillStyle(row % 2 === 0 ? 0xf3e6cb : 0x393143, 1);
      finish.fillRect(TRACK_FINISH_X - 2, 151 + row * 9, 4, 9);
    }
  }

  #createRacer(rangerId, laneY, isPlayer) {
    const idleKey = spriteKeyFor(rangerId, genderForRanger(rangerId));
    const sprite = this.add.sprite(TRACK_START_X, laneY + RUNNER_FOOT_OFFSET, idleKey)
      .setOrigin(0.5, 1)
      .setDepth(42);
    const shadow = this.add.ellipse(TRACK_START_X, laneY + RUNNER_FOOT_OFFSET, 34, 6, 0x241b2a, 0.52)
      .setDepth(31);

    const racerGif = this.add.dom(TRACK_START_X, laneY - 28).createFromHTML(
      '<img src="' + landIdleGifUrl + '" alt="Axem Naranja" style="width:48px;height:68px;object-fit:contain;image-rendering:pixelated;pointer-events:none;">',
    ).setDepth(44);
    const racer = {
      rangerId,
      gender: genderForRanger(rangerId),
      gif: racerGif,
      laneY,
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
    };
    this.#setMode(racer, 'idle');
    return racer;
  }


  #generateRaceObstacles() {
    const obstacles = [];
    let distance = 145;
    let index = 0;
    while (distance < this.finishDistance - 90) {
      const action = Phaser.Math.Between(0, 1) === 0 ? 'jump' : 'roll';
      obstacles.push({
        distance,
        action,
        type: action === 'jump' ? 'hurdle' : 'roll-gate',
      });
      distance += Phaser.Math.Between(145, 235);
      index += 1;
    }
    return obstacles;
  }

  #createTrackObjects() {
    for (const racer of [this.player, this.rival]) {
      racer.startBlock = this.add.image(TRACK_START_X - 11, racer.laneY + 17, 'land-race-start-block')
        .setDepth(30);
      racer.obstacleSprites = this.obstacles.map((obstacle) => {
        const texture = obstacle.type === 'hurdle' ? 'land-race-hurdle' : 'land-race-roll-gate';
        const y = racer.laneY + RUNNER_FOOT_OFFSET - (obstacle.type === 'hurdle' ? 8 : 4);
        return this.add.image(this.#worldToScreen(obstacle.distance), y, texture)
          .setDepth(34);
      });
    }
  }

  #worldToScreen(distance) {
    return TRACK_START_X + (distance / this.finishDistance) * TRACK_SPAN;
  }

  #setMode(racer, mode) {
    if (racer.mode === mode) return;
    const gifByMode = {
      idle: landIdleGifUrl,
      walk: landPoseGifUrl,
      run: landRunGifUrl,
      dash: landDashGifUrl,
      jump: landJumpGifUrl,
      roll: landRollGifUrl,
    };
    const image = racer.gif?.node?.querySelector('img');
    if (image && gifByMode[mode]) image.src = gifByMode[mode];
    racer.sprite.stop();
    racer.sprite.setVisible(false);
    racer.mode = mode;
  }

  #startAction(racer, action) {
    if (racer.actionRemainingMs > 0 || racer.stumbleMs > 0 || this.finished) return;
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

    const obstacle = LAND_RACE_OBSTACLES[racer.obstacleIndex];
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
      racer.obstacleIndex += 1;
    }

    if (racer.startBlock && racer.distance > 35) racer.startBlock.setVisible(false);
  }

  #syncRacer(racer) {
    const x = this.#worldToScreen(racer.distance);
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

    racer.sprite.setPosition(Math.round(x), Math.round(groundY - lift - movingBob));
    racer.gif?.setPosition(Math.round(x), Math.round(groundY - lift - movingBob - 31));
    racer.shadow.setPosition(Math.round(x), groundY + 1);
    racer.shadow.setScale(1 - lift / 90, 1);
    if (racer.actionMode === 'roll') racer.sprite.setScale(0.9, 0.68);
    else racer.sprite.setScale(racer.mode === 'run' || racer.mode === 'walk' ? 0.82 : 0.9);
  }

  #drawHud() {
    this.hudGraphics.clear();
    const drawProgress = (x, y, width, distance, color) => {
      this.hudGraphics.fillStyle(0x101626, 0.95).fillRect(x, y, width, 4);
      this.hudGraphics.fillStyle(color, 1).fillRect(x + 1, y + 1,
        Math.round((width - 2) * Phaser.Math.Clamp(distance / this.finishDistance, 0, 1)), 2);
    };
    drawProgress(26, 42, 122, this.player.distance, 0xf0a064);
    drawProgress(332, 42, 122, this.rival.distance, 0xf0a064);
    this.hudGraphics.fillStyle(0x121c2c, 1).fillRect(193, 77, 94, 5);
    this.hudGraphics.fillStyle(0x72c9e7, 1).fillRect(194, 78,
      Math.round(92 * this.player.stamina / STAMINA_MAX), 3);
  }

  #finish(playerWon) {
    this.finished = true;
    this.status.setText(playerWon ? '¡J1 GANA LA CARRERA!' : '¡GANA AXEM NARANJA!')
      .setFontSize(11)
      .setColor('#fff0c9');
    this.controls.setText('R · VOLVER A CORRER     ENTER / ESC · MENÚ').setColor('#fff0c9');
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
