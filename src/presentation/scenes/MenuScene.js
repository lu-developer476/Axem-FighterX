import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/gameConfig.js';

const PORTFOLIO_URL = 'https://lu-dev-portfolio.vercel.app/';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    this.page = 'home';
    this.buttons = [];
    this.selectedIndex = 0;
  }

  create() {
    this.#createBackdrop();
    this.ui = this.add.container(0, 0);
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
    });
    this.#showHome();
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) this.#moveSelection(-1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) this.#moveSelection(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.#activateSelection();

    if (Phaser.Input.Keyboard.JustDown(this.keys.escape) && this.page !== 'home') {
      this.#showHome();
    }
  }

  #createBackdrop() {
    this.add.image(0, 0, 'stage-sky')
      .setOrigin(0, 0)
      .setDepth(-100);

    this.add.image(0, 0, 'stage-far')
      .setOrigin(0, 0)
      .setDisplaySize(GAME_WIDTH, 270)
      .setAlpha(0.82)
      .setDepth(-90);

    this.add.image(0, 36, 'stage-mid')
      .setOrigin(0, 0)
      .setDisplaySize(GAME_WIDTH, 234)
      .setAlpha(0.9)
      .setDepth(-80);

    this.add.image(78, 231, 'ranger-violet')
      .setOrigin(0.5, 1)
      .setScale(0.78)
      .setAlpha(0.9)
      .setDepth(-20);

    this.add.image(GAME_WIDTH - 78, 231, 'ranger-orange')
      .setOrigin(0.5, 1)
      .setScale(0.78)
      .setAlpha(0.9)
      .setDepth(-20);

    this.add.tileSprite(0, 226, GAME_WIDTH, 44, 'stage-floor')
      .setOrigin(0, 0)
      .setDepth(-10);

    this.add.rectangle(0, 0, GAME_WIDTH, 270, 0x090616, 0.24)
      .setOrigin(0, 0)
      .setDepth(-5);

    this.add.text(GAME_WIDTH / 2, 27, 'Axem FighterX', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fff0c9',
      stroke: '#352044',
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#090611', blur: 0, fill: true },
    }).setOrigin(0.5).setDepth(-1);

    const titleTexture = this.textures.get('title-art').getSourceImage();
    const titleScale = Math.min(0.55, 230 / titleTexture.width, 34 / titleTexture.height);
    this.add.image(GAME_WIDTH / 2, 59, 'title-art')
      .setScale(titleScale)
      .setAlpha(0.92)
      .setDepth(-1);

    this.add.text(GAME_WIDTH / 2, 88, 'RUINAS DE MEDIANOCHE  ·  BATALLA LOCAL', {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#c8b9dc',
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(-1);

    this.add.rectangle(GAME_WIDTH / 2, 250, GAME_WIDTH, 40, 0x080611, 0.91)
      .setStrokeStyle(1, 0x55456e, 0.9)
      .setDepth(-1);
  }

  #beginPage(title, width = 282, height = 120) {
    this.ui.removeAll(true);
    this.buttons = [];
    this.selectedIndex = 0;
    const panel = this.add.rectangle(GAME_WIDTH / 2, 171, width, height, 0x100b24, 0.94)
      .setStrokeStyle(2, 0x7b699b, 0.95);
    this.ui.add(panel);

    const inset = this.add.rectangle(GAME_WIDTH / 2, 171, width - 8, height - 8, 0x100b24, 0)
      .setStrokeStyle(1, 0x3e315e, 0.9);
    this.ui.add(inset);

    this.#addText(title, GAME_WIDTH / 2, 122, {
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#f7cf83',
      letterSpacing: 1,
    });
  }

  #addText(value, x, y, style = {}) {
    const text = this.add.text(x, y, value, {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#e7def5',
      align: 'center',
      ...style,
    }).setOrigin(0.5);
    this.ui.add(text);
    return text;
  }

  #addButton(title, y, action) {
    const box = this.add.rectangle(GAME_WIDTH / 2, y, 210, 18, 0x241b3c, 0.98)
      .setStrokeStyle(1, 0x62527e, 1);
    const label = this.add.text(GAME_WIDTH / 2, y, title, {
      fontFamily: 'monospace',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#d9cde9',
      align: 'center',
    }).setOrigin(0.5);
    const hitArea = this.add.rectangle(GAME_WIDTH / 2, y, 210, 18, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    const index = this.buttons.length;
    this.buttons.push({ title, box, label, action });
    hitArea.on('pointerover', () => {
      this.selectedIndex = index;
      this.#refreshButtons();
    });
    hitArea.on('pointerdown', () => {
      this.selectedIndex = index;
      this.#refreshButtons();
      this.#activateSelection();
    });

    this.ui.add([box, label, hitArea]);
    this.#refreshButtons();
  }

  #addFooter() {
    const prefix = this.add.text(0, 255,
      '© 2026 Todos los derechos reservados - Diseño y Programación por ',
      {
        fontFamily: 'monospace',
        fontSize: '5px',
        color: '#aaa0bd',
      },
    ).setOrigin(0, 0.5);

    const author = this.add.text(0, 255, 'Lucas Montenegro ®', {
      fontFamily: 'monospace',
      fontSize: '5px',
      fontStyle: 'bold',
      color: '#f2c77e',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    const totalWidth = prefix.width + author.width;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    prefix.setX(startX);
    author.setX(startX + prefix.width);
    author.on('pointerover', () => author.setColor('#fff1bc'));
    author.on('pointerout', () => author.setColor('#f2c77e'));
    author.on('pointerdown', () => {
      window.open(PORTFOLIO_URL, '_blank', 'noopener,noreferrer');
    });

    this.ui.add([prefix, author]);
  }

  #refreshButtons() {
    this.buttons.forEach((button, index) => {
      const selected = index === this.selectedIndex;
      button.box.setFillStyle(selected ? 0x60405a : 0x241b3c, 0.98);
      button.box.setStrokeStyle(selected ? 1.5 : 1, selected ? 0xf0bd72 : 0x62527e, 1);
      button.label.setColor(selected ? '#fff0c9' : '#d9cde9');
      button.label.setText((selected ? '›  ' : '   ') + button.title);
    });
  }

  #moveSelection(direction) {
    if (!this.buttons.length) return;
    this.selectedIndex = (this.selectedIndex + direction + this.buttons.length) % this.buttons.length;
    this.#refreshButtons();
  }

  #activateSelection() {
    const selected = this.buttons[this.selectedIndex];
    if (selected) selected.action();
  }

  #showHome() {
    this.page = 'home';
    this.#beginPage('INICIO');
    this.#addText('ELEGÍ CÓMO QUERÉS CONTINUAR', GAME_WIDTH / 2, 139, {
      fontSize: '6px',
      color: '#a99cbe',
    });
    this.#addButton('JUGAR', 160, () => this.#showPlay());
    this.#addButton('CONTROLES', 184, () => this.#showControls());
    this.#addButton('CRÉDITOS', 208, () => this.#showCredits());
    this.#addFooter();
  }

  #showPlay() {
    this.page = 'play';
    this.#beginPage('MODO DE JUEGO');
    this.#addText('DOS JUGADORES · UN MISMO TECLADO', GAME_WIDTH / 2, 141, {
      fontSize: '6px',
      color: '#b7a9cb',
    });
    this.#addButton('COMBATE LOCAL', 169, () => this.scene.start('FightScene'));
    this.#addButton('VOLVER AL INICIO', 194, () => this.#showHome());
    this.#addFooter();
  }

  #showControls() {
    this.page = 'controls';
    this.#beginPage('CONTROLES', 390, 122);
    this.#addText('JUGADOR 1 · AXEM VIOLET', GAME_WIDTH / 2, 148, {
      fontSize: '7px',
      color: '#d9a9ff',
      fontStyle: 'bold',
    });
    this.#addText('Mover: A / D     Hachazo: F     Teletransporte: G', GAME_WIDTH / 2, 162, {
      fontSize: '6px',
    });
    this.#addText('JUGADOR 2 · AXEM ORANGE', GAME_WIDTH / 2, 181, {
      fontSize: '7px',
      color: '#ffc17e',
      fontStyle: 'bold',
    });
    this.#addText('Mover: ← / →     Hachazo: L     Teletransporte: K', GAME_WIDTH / 2, 195, {
      fontSize: '6px',
    });
    this.#addText('Durante el combate, R reinicia la partida y ESC vuelve al menú.', GAME_WIDTH / 2, 209, {
      fontSize: '5px',
      color: '#aaa0bd',
    });
    this.#addButton('VOLVER', 224, () => this.#showHome());
    this.#addFooter();
  }

  #showCredits() {
    this.page = 'credits';
    this.#beginPage('CRÉDITOS');
    this.#addText('Axem FighterX es un juego de pelea retro para dos jugadores.', GAME_WIDTH / 2, 153, {
      fontSize: '6px',
    });
    this.#addText('Combate local, estética pixel art y escenarios de fantasía.', GAME_WIDTH / 2, 169, {
      fontSize: '6px',
    });
    this.#addText('Diseño y programación: Lucas Montenegro', GAME_WIDTH / 2, 188, {
      fontSize: '6px',
      color: '#f2c77e',
    });
    this.#addButton('VOLVER', 213, () => this.#showHome());
    this.#addFooter();
  }
}
