import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import { maleAnimationKey } from '../../infrastructure/assets/assetManifest.js';
import { KENNEY_FX } from '../../infrastructure/assets/kenneyFxAssets.js';
import { StageView } from '../views/StageView.js';

const RACE_LENGTH = 1100;
const TRACK_START = 66;
const TRACK_END = 416;
const TRACK_WIDTH = TRACK_END - TRACK_START;
const LANES = Object.freeze([174, 220]);

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('RaceScene');
  }

  create() {
    this.stage = new StageView(this, STAGE_IDS.MEADOW, { cinematic: true });
    this.distance = 0;
    this.rivalDistance = 0;
    this.boost = 100;
    this.trackOffset = 0;
    this.countdownMs = 3000;
    this.finished = false;
    this.particleTimer = 0;
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.track = this.add.graphics().setDepth(20);
    this.#drawTrack();
    this.player = this.#createRacer(RANGER_IDS.VIOLET, LANES[0], 0x9e82e5);
    this.rival = this.#createRacer(RANGER_IDS.ORANGE, LANES[1], 0xe98a48);
    this.playerLabel = this.#text('AXEM VIOLETA', 24, LANES[0] - 19, '#d7c4ff', 6).setOrigin(0, 0.5);
    this.rivalLabel = this.#text('AXEM NARANJA', 24, LANES[1] - 19, '#ffc28b', 6).setOrigin(0, 0.5);
    this.playerProgress = this.add.graphics().setDepth(50);
    this.rivalProgress = this.add.graphics().setDepth(50);

    this.title = this.#text('CARRERA AXEM', GAME_WIDTH / 2, 23, '#ffe0a1', 12);
    this.status = this.#text('3', GAME_WIDTH / 2, 112, '#fff1c9', 28);
    this.controls = this.#text('← / A FRENAR   ·   → / D ACELERAR   ·   ESPACIO NITRO', GAME_WIDTH / 2, 257, '#e5d7f0', 6);
    this.boostLabel = this.#text('NITRO', GAME_WIDTH - 28, 47, '#9fe4ff', 6);
    this.boostBar = this.add.graphics().setDepth(50);
  }

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.scene.start('MenuScene');
      return;
    }

    if (this.finished) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.scene.start('MenuScene');
      if (Phaser.Input.Keyboard.JustDown(this.keys.r)) this.scene.restart();
      return;
    }

    if (this.countdownMs > 0) {
      this.countdownMs = Math.max(0, this.countdownMs - delta);
      const count = Math.ceil(this.countdownMs / 1000);
      this.status.setText(count ? String(count) : '¡YA!');
      if (this.countdownMs === 0) {
        this.time.delayedCall(550, () => this.status.setText(''));
      }
      this.stage.update(time, 0);
      return;
    }

    const accelerate = this.keys.right.isDown || this.keys.d.isDown;
    const brake = this.keys.left.isDown || this.keys.a.isDown;
    const boosting = this.keys.space.isDown && this.boost > 0;
    const speed = Phaser.Math.Clamp(184 + (accelerate ? 88 : 0) - (brake ? 84 : 0) + (boosting ? 115 : 0), 82, 387);
    const frameTime = Math.min(delta, 50) / 1000;

    this.distance += speed * frameTime;
    this.rivalDistance += (220 + Math.sin(time / 460) * 24) * frameTime;
    this.boost = Phaser.Math.Clamp(this.boost + (boosting ? -37 : 14) * frameTime, 0, 100);
    this.trackOffset = (this.trackOffset + speed * frameTime * 1.7) % 30;
    this.#drawTrack();
    this.#positionRacer(this.player, this.distance);
    this.#positionRacer(this.rival, this.rivalDistance);
    this.#drawProgress();
    this.#drawBoost();
    this.stage.update(time, 0);

    this.particleTimer += delta;
    if (this.particleTimer >= 125) {
      this.particleTimer = 0;
      this.#trailParticle(this.player, boosting ? KENNEY_FX.spark.key : KENNEY_FX.dirt.key, boosting ? 0x99dcff : 0xc4b28e);
    }

    if (this.distance >= RACE_LENGTH || this.rivalDistance >= RACE_LENGTH) {
      this.#finish(this.distance >= this.rivalDistance ? '¡GANASTE, AXEM VIOLETA!' : 'AXEM NARANJA GANA LA CARRERA');
    }
  }

  #createRacer(rangerId, y, tint) {
    const key = maleAnimationKey(rangerId, 'bike');
    const racer = this.add.sprite(TRACK_START, y, key)
      .setOrigin(0.5, 0.78)
      .setScale(0.57)
      .setDepth(35);
    if (this.anims.exists(key)) racer.play(key);
    racer.setData('laneY', y);
    racer.setData('tint', tint);
    return racer;
  }

  #positionRacer(racer, distance) {
    const progress = Phaser.Math.Clamp(distance / RACE_LENGTH, 0, 1);
    racer.setPosition(Math.round(TRACK_START + progress * TRACK_WIDTH), racer.getData('laneY'));
  }

  #drawTrack() {
    const graphics = this.track;
    graphics.clear();
    graphics.fillStyle(0x151321, 0.97);
    graphics.fillRect(14, 145, GAME_WIDTH - 28, 99);
    graphics.lineStyle(1, 0x9a78ac, 0.9);
    graphics.strokeRect(14, 145, GAME_WIDTH - 28, 99);
    graphics.fillStyle(0x292633, 1);
    graphics.fillRect(20, 151, GAME_WIDTH - 40, 87);

    graphics.lineStyle(1, 0x726677, 0.7);
    graphics.lineBetween(20, 197, GAME_WIDTH - 20, 197);
    for (let x = TRACK_START - 30; x < TRACK_END; x += 30) {
      const stripeX = Math.round(x - this.trackOffset);
      graphics.fillStyle(0xf0d9a8, 0.72);
      graphics.fillRect(stripeX, 196, 13, 2);
    }

    for (let y = 151; y < 238; y += 8) {
      const row = Math.floor((y - 151) / 8);
      for (let column = 0; column < 2; column++) {
        if ((row + column) % 2 === 0) graphics.fillStyle(0xf2d9a4, 1);
        else graphics.fillStyle(0x522f62, 1);
        graphics.fillRect(TRACK_END + column * 5, y, 5, 8);
      }
    }
  }

  #drawProgress() {
    const draw = (graphics, distance, y, color) => {
      graphics.clear();
      graphics.fillStyle(0x0d0b16, 0.95);
      graphics.fillRect(78, y, 278, 4);
      graphics.fillStyle(color, 1);
      graphics.fillRect(79, y + 1, Math.round(276 * Phaser.Math.Clamp(distance / RACE_LENGTH, 0, 1)), 2);
    };
    draw(this.playerProgress, this.distance, LANES[0] - 26, 0x9d80ed);
    draw(this.rivalProgress, this.rivalDistance, LANES[1] - 26, 0xef9454);
  }

  #drawBoost() {
    this.boostBar.clear();
    this.boostBar.fillStyle(0x171321, 1);
    this.boostBar.fillRect(GAME_WIDTH - 60, 52, 48, 5);
    this.boostBar.fillStyle(0x63c9ef, 1);
    this.boostBar.fillRect(GAME_WIDTH - 59, 53, Math.round(46 * (this.boost / 100)), 3);
  }

  #trailParticle(racer, texture, tint) {
    if (!this.textures.exists(texture)) return;
    const particle = this.add.image(racer.x - 18, racer.y + 1, texture)
      .setTint(tint)
      .setScale(texture === KENNEY_FX.dirt.key ? 0.28 : 0.2)
      .setAlpha(0.8)
      .setDepth(30);
    this.tweens.add({
      targets: particle,
      x: particle.x - Phaser.Math.Between(13, 25),
      y: particle.y + Phaser.Math.Between(-3, 5),
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => particle.destroy(),
    });
  }

  #finish(message) {
    this.finished = true;
    this.status.setText(message).setFontSize(11).setColor('#fff0c9');
    this.controls.setText('R · VOLVER A CORRER     ENTER · MENÚ     ESC · MENÚ').setColor('#fff0c9');
    this.cameras.main.flash(150, 255, 246, 216);
  }

  #text(value, x, y, color, size) {
    return this.add.text(x, y, value, {
      fontFamily: 'monospace',
      fontSize: size + 'px',
      color,
      stroke: '#120d1b',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setDepth(60);
  }
}
