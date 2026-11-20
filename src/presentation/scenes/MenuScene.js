import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/gameConfig.js';
import { STAGES } from '../../domain/arena/stageCatalog.js';
import { RANGER_IDS, rangerCatalog } from '../../domain/rangers/rangerCatalog.js';
import { COMBAT_MODES, VERSUS_MODES, getCombatMode, getVersusMode } from '../../domain/match/matchModes.js';
import {
  spriteKeyFor,
  maleAnimationKey,
} from '../../infrastructure/assets/assetManifest.js';

const PORTFOLIO_URL = 'https://lu-dev-portfolio.vercel.app/';
const RANGER_ORDER = [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE];
const readableFontSize = (value = '10px') => {
  const size = Number.parseFloat(value);
  return Number.isFinite(size) ? Math.max(8, Math.round(size * 1.25)) + 'px' : value;
};
const RANGER_VARIANTS = Object.freeze([
  { id: RANGER_IDS.VIOLET, gender: 'male' },
  { id: RANGER_IDS.VIOLET, gender: 'female' },
  { id: RANGER_IDS.ORANGE, gender: 'male' },
  { id: RANGER_IDS.ORANGE, gender: 'female' },
]);
const TRAINING_COLORS = Object.freeze([
  { label: 'NEGRO', color: '#111111' },
  { label: 'GRIS', color: '#555555' },
  { label: 'BLANCO', color: '#f5f5f5' },
  { label: 'ROJO', color: '#a83232' },
  { label: 'NARANJA', color: '#e87524' },
  { label: 'AMARILLO', color: '#d6b83f' },
  { label: 'VERDE', color: '#28734b' },
  { label: 'TURQUESA', color: '#238b8b' },
  { label: 'AZUL', color: '#2457a6' },
  { label: 'VIOLETA', color: '#663399' },
]);

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    this.page = 'home';
    this.buttons = [];
    this.selectedIndex = 0;
    this.matchSetup = {};
    this.characterSlot = 0;
    this.panelWidth = 282;
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
      this.#goBack();
    }
  }

  #createBackdrop() {
    this.add.rectangle(0, 0, GAME_WIDTH, 270, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(-100);

    const titleTexture = this.textures.get('title-art').getSourceImage();
    const titleScale = Math.min(1, 436 / titleTexture.width, 78 / titleTexture.height);
    this.add.image(GAME_WIDTH / 2, 42, 'title-art')
      .setScale(titleScale)
      .setAlpha(1)
      .setDepth(2);

    this.add.rectangle(GAME_WIDTH / 2, 250, GAME_WIDTH, 40, 0x000000, 0.94)
      .setStrokeStyle(1, 0x55456e, 0.9)
      .setDepth(-1);
  }


  /** Mantiene únicamente las animaciones GIF en la pantalla principal. */
  #addHomeRangerArt() {
    const runKey = maleAnimationKey(RANGER_IDS.ORANGE, 'run');
    const runner = this.add.sprite(GAME_WIDTH / 2 - 62, 139, runKey)
      .setOrigin(0.5, 1)
      .setScale(0.52)
      .setDepth(0);
    if (this.anims.exists(runKey)) runner.play(runKey);

    const bikeKey = maleAnimationKey(RANGER_IDS.VIOLET, 'bike');
    const bike = this.add.sprite(GAME_WIDTH / 2, 132, bikeKey)
      .setOrigin(0.5, 1)
      .setScale(0.54)
      .setDepth(1);
    if (this.anims.exists(bikeKey)) bike.play(bikeKey);

    this.ui.add([runner, bike]);
  }

  #beginPage(title, width = 282, height = 120) {
    this.ui.removeAll(true);
    this.buttons = [];
    this.selectedIndex = 0;
    this.panelWidth = width;

    const panel = this.add.rectangle(GAME_WIDTH / 2, 171, width, height, 0x000000, 0.98)
      .setStrokeStyle(2, 0x7b699b, 0.95);
    const inset = this.add.rectangle(GAME_WIDTH / 2, 171, width - 8, height - 8, 0x000000, 0)
      .setStrokeStyle(1, 0x3e315e, 0.9);
    this.ui.add([panel, inset]);

    if (title) {
      this.#addText(title, GAME_WIDTH / 2, 122, {
        fontSize: '14px',
        color: '#f7cf83',
        letterSpacing: 1,
      });
    }
  }

  #beginCharacterModal() {
    this.ui.removeAll(true);
    this.buttons = [];
    this.selectedIndex = 0;
    this.panelWidth = 380;

    const veil = this.add.rectangle(GAME_WIDTH / 2, 135, GAME_WIDTH, 270, 0x000000, 0.92)
      .setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, 178, this.panelWidth, 180, 0x000000, 0.99)
      .setStrokeStyle(2, 0xd3a66d, 1);
    const inset = this.add.rectangle(GAME_WIDTH / 2, 178, this.panelWidth - 8, 172, 0x000000, 0)
      .setStrokeStyle(1, 0x59466e, 1);
    this.ui.add([veil, panel, inset]);

    this.#addText('SELECCIONAR PERSONAJE', GAME_WIDTH / 2, 105, {
      fontSize: '12px',
      color: '#f7cf83',
      letterSpacing: 1,
    });
    const mode = getVersusMode(this.matchSetup.versusMode);
    this.#addText(mode.slotLabels[this.characterSlot] ?? 'PERSONAJE', GAME_WIDTH / 2, 126, {
      fontSize: '7px',
      color: '#b7a9cb',
    });
  }

  #addText(value, x, y, style = {}) {
    const text = this.add.text(x, y, value, {
      fontFamily: 'monospace',
      fontSize: readableFontSize(style.fontSize ?? '10px'),
      color: '#e7def5',
      align: 'center',
      wordWrap: { width: Math.max(100, this.panelWidth - 28), useAdvancedWrap: true },
      ...style,
    });
    text.setFontSize(readableFontSize(style.fontSize ?? '10px')).setOrigin(0.5);
    this.ui.add(text);
    return text;
  }

  #addButton(title, y, action, { width = 210, fontSize = '8px', x = GAME_WIDTH / 2 } = {}) {
    // El fondo, la etiqueta y el área interactiva comparten exactamente el mismo ancho y centro.
    const buttonWidth = Math.floor(Math.min(width, Math.max(112, this.panelWidth - 36)));
    const buttonHeight = 20;
    const labelFontSize = readableFontSize(fontSize);
    const box = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x241b3c, 0.98)
      .setStrokeStyle(1, 0x62527e, 1);
    const label = this.add.text(x, y, title, {
      fontFamily: 'monospace',
      fontSize: labelFontSize,
      color: '#d9cde9',
      align: 'center',
      wordWrap: { width: buttonWidth - 16, useAdvancedWrap: true },
    }).setOrigin(0.5);
    const hitArea = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0xffffff, 0)
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

  #addColorOption(title, color, x, y) {
    const width = 62;
    const height = 28;
    const box = this.add.rectangle(x, y, width, height, 0x241b3c, 0.98)
      .setStrokeStyle(1, 0x62527e, 1);
    const swatch = this.add.rectangle(x, y - 5, width - 10, 8, 0x111111, 1)
      .setStrokeStyle(1, 0x80758f, 0.8);
    const label = this.add.text(x, y + 8, title, {
      fontFamily: 'monospace',
      fontSize: readableFontSize('6px'),
      color: '#d9cde9',
      align: 'center',
    }).setOrigin(0.5);
    const hitArea = this.add.rectangle(x, y, width, height, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    const action = () => {
      this.matchSetup.trainingBackgroundColor = color;
      this.#showTrainingColors();
    };
    const index = this.buttons.length;
    this.buttons.push({ title, box, label, action, color, swatch });
    hitArea.on('pointerover', () => {
      this.selectedIndex = index;
      this.#refreshButtons();
    });
    hitArea.on('pointerdown', () => {
      this.selectedIndex = index;
      this.#refreshButtons();
      this.#activateSelection();
    });
    this.ui.add([box, swatch, label, hitArea]);
    this.#refreshButtons();
  }

  #addCharacterCard(rangerId, gender, x, y, action) {
    const ranger = rangerCatalog[rangerId];
    const genderLabel = gender === 'male' ? 'MASCULINO' : 'FEMENINO';
    const title = ranger.name.toUpperCase() + ' · ' + genderLabel;
    const card = this.add.rectangle(x, y, 154, 42, 0x241b3c, 0.98)
      .setStrokeStyle(1, 0x62527e, 1);
    const portrait = this.add.image(x - 53, y, spriteKeyFor(rangerId, gender))
      .setOrigin(0.5)
      .setScale(0.34);
    const label = this.add.text(x + 19, y, title, {
      fontFamily: 'monospace',
      fontSize: readableFontSize('6px'),
      color: '#d9cde9',
      align: 'center',
      wordWrap: { width: 112 },
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(x, y, 154, 42, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    const index = this.buttons.length;
    this.buttons.push({ title, box: card, label, action });
    hitArea.on('pointerover', () => {
      this.selectedIndex = index;
      this.#refreshButtons();
    });
    hitArea.on('pointerdown', () => {
      this.selectedIndex = index;
      this.#refreshButtons();
      this.#activateSelection();
    });

    this.ui.add([card, portrait, label, hitArea]);
    this.#refreshButtons();
  }

  #addFooter() {
    // El footer solo aparece en la pantalla principal; nunca queda por encima de un modal.
    if (this.page !== 'home') return;
    const prefix = this.add.text(0, 264,
      '© 2026 Todos los derechos reservados - Diseño y Programación por ',
      {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#aaa0bd',
      },
    ).setOrigin(0, 0.5).setDepth(30);

    const author = this.add.text(0, 264, 'Lucas Montenegro ®', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#f2c77e',
    }).setOrigin(0, 0.5).setDepth(30).setInteractive({ useHandCursor: true });

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
      button.box.setStrokeStyle(selected ? 1.5 : 1, selected ? 0xf0bd72 : 0x62527e, 1);

      if (button.color) {
        button.box.setFillStyle(0x241b3c, 0.98);
        button.swatch.setFillStyle(Phaser.Display.Color.HexStringToColor(button.color).color, 1);
        button.label.setColor(selected ? '#fff0c9' : '#d9cde9');
        button.label.setText((selected ? '✓ ' : '') + button.title);
        return;
      }

      button.box.setFillStyle(selected ? 0x60405a : 0x241b3c, 0.98);
      button.label.setColor(selected ? '#fff0c9' : '#d9cde9');
      button.label.setText(button.title);
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

  #getMatchSetup() {
    const matchSetup = {
      ...this.matchSetup,
      characters: [...(this.matchSetup.characters ?? [])],
    };
    if (matchSetup.versusMode === 'player-vs-ai' && matchSetup.playerSide === 'J2') {
      matchSetup.characters.reverse();
    }
    return matchSetup;
  }

  #startSelectedFight(stageId, cinematic = true) {
    this.scene.start(cinematic ? 'CinematicScene' : 'FightScene', {
      stageId,
      matchSetup: this.#getMatchSetup(),
    });
  }

  #moveSelectionBackToCharacters() {
    this.characterSlot = 0;
    this.#showCharacterModal();
  }

  #goBack() {
    if (this.page === 'versus') {
      this.#showHome();
      return;
    }
    if (this.page === 'combat') {
      this.#showVersusModes();
      return;
    }
    if (this.page === 'characters') {
      this.#showCombatModes();
      return;
    }
    if (this.page === 'player-side') {
      this.#moveSelectionBackToCharacters();
      return;
    }
    if (this.page === 'training-colors') {
      if (this.matchSetup.versusMode === 'player-vs-ai') this.#showPlayerSide();
      else this.#moveSelectionBackToCharacters();
      return;
    }
    if (this.page === 'stages') {
      const mode = getVersusMode(this.matchSetup.versusMode);
      this.characterSlot = Math.max(0, mode.characterSlots - 1);
      this.#showCharacterModal();
      return;
    }
    this.#showHome();
  }

  #showHome() {
    this.page = 'home';
    this.matchSetup = {};
    this.characterSlot = 0;
    this.#beginPage('');
    this.#addHomeRangerArt();
    this.#addButton('JUGAR', 160, () => this.#showVersusModes());
    this.#addButton('TUTORIAL', 184, () => this.#showControls());
    this.#addButton('CRÉDITOS', 208, () => this.#showCredits());
    this.#addFooter();
  }

  #showVersusModes() {
    this.page = 'versus';
    this.matchSetup = { characters: [], playerSide: 'J1' };
    this.#beginPage('JUGAR', 330, 168);
    this.#addText('COMBATE', GAME_WIDTH / 2, 140, {
      fontSize: '7px',
      color: '#b7a9cb',
    });

    VERSUS_MODES.forEach((mode, index) => {
      this.#addButton(mode.label, 160 + index * 25, () => {
        this.matchSetup.versusMode = mode.id;
        this.#showCombatModes();
      }, { width: 246, fontSize: '8px' });
    });

    this.#addButton('VOLVER', 238, () => this.#showHome(), { width: 150, fontSize: '8px' });
    this.#addFooter();
  }

  #showCombatModes() {
    this.page = 'combat';
    this.#beginPage('MODO', 330, 168);

    COMBAT_MODES.forEach((mode, index) => {
      this.#addButton(mode.label, 151 + index * 21, () => {
        this.matchSetup.combatMode = mode.id;
        this.matchSetup.characters = [];
        this.characterSlot = 0;
        this.#showCharacterModal();
      }, { width: 230, fontSize: '8px' });
    });

    this.#addButton('VOLVER', 238, () => this.#showVersusModes(), { width: 150, fontSize: '8px' });
    this.#addFooter();
  }

  #showCharacterModal() {
    this.page = 'characters';
    this.#beginCharacterModal();

    const firstSelection = this.matchSetup.characters[0];
    const options = RANGER_VARIANTS.filter((variant) =>
      this.characterSlot === 0 || variant.id !== firstSelection?.id
    );
    const positions = options.length === 4
      ? [[150, 163], [330, 163], [150, 211], [330, 211]]
      : [[150, 187], [330, 187]];

    options.forEach((variant, index) => {
      const [x, y] = positions[index];
      this.#addCharacterCard(
        variant.id,
        variant.gender,
        x,
        y,
        () => this.#selectCharacter(variant.id, variant.gender),
      );
    });

    this.#addButton('CANCELAR', 250, () => this.#showCombatModes(), {
      width: 132,
      fontSize: '7px',
    });
  }

  #selectCharacter(rangerId, gender) {
    const mode = getVersusMode(this.matchSetup.versusMode);
    const selection = { id: rangerId, gender };
    this.matchSetup.characters[this.characterSlot] = selection;

    if (this.characterSlot + 1 < mode.characterSlots) {
      this.characterSlot += 1;
      this.#showCharacterModal();
      return;
    }

    if (mode.characterSlots === 1) {
      this.matchSetup.characters[1] = {
        id: RANGER_ORDER.find((id) => id !== rangerId),
        gender,
      };
      this.matchSetup.playerCharacter = rangerId;
      this.matchSetup.playerSide = 'J1';
      this.#showPlayerSide();
      return;
    }

    this.#showNextConfiguration();
  }

  #showPlayerSide() {
    this.page = 'player-side';
    this.#beginPage('ELEGÍ TU LADO', 390, 176);
    const side = this.matchSetup.playerSide ?? 'J1';
    this.#addText(
      'LADO ACTUAL: ' + (side === 'J1' ? 'JUGADOR 1 · IZQUIERDA' : 'JUGADOR 2 · DERECHA'),
      GAME_WIDTH / 2,
      145,
      { fontSize: '7px', color: '#f7cf83' },
    );
    this.#addButton('JUGADOR 1 · IZQUIERDA', 174, () => {
      this.matchSetup.playerSide = 'J1';
      this.#showPlayerSide();
    }, { width: 142, x: 160, fontSize: '7px' });
    this.#addButton('JUGADOR 2 · DERECHA', 174, () => {
      this.matchSetup.playerSide = 'J2';
      this.#showPlayerSide();
    }, { width: 142, x: 320, fontSize: '7px' });
    this.#addText('JUGADOR 1: A / D · F · G     JUGADOR 2: FLECHAS · L · K', GAME_WIDTH / 2, 198, {
      fontSize: '6px',
      color: '#b7a9cb',
    });
    this.#addButton('CONTINUAR', 222, () => this.#showNextConfiguration(), {
      width: 174,
      fontSize: '7px',
    });
    this.#addButton('VOLVER', 247, () => this.#moveSelectionBackToCharacters(), {
      width: 120,
      fontSize: '7px',
    });
  }

  #showNextConfiguration() {
    if (getCombatMode(this.matchSetup.combatMode).id === 'training') {
      this.#showTrainingColors();
      return;
    }
    this.#showStages();
  }

  #showTrainingColors() {
    this.page = 'training-colors';
    this.matchSetup.trainingBackgroundColor ??= '#111111';
    this.#beginPage('FONDO DE ENTRENAMIENTO', 430, 198);
    this.#addText('COLOR SELECCIONADO: ' + this.matchSetup.trainingBackgroundColor.toUpperCase(), GAME_WIDTH / 2, 141, {
      fontSize: '6px',
      color: '#b7a9cb',
    });

    this.selectedIndex = TRAINING_COLORS.findIndex((item) => item.color === this.matchSetup.trainingBackgroundColor);
    if (this.selectedIndex < 0) this.selectedIndex = TRAINING_COLORS.length;
    const centers = [92, 166, 240, 314, 388];
    TRAINING_COLORS.forEach(({ label, color }, index) => {
      const row = index < 5 ? 0 : 1;
      const column = index % 5;
      this.#addColorOption(label, color, centers[column], 165 + row * 29);
    });

    this.#addButton('ELEGIR OTRO COLOR', 224, () => this.#openNativeColorPicker(), {
      width: 170,
      fontSize: '7px',
    });
    this.#addButton('VOLVER', 250, () => {
      if (this.matchSetup.versusMode === 'player-vs-ai') this.#showPlayerSide();
      else this.#moveSelectionBackToCharacters();
    }, { width: 112, x: 150, fontSize: '7px' });
    this.#addButton('COMENZAR', 250, () => this.#startSelectedFight(STAGES[0].id, false), {
      width: 150,
      x: 320,
      fontSize: '7px',
    });
  }

  #openNativeColorPicker() {
    if (typeof document === 'undefined') return;

    const input = document.createElement('input');
    input.type = 'color';
    input.value = this.matchSetup.trainingBackgroundColor ?? '#111111';
    input.setAttribute('aria-label', 'Elegir color del fondo de entrenamiento');
    input.style.cssText = [
      'position:fixed',
      'left:50%',
      'top:50%',
      'width:2px',
      'height:2px',
      'opacity:0',
      'z-index:100000',
    ].join(';');
    document.body.appendChild(input);

    const cleanup = () => input.remove();
    input.addEventListener('change', () => {
      this.matchSetup.trainingBackgroundColor = input.value.toLowerCase();
      cleanup();
      if (this.scene.isActive()) this.#showTrainingColors();
    }, { once: true });
    input.addEventListener('cancel', cleanup, { once: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    input.click();
  }

  #showStages() {
    this.page = 'stages';
    const versus = getVersusMode(this.matchSetup.versusMode);
    const combat = getCombatMode(this.matchSetup.combatMode);
    this.#beginPage('ELEGÍ EL ESCENARIO', 330, 158);
    this.#addText(versus.label + ' · ' + combat.label, GAME_WIDTH / 2, 138, {
      fontSize: '6px',
      color: '#b7a9cb',
    });

    STAGES.forEach((stage, index) => {
      this.#addButton(stage.name.toUpperCase(), 153 + index * 21, () => {
        this.#startSelectedFight(stage.id, true);
      }, { width: 260, fontSize: '7px' });
    });

    this.#addButton('VOLVER', 238, () => {
      if (this.matchSetup.versusMode === 'player-vs-ai') this.#showPlayerSide();
      else this.#moveSelectionBackToCharacters();
    }, { width: 150, fontSize: '8px' });
    this.#addFooter();
  }

  #showControls() {
    this.page = 'controls';
    this.#beginPage('TUTORIAL', 390, 154);
    this.#addText('JUGADOR 1', GAME_WIDTH / 2, 143, {
      fontSize: '7px',
      color: '#d9a9ff',
    });
    this.#addText('Movimiento A/D · Vuelo Q asciende · E desciende', GAME_WIDTH / 2, 157, {
      fontSize: '6px',
    });
    this.#addText('Ataque F · Teletransporte G', GAME_WIDTH / 2, 168, {
      fontSize: '6px',
    });
    this.#addText('JUGADOR 2', GAME_WIDTH / 2, 183, {
      fontSize: '7px',
      color: '#ffc17e',
    });
    this.#addText('Movimiento ←/→ · Vuelo ↑ asciende · ↓ desciende', GAME_WIDTH / 2, 197, {
      fontSize: '6px',
    });
    this.#addText('Ataque L · Teletransporte K', GAME_WIDTH / 2, 208, {
      fontSize: '6px',
    });
    this.#addText('R · REINICIAR COMBATE   ESC · VOLVER / SALIR', GAME_WIDTH / 2, 223, {
      fontSize: '6px',
      color: '#aaa0bd',
    });
    this.#addButton('VOLVER', 239, () => this.#showHome());
    this.#addFooter();
  }

  #showCredits() {
    this.page = 'credits';
    this.#beginPage('CRÉDITOS');
    this.#addText('Axem FighterX es un juego de pelea retro para dos jugadores.', GAME_WIDTH / 2, 153, {
      fontSize: '7px',
    });
    this.#addText('Cuatro escenarios, cinemáticas y combates de entrenamiento.', GAME_WIDTH / 2, 169, {
      fontSize: '7px',
    });
    this.#addText('Diseño y programación: Lucas Montenegro', GAME_WIDTH / 2, 188, {
      fontSize: '7px',
      color: '#f2c77e',
    });
    this.#addButton('VOLVER', 213, () => this.#showHome());
    this.#addFooter();
  }
}
