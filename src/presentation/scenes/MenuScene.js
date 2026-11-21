import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { DEFAULT_STAGE_ID, STAGES } from '../../infrastructure/assets/stageAssetManifest.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { COMBAT_MODES, VERSUS_MODES, getCombatMode, getVersusMode } from '../../domain/match/matchModes.js';
import { maleAnimationKey } from '../../infrastructure/assets/assetManifest.js';
import { playMenuMusic } from '../../infrastructure/audio/GameMusic.js';
import { contentWidth, insetSize, mapPanelY, UI_SPACING } from '../views/uiLayout.js';

const RANGER_ORDER = [RANGER_IDS.ORANGE, RANGER_IDS.VIOLET];
const readableFontSize = (value = '10px') => {
  const size = Number.parseFloat(value);
  return Number.isFinite(size) ? Math.max(8, Math.round(size * 1.25)) + 'px' : value;
};
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
    this.pendingCharacterId = null;
    this.panelWidth = 282;
    this.stagePage = 0;
  }

  create() {
    playMenuMusic(this);
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

    this.add.rectangle(GAME_WIDTH / 2, 253, GAME_WIDTH, 28, 0x080710, 0.96)
      .setStrokeStyle(1, 0x55456e, 0.78)
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

    // Todos los paneles reservan una franja inferior libre y se ajustan al alto real.
    const safeBottom = GAME_HEIGHT - UI_SPACING.modalFooterReserve;
    const panelY = Math.min(171, safeBottom - height / 2);
    const panelTop = panelY - height / 2;
    const panelBottom = panelY + height / 2;
    this.panelLayout = {
      sourceTop: 122,
      sourceBottom: 239,
      targetTop: panelTop + UI_SPACING.modalTopInset,
      targetBottom: panelBottom - UI_SPACING.modalBottomInset - 9,
    };
    const shadow = this.add.rectangle(GAME_WIDTH / 2 + 3, panelY + 3, width, height, 0x06040b, 0.92);
    const panel = this.add.rectangle(GAME_WIDTH / 2, panelY, width, height, 0x100d1e, 0.98)
      .setStrokeStyle(1, 0x9277a8, 0.95);
    const inset = this.add.rectangle(
      GAME_WIDTH / 2,
      panelY,
      insetSize(width),
      insetSize(height),
      0x000000,
      0,
    )
      .setStrokeStyle(1, 0x3a2c50, 0.9);
    const accent = this.add.rectangle(
      GAME_WIDTH / 2,
      panelTop + UI_SPACING.modalHeaderRuleInset,
      width - 24,
      1,
      0xd3a66d,
      0.72,
    );
    this.ui.add([shadow, panel, inset, accent]);

    if (title) {
      this.#addText(title, GAME_WIDTH / 2, 122, {
        fontSize: this.page === 'credits' ? '8px' : '12px',
        color: '#f7cf83',
        letterSpacing: 1,
      });
    }
  }

  #beginCharacterModal(title = 'SELECCIONAR PERSONAJE') {
    this.ui.removeAll(true);
    this.buttons = [];
    this.selectedIndex = 0;
    this.panelWidth = 380;

    const veil = this.add.rectangle(GAME_WIDTH / 2, 135, GAME_WIDTH, 270, 0x000000, 0.84)
      .setInteractive();
    const panelY = 160;
    const panelHeight = 112;
    const panelTop = panelY - panelHeight / 2;
    const panelBottom = panelY + panelHeight / 2;
    this.panelLayout = {
      sourceTop: 130,
      sourceBottom: 178,
      targetTop: panelTop + UI_SPACING.modalTopInset,
      targetBottom: panelBottom - UI_SPACING.modalBottomInset - 9,
    };
    const shadow = this.add.rectangle(GAME_WIDTH / 2 + 3, panelY + 3, this.panelWidth, panelHeight, 0x06040b, 0.95);
    const panel = this.add.rectangle(GAME_WIDTH / 2, panelY, this.panelWidth, panelHeight, 0x100d1e, 0.99)
      .setStrokeStyle(1, 0xd3a66d, 0.96);
    const inset = this.add.rectangle(
      GAME_WIDTH / 2,
      panelY,
      insetSize(this.panelWidth),
      insetSize(panelHeight),
      0x000000,
      0,
    ).setStrokeStyle(1, 0x4b385c, 0.92);
    const accent = this.add.rectangle(
      GAME_WIDTH / 2,
      panelTop + UI_SPACING.modalHeaderRuleInset,
      this.panelWidth - 24,
      1,
      0xd3a66d,
      0.82,
    );
    this.ui.add([veil, shadow, panel, inset, accent]);

    this.#addText(title, GAME_WIDTH / 2, 130, {
      fontSize: '12px',
      color: '#f7cf83',
      letterSpacing: 1,
    });
    const mode = getVersusMode(this.matchSetup.versusMode);
    this.#addText(mode.slotLabels[this.characterSlot] ?? 'PERSONAJE', GAME_WIDTH / 2, 149, {
      fontSize: '7px',
      color: '#b7a9cb',
    });
  }

  #addText(value, x, y, style = {}) {
    const text = this.add.text(x, this.#mapPanelY(y), value, {
      fontFamily: 'monospace',
      fontSize: readableFontSize(style.fontSize ?? '10px'),
      color: '#e7def5',
      align: 'center',
      wordWrap: {
        width: Math.max(100, contentWidth(this.panelWidth)),
        useAdvancedWrap: true,
      },
      ...style,
    });
    text.setFontSize(readableFontSize(style.fontSize ?? '10px')).setOrigin(0.5);
    this.ui.add(text);
    return text;
  }

  #addButton(title, y, action, { width = 210, fontSize = '8px', x = GAME_WIDTH / 2, height = 16 } = {}) {
    // El fondo, la etiqueta y el área interactiva comparten exactamente el mismo ancho y centro.
    y = this.#mapPanelY(y);
    const buttonWidth = Math.floor(Math.min(width, Math.max(112, contentWidth(this.panelWidth))));
    const buttonHeight = height;
    const labelFontSize = readableFontSize(fontSize);
    const shadow = this.add.rectangle(x, y + 2, buttonWidth, buttonHeight, 0x090612, 0.98);
    const box = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x211a32, 0.98)
      .setStrokeStyle(1, 0x76618f, 1);
    const highlight = this.add.rectangle(x, y - 8, buttonWidth - 6, 1, 0xb69acb, 0.3);
    const label = this.add.text(x, y, title, {
      fontFamily: 'monospace',
      fontSize: labelFontSize,
      color: '#d9cde9',
      align: 'center',
      wordWrap: { width: contentWidth(buttonWidth, UI_SPACING.buttonTextGutter), useAdvancedWrap: true },
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

    this.ui.add([shadow, box, highlight, label, hitArea]);
    this.#refreshButtons();
  }

  #addColorOption(title, color, x, y) {
    y = this.#mapPanelY(y);
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

  #mapPanelY(y) {
    const layout = this.panelLayout;
    return layout
      ? mapPanelY(y, layout.sourceTop, layout.sourceBottom, layout.targetTop, layout.targetBottom)
      : y;
  }

  #addFooter() {
    // Franja compacta y separada del panel principal para evitar solapamientos.
    if (this.page !== 'home') return;
    const footerY = GAME_HEIGHT - 12;
    const footerFontSize = '6px';
    const prefix = this.add.text(0, footerY, '© 2026 Todos los derechos reservados - Diseño y Programación por ', {
      fontFamily: 'monospace',
      fontStyle: 'normal',
      fontSize: footerFontSize,
      color: '#c4bbd2',
    }).setOrigin(0, 0.5).setDepth(30);

    const author = this.add.text(0, footerY, 'Lucas Montenegro ®', {
      fontFamily: 'monospace',
      fontStyle: 'normal',
      fontSize: footerFontSize,
      color: '#f2c77e',
    }).setOrigin(0, 0.5).setDepth(30).setInteractive({ useHandCursor: true });

    const totalWidth = prefix.width + author.width;
    const startX = Math.max(UI_SPACING.footerGutter, Math.round((GAME_WIDTH - totalWidth) / 2));
    prefix.setX(startX);
    author.setX(startX + prefix.width);
    author.on('pointerover', () => author.setColor('#fff1bc'));
    author.on('pointerout', () => author.setColor('#f2c77e'));
    author.on('pointerdown', () => {
      window.open('https://www.linkedin.com/in/l-montenegro/', '_blank', 'noopener,noreferrer');
    });

    this.ui.add([prefix, author]);
  }

  #refreshButtons() {
    this.buttons.forEach((button, index) => {
      const selected = index === this.selectedIndex;
      button.box.setStrokeStyle(selected ? 1 : 0.75, selected ? 0xf0bd72 : 0x62527e, 0.9);

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
      playerSides: this.matchSetup.playerSides ? { ...this.matchSetup.playerSides } : undefined,
    };

    if (matchSetup.versusMode === 'player-vs-ai' && matchSetup.playerSide === 'J2') {
      matchSetup.characters.reverse();
    }
    if (matchSetup.versusMode === 'player-vs-player' && matchSetup.playerSides?.J1 === 'right') {
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
    this.pendingCharacterId = null;
    this.#showCharacterModal();
  }

  #showPreviousConfiguration() {
    if (this.matchSetup.versusMode === 'player-vs-ai') {
      this.#showPlayerSide();
      return;
    }
    if (this.matchSetup.versusMode === 'player-vs-player') {
      this.#showPlayerCorners();
      return;
    }
    this.characterSlot = Math.max(0, getVersusMode(this.matchSetup.versusMode).characterSlots - 1);
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
    if (this.page === 'character-gender') {
      this.pendingCharacterId = null;
      this.#showCharacterModal();
      return;
    }
    if (this.page === 'characters') {
      if (this.characterSlot > 0) {
        this.characterSlot -= 1;
        this.#showCharacterModal();
      } else {
        this.#showCombatModes();
      }
      return;
    }
    if (this.page === 'player-side') {
      this.#moveSelectionBackToCharacters();
      return;
    }
    if (this.page === 'player-corners') {
      this.characterSlot = 1;
      this.#showCharacterModal();
      return;
    }
    if (this.page === 'training-colors') {
      this.#showPreviousConfiguration();
      return;
    }
    if (this.page === 'stage-variants') {
      this.#showStages();
      return;
    }
    if (this.page === 'stages') {
      this.#showPreviousConfiguration();
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
    this.#addButton('JUGAR', 158, () => this.#showVersusModes());
    this.#addButton('CARRERA AXEM', 180, () => this.scene.start('RaceScene'));
    this.#addButton('TUTORIAL', 202, () => this.#showControls());
    this.#addButton('CRÉDITOS', 224, () => this.#showCredits());
    this.#addFooter();
  }

  #showVersusModes() {
    this.page = 'versus';
    this.matchSetup = { characters: [], playerSide: null, playerSides: null };
    this.#beginPage('COMBATE', 330, 168);

    VERSUS_MODES.forEach((mode, index) => {
      this.#addButton(mode.label, 151 + index * 22, () => {
        this.matchSetup.versusMode = mode.id;
        this.#showCombatModes();
      }, { width: 246, fontSize: '8px' });
    });

    this.#addButton('VOLVER', 226, () => this.#showHome(), { width: 150, fontSize: '8px' });
    this.#addFooter();
  }

  #showCombatModes() {
    this.page = 'combat';
    this.#beginPage('MODO', 330, 168);

    COMBAT_MODES.forEach((mode, index) => {
      this.#addButton(mode.label, 143 + index * 19, () => {
        this.matchSetup.combatMode = mode.id;
        this.matchSetup.characters = [];
        this.characterSlot = 0;
        this.#showCharacterModal();
      }, { width: 230, fontSize: '8px' });
    });

    this.#addButton('VOLVER', 226, () => this.#showVersusModes(), { width: 150, fontSize: '8px' });
    this.#addFooter();
  }

  #showCharacterModal() {
    this.page = 'characters';
    this.pendingCharacterId = null;
    this.#beginCharacterModal();

    RANGER_ORDER.forEach((rangerId, index) => {
      const title = rangerId === RANGER_IDS.ORANGE ? 'AXEM NARANJA' : 'AXEM VIOLETA';
      this.#addButton(title, 181, () => {
        this.pendingCharacterId = rangerId;
        this.#showCharacterGender();
      }, {
        width: 154,
        x: index === 0 ? 160 : 320,
        fontSize: '7px',
      });
    });
  }

  #showCharacterGender() {
    if (!this.pendingCharacterId) {
      this.#showCharacterModal();
      return;
    }

    this.page = 'character-gender';
    this.#beginCharacterModal('SELECCIONAR GÉNERO');
    this.#addButton('MASCULINO', 181, () => {
      this.#selectCharacter(this.pendingCharacterId, 'male');
    }, {
      width: 154,
      x: 160,
      fontSize: '7px',
    });
    this.#addButton('FEMENINO', 181, () => {
      this.#selectCharacter(this.pendingCharacterId, 'female');
    }, {
      width: 154,
      x: 320,
      fontSize: '7px',
    });
  }

  #selectCharacter(rangerId, gender) {
    this.pendingCharacterId = null;
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
      this.matchSetup.playerSide = null;
      this.#showPlayerSide();
      return;
    }

    if (mode.id === 'player-vs-player') {
      this.matchSetup.playerSides = { J1: null, J2: null };
      this.matchSetup.playerSidesError = null;
      this.#showPlayerCorners();
      return;
    }

    this.#showNextConfiguration();
  }

  #showPlayerSide() {
    this.page = 'player-side';
    this.#beginPage('ESQUINA DEL JUGADOR HUMANO', 400, 178);
    this.#addText('ELEGÍ TANTO EL LADO COMO EL ESQUEMA DE TECLAS', 143, {
      fontSize: '6px',
      color: '#b7a9cb',
    });
    this.#addButton((this.matchSetup.playerSide === 'J1' ? '✓ ' : '') + 'J1 · IZQUIERDA · TECLAS A/D/W/S', 169, () => {
      this.matchSetup.playerSide = 'J1';
      this.matchSetup.playerSideError = null;
      this.#showPlayerSide();
    }, { width: 320, fontSize: '6px' });
    this.#addButton((this.matchSetup.playerSide === 'J2' ? '✓ ' : '') + 'J2 · DERECHA · TECLAS DE FLECHAS', 192, () => {
      this.matchSetup.playerSide = 'J2';
      this.matchSetup.playerSideError = null;
      this.#showPlayerSide();
    }, { width: 320, fontSize: '6px' });
    if (this.matchSetup.playerSideError) {
      this.#addText(this.matchSetup.playerSideError, 211, { fontSize: '6px', color: '#ff9b9b' });
    } else {
      this.#addText('LA IA OCUPARÁ LA ESQUINA CONTRARIA', 211, { fontSize: '6px', color: '#aaa0bd' });
    }
    this.#addButton('VOLVER', 232, () => this.#moveSelectionBackToCharacters(), {
      width: 120, x: 145, fontSize: '7px',
    });
    this.#addButton('CONTINUAR', 232, () => {
      if (!this.matchSetup.playerSide) {
        this.matchSetup.playerSideError = 'SELECCIONÁ J1 O J2 ANTES DE CONTINUAR';
        this.#showPlayerSide();
        return;
      }
      this.#showNextConfiguration();
    }, { width: 132, x: 335, fontSize: '7px' });
  }

  #showPlayerCorners() {
    this.page = 'player-corners';
    const sides = this.matchSetup.playerSides ?? { J1: null, J2: null };
    this.#beginPage('ESQUINAS DE INICIO', 430, 214);

    this.#addText('JUGADOR 1', 142, { fontSize: '7px', color: '#d9a9ff' });
    this.#addButton((sides.J1 === 'left' ? '✓ ' : '') + 'IZQUIERDA', 160, () => {
      this.#setPlayerCorner('J1', 'left');
    }, { width: 136, x: 160, fontSize: '7px' });
    this.#addButton((sides.J1 === 'right' ? '✓ ' : '') + 'DERECHA', 160, () => {
      this.#setPlayerCorner('J1', 'right');
    }, { width: 136, x: 320, fontSize: '7px' });

    this.#addText('JUGADOR 2', 188, { fontSize: '7px', color: '#ffc17e' });
    this.#addButton((sides.J2 === 'left' ? '✓ ' : '') + 'IZQUIERDA', 206, () => {
      this.#setPlayerCorner('J2', 'left');
    }, { width: 136, x: 160, fontSize: '7px' });
    this.#addButton((sides.J2 === 'right' ? '✓ ' : '') + 'DERECHA', 206, () => {
      this.#setPlayerCorner('J2', 'right');
    }, { width: 136, x: 320, fontSize: '7px' });

    this.#addText(
      this.matchSetup.playerSidesError ?? 'CADA JUGADOR ELIGE SU ESQUINA; DEBEN SER DISTINTAS',
      222,
      { fontSize: '5px', color: this.matchSetup.playerSidesError ? '#ff9b9b' : '#aaa0bd' },
    );
    this.#addButton('VOLVER A PERSONAJES', 239, () => {
      this.characterSlot = 1;
      this.#showCharacterModal();
    }, { width: 180, x: 150, fontSize: '6px' });
    this.#addButton('CONTINUAR', 239, () => {
      const { J1, J2 } = this.matchSetup.playerSides ?? {};
      if (!J1 || !J2 || J1 === J2) {
        this.matchSetup.playerSidesError = 'AMBOS DEBEN ELEGIR LADOS OPUESTOS';
        this.#showPlayerCorners();
        return;
      }
      this.matchSetup.playerSidesError = null;
      this.#showNextConfiguration();
    }, { width: 132, x: 350, fontSize: '7px' });
  }

  #setPlayerCorner(player, side) {
    this.matchSetup.playerSides = {
      ...(this.matchSetup.playerSides ?? {}),
      [player]: side,
    };
    this.matchSetup.playerSidesError = null;
    this.#showPlayerCorners();
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
    this.#beginPage('FONDO DE ENTRENAMIENTO', 430, 188);
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
      this.#addColorOption(label, color, centers[column], 152 + row * 28);
    });

    this.#addButton('ELEGIR OTRO COLOR', 210, () => this.#openNativeColorPicker(), {
      width: 170,
      fontSize: '7px',
    });
    this.#addButton('VOLVER', 228, () => this.#showPreviousConfiguration(), {
      width: 112, x: 150, fontSize: '7px',
    });
    this.#addButton('COMENZAR', 228, () => this.#startSelectedFight(DEFAULT_STAGE_ID, false), {
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

  #showStages(page = 0) {
    this.page = 'stages';
    const versus = getVersusMode(this.matchSetup.versusMode);
    const combat = getCombatMode(this.matchSetup.combatMode);
    const pageSize = 8;
    const pageCount = Math.max(1, Math.ceil(STAGES.length / pageSize));
    this.stagePage = Math.max(0, Math.min(page, pageCount - 1));
    const pageStart = this.stagePage * pageSize;
    const visibleStages = STAGES.slice(pageStart, pageStart + pageSize);

    this.#beginPage('ESCENARIOS', 420, 212);
    this.#addText(versus.label + ' · ' + combat.label, GAME_WIDTH / 2, 137, {
      fontSize: '6px',
      color: '#b7a9cb',
    });
    this.#addText('PÁGINA ' + (this.stagePage + 1) + ' / ' + pageCount, GAME_WIDTH / 2, 147, {
      fontSize: '5px',
      color: '#9185aa',
    });

    if (visibleStages.length === 0) {
      this.#addText('NO HAY MAPAS O TILESETS DISPONIBLES', GAME_WIDTH / 2, 180, {
        fontSize: '7px',
        color: '#d0c4dc',
      });
    }

    visibleStages.forEach((stage, index) => {
      const kindLabel = stage.kind === 'tileset' ? ' · TILESET' : '';
      this.#addButton(stage.name.toUpperCase() + kindLabel, 157 + index * 10.5, () => {
        this.#startSelectedFight(stage.id);
      }, {
        width: 300,
        fontSize: '6px',
        height: 12,
      });
    });

    if (this.stagePage > 0) {
      this.#addButton('ANTERIOR', 239, () => this.#showStages(this.stagePage - 1), {
        width: 92,
        x: 92,
        fontSize: '5px',
        height: 13,
      });
    }
    this.#addButton('VOLVER', 239, () => this.#showPreviousConfiguration(), {
      width: 92, x: 240, fontSize: '6px', height: 13,
    });
    if (this.stagePage < pageCount - 1) {
      this.#addButton('SIGUIENTE', 239, () => this.#showStages(this.stagePage + 1), {
        width: 92,
        x: 388,
        fontSize: '5px',
        height: 13,
      });
    }
    this.#addFooter();
  }

  #showControls() {
    this.page = 'controls';
    this.#beginPage('TUTORIAL', 430, 214);
    this.#addText('JUGADOR 1', GAME_WIDTH / 2, 140, {
      fontSize: '7px',
      color: '#d9a9ff',
    });
    this.#addText('TERRESTRE · IZQUIERDA A · DERECHA D · ARRIBA W · ABAJO S', GAME_WIDTH / 2, 153, {
      fontSize: '5px',
    });
    this.#addText('VUELO · SUBIR Q · BAJAR E · HACHAZO F · TELETRANSPORTE G', GAME_WIDTH / 2, 166, {
      fontSize: '5px',
    });
    this.#addText('DASH C · BLOQUEAR V · ESQUIVAR X · ATAQUE ESPECIAL Z', GAME_WIDTH / 2, 179, {
      fontSize: '5px',
    });
    this.#addText('JUGADOR 2', GAME_WIDTH / 2, 192, {
      fontSize: '7px',
      color: '#ffc17e',
    });
    this.#addText('TERRESTRE · IZQUIERDA ← · DERECHA → · ARRIBA ↑ · ABAJO ↓', GAME_WIDTH / 2, 205, {
      fontSize: '5px',
    });
    this.#addText('VUELO · SUBIR I · BAJAR O · HACHAZO L · TELETRANSPORTE K', GAME_WIDTH / 2, 218, {
      fontSize: '5px',
    });
    this.#addText('DASH H · BLOQUEAR N · ESQUIVAR J · ATAQUE ESPECIAL M', GAME_WIDTH / 2, 231, {
      fontSize: '5px',
    });
    this.#addButton('VOLVER', 245, () => this.#showHome());
    this.#addFooter();
  }

  #showCredits() {
    this.page = 'credits';
    this.#beginPage('CRÉDITOS');
    this.#addText('Videojuego de pelea retro no oficial.', GAME_WIDTH / 2, 153, {
      fontSize: '5px',
    });
    this.#addText('Experiencia de usuario garantizada.', GAME_WIDTH / 2, 169, {
      fontSize: '5px',
    });
    this.#addText('Diseño y programación: Lucas Montenegro', GAME_WIDTH / 2, 188, {
      fontSize: '5px',
      color: '#f2c77e',
    });
    this.#addButton('VOLVER', 213, () => this.#showHome());
    this.#addFooter();
  }
}
