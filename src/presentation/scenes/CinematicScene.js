import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/gameConfig.js';
import { STAGE_IDS, getStage } from '../../domain/arena/stageCatalog.js';
import { StageView } from '../views/StageView.js';

const SPEAKERS = {
  violet: { name: 'AXEM VIOLET', color: '#d9a9ff', tint: 0xe6d4ff },
  orange: { name: 'AXEM ORANGE', color: '#ffc17e', tint: 0xffdfbd },
};

/** Introducción breve del escenario: diálogo entre los dos rangers antes del combate. */
export class CinematicScene extends Phaser.Scene {
  constructor() {
    super('CinematicScene');
    this.lineIndex = 0;
    this.transitioning = false;
    this.matchSetup = {};
  }

  init(data = {}) {
    this.stageId = data.stageId ?? STAGE_IDS.RUINS;
    this.stage = getStage(this.stageId);
    this.matchSetup = {
      ...(data.matchSetup ?? {}),
      characters: [...(data.matchSetup?.characters ?? [])],
    };
    this.lineIndex = 0;
    this.transitioning = false;
  }

  create() {
    this.stageView = new StageView(this, this.stage.id);
    this.cameras.main.setBounds(0, 0, 640, 270);

    this.violet = this.add
      .image(106, 232, 'ranger-violet')
      .setOrigin(0.5, 1)
      .setScale(1)
      .setFlipX(true)
      .setDepth(100);
    this.orange = this.add
      .image(374, 232, 'ranger-orange')
      .setOrigin(0.5, 1)
      .setScale(1)
      .setDepth(100);

    // La conversación queda siempre anclada a una franja inferior.
    this.add.rectangle(GAME_WIDTH / 2, 222, 448, 84, 0x0c0a19, 0.94)
      .setStrokeStyle(1, 0x78658f, 0.95)
      .setScrollFactor(0)
      .setDepth(1000);
    this.add.rectangle(GAME_WIDTH / 2, 180, 448, 3, 0xe2b978, 0.9)
      .setScrollFactor(0)
      .setDepth(1001);

    this.stageTitle = this.add.text(GAME_WIDTH / 2, 108, this.stage.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#fff0c9',
      stroke: '#171126',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    this.location = this.add.text(GAME_WIDTH / 2, 124, this.stage.location.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#d0c4dc',
      letterSpacing: 1,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    this.tagline = this.add.text(GAME_WIDTH / 2, 138, this.stage.tagline, {
      fontFamily: 'monospace',
      fontSize: '5px',
      color: '#d0c4dc',
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    this.speaker = this.add.text(32, 191, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#d9a9ff',
    }).setScrollFactor(0).setDepth(1002);

    this.dialogue = this.add.text(32, 207, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f1ecdf',
      lineSpacing: 3,
      wordWrap: { width: 405, useAdvancedWrap: true },
      maxLines: 3,
    }).setScrollFactor(0).setDepth(1002);

    this.progress = this.add.text(GAME_WIDTH - 32, 191, '', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#9c91b3',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1002);

    this.prompt = this.add.text(GAME_WIDTH / 2, 259, 'ENTER / ESPACIO: CONTINUAR    ·    ESC: OMITIR', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#fff0c9',
      stroke: '#0d0b16',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    this.keys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
    });
    this.input.on('pointerdown', () => this.#advance());
    this.#showLine();
    this.cameras.main.fadeIn(180, 0, 0, 0);
  }

  update(time) {
    this.stageView.update(time, 0);
    this.prompt.setAlpha(0.65 + (Math.sin(time / 230) + 1) * 0.17);

    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.#startMatch();
      return;
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space)
    ) {
      this.#advance();
    }
  }

  #showLine() {
    const line = this.stage.dialogue[this.lineIndex];
    const speaker = SPEAKERS[line.speaker];
    this.speaker.setText(speaker.name).setColor(speaker.color);
    this.dialogue.setText(line.text).setAlpha(0);
    this.progress.setText(String(this.lineIndex + 1).padStart(2, '0') + ' / ' + this.stage.dialogue.length);
    this.violet.setAlpha(line.speaker === 'violet' ? 1 : 0.62);
    this.orange.setAlpha(line.speaker === 'orange' ? 1 : 0.62);

    this.tweens.add({
      targets: this.dialogue,
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut',
    });
  }

  #advance() {
    if (this.transitioning) return;
    this.lineIndex += 1;
    if (this.lineIndex >= this.stage.dialogue.length) {
      this.#startMatch();
      return;
    }
    this.#showLine();
  }

  #startMatch() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.scene.start('FightScene', {
      stageId: this.stage.id,
      matchSetup: this.matchSetup,
    });
  }
}
