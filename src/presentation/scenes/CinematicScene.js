import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/gameConfig.js';
import { ARENA } from '../../domain/arena/arena.js';
import { contentWidth, insetSize } from '../views/uiLayout.js';
import { DEFAULT_STAGE_ID, getStage } from '../../infrastructure/assets/stageAssetManifest.js';
import { StageView } from '../views/StageView.js';
import { spriteKeyFor } from '../../infrastructure/assets/assetManifest.js';
import { isAvailableRangerVariant } from '../../domain/rangers/rangerVariants.js';
import { spriteFacingFor } from '../../infrastructure/assets/characterAnimationData.js';
import { shouldFlip } from '../views/orientation.js';
import { playStageMusic } from '../../infrastructure/audio/GameMusic.js';

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
    this.stageId = data.stageId ?? DEFAULT_STAGE_ID;
    this.stage = getStage(this.stageId);
    this.matchSetup = {
      ...(data.matchSetup ?? {}),
      characters: [...(data.matchSetup?.characters ?? [])],
    };
    this.lineIndex = 0;
    this.transitioning = false;
  }

  /** Muestra el mismo arte Super Axem que se usará durante todo el combate. */
  #createCharacterSprite(x, character, facing) {
    return this.add.image(
      x,
      ARENA.groundY,
      spriteKeyFor(character.id, character.gender),
    )
      .setOrigin(0.5, 1)
      .setScale(1)
      .setFlipX(shouldFlip(facing, spriteFacingFor(character.id, character.gender)))
      .setDepth(100);
  }

  create() {
    playStageMusic(this, this.stage.id);
    this.stageView = new StageView(this, this.stage.id, {
      cinematic: true,
    });
    this.cameras.main.setBounds(0, 0, 640, 270);

    const [leftSelection, rightSelection] = this.matchSetup.characters;
    const normalizeCharacter = (selection) => {
      if (
        !selection ||
        typeof selection.id !== 'string' ||
        !isAvailableRangerVariant(selection.id, selection.gender)
      ) {
        throw new Error('La cinemática requiere las dos variantes canónicas de Axem.');
      }
      return { id: selection.id, gender: selection.gender };
    };
    const left = normalizeCharacter(leftSelection);
    const right = normalizeCharacter(rightSelection);

    this.leftCharacter = left;
    this.rightCharacter = right;
    this.leftSprite = this.#createCharacterSprite(106, left, 1);
    this.rightSprite = this.#createCharacterSprite(374, right, -1);

    const bobbingTargets = [this.leftSprite, this.rightSprite];
    this.tweens.add({
      targets: bobbingTargets,
      y: ARENA.groundY - 4,
      duration: 780,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // La conversación comparte el mismo margen interno que el resto de los paneles.
    const dialoguePanelWidth = 440;
    const dialogueContentWidth = contentWidth(dialoguePanelWidth);
    const dialogueTextLeft = (GAME_WIDTH - dialogueContentWidth) / 2;
    this.add.rectangle(GAME_WIDTH / 2, 222, dialoguePanelWidth, 84, 0x100d1e, 0.97)
      .setStrokeStyle(1, 0x9277a8, 0.96)
      .setScrollFactor(0)
      .setDepth(1000);
    this.add.rectangle(GAME_WIDTH / 2, 222, insetSize(dialoguePanelWidth), insetSize(84), 0x000000, 0)
      .setStrokeStyle(1, 0x4b385c, 0.72)
      .setScrollFactor(0)
      .setDepth(1001);
    this.add.rectangle(GAME_WIDTH / 2, 180, dialoguePanelWidth, 2, 0xe2b978, 0.92)
      .setScrollFactor(0)
      .setDepth(1002);

    this.stageTitle = this.add.text(GAME_WIDTH / 2, 108, this.stage.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#fff0c9',
      stroke: '#171126',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    this.location = this.add.text(GAME_WIDTH / 2, 124, this.stage.location.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#e1d8ea',
      letterSpacing: 1,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    this.tagline = this.add.text(GAME_WIDTH / 2, 138, this.stage.tagline, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#e1d8ea',
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    this.speaker = this.add.text(dialogueTextLeft, 191, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#d9a9ff',
    }).setScrollFactor(0).setDepth(1002);

    this.dialogue = this.add.text(dialogueTextLeft, 207, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f1ecdf',
      lineSpacing: 3,
      wordWrap: { width: dialogueContentWidth, useAdvancedWrap: true },
      maxLines: 3,
    }).setScrollFactor(0).setDepth(1002);

    this.progress = this.add.text(GAME_WIDTH - dialogueTextLeft, 191, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#c1b4d4',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1002);

    this.prompt = this.add.text(GAME_WIDTH / 2, 255, 'ENTER / ESPACIO: CONTINUAR    ·    ESC: OMITIR', {
      fontFamily: 'monospace',
      fontSize: '9px',
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
    this.leftSprite.setAlpha(this.leftCharacter.id === line.speaker ? 1 : 0.62);
    this.rightSprite.setAlpha(this.rightCharacter.id === line.speaker ? 1 : 0.62);

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
