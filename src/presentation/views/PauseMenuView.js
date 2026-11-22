import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { RACE_DISTANCE_OPTIONS } from '../../domain/race/raceCourseRules.js';
import { contentWidth, insetSize, mapPanelY, UI_SPACING } from './uiLayout.js';

/** Menú superpuesto con paneles y botones de ancho coherente. */
export class PauseMenuView {
  constructor(scene, {
    onResume,
    onReturnToMenu,
    onSelectDistance = null,
    distanceOptions = RACE_DISTANCE_OPTIONS,
    controls = null,
    controlsTitle = 'CONTROLES',
  }) {
    this.scene = scene;
    this.onResume = onResume;
    this.onReturnToMenu = onReturnToMenu;
    this.onSelectDistance = onSelectDistance;
    this.distanceOptions = [...distanceOptions];
    this.minigameControls = Array.isArray(controls) ? [...controls] : null;
    this.controlsTitle = controlsTitle;
    this.buttons = [];
    this.selectedIndex = 0;
    this.showingControls = false;
    this.showingDistanceSelection = false;
    this.panelWidth = 344;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(30_000)
      .setVisible(false);
  }

  showMenu() {
    this.showingControls = false;
    this.showingDistanceSelection = false;
    this.#beginPanel('PAUSA', 170);
    this.#addButton('CONTINUAR', 116, this.onResume);
    this.#addButton(this.minigameControls ? 'CONTROLES' : 'TUTORIAL', 151, () => this.showControls());
    this.#addButton('VOLVER AL MENÚ', 186, this.onReturnToMenu);
    this.container.setVisible(true);
  }

  showDistanceSelection() {
    this.showingControls = false;
    this.showingDistanceSelection = true;
    this.#beginPanel('DISTANCIA TOTAL', 238);
    this.#addText('ELEGÍ EL RECORRIDO', 96, {
      fontSize: '8px',
      color: '#e7def5',
    });
    this.distanceOptions.forEach(({ label, value }, index) => {
      this.#addButton(label, 124 + index * 29, () => {
        this.onSelectDistance?.(value);
      }, { width: 190 });
    });
    this.container.setVisible(true);
  }

  showControls(player = null) {
    this.showingDistanceSelection = false;
    this.showingControls = true;
    if (this.minigameControls) {
      const compact = this.minigameControls.length > 5;
      this.#beginPanel(this.controlsTitle, 238);
      const firstY = compact ? 103 : 110;
      const lineGap = compact ? 15 : 22;
      this.minigameControls.forEach((line, index) => {
        this.#addText(line, firstY + lineGap * index, {
          fontSize: compact ? '7px' : '8px',
          color: index % 2 === 0 ? '#e7def5' : '#ffc17e',
        });
      });
      this.#addButton('VOLVER A PAUSA', 242, () => this.showMenu(), { width: 178 });
      this.container.setVisible(true);
      return;
    }
    this.#beginPanel(player ? 'TUTORIAL · ' + player : 'TUTORIAL', 238);
    if (!player) {
      this.#addText('SELECCIONÁ EL JUGADOR PARA CONSULTAR SUS CONTROLES', 108, {
        fontSize: '8px', color: '#e7def5',
      });
      this.#addButton('J1', 151, () => this.showControls('J1'), { width: 210 });
      this.#addButton('J2', 184, () => this.showControls('J2'), { width: 210 });
      this.#addButton('VOLVER A PAUSA', 224, () => this.showMenu(), { width: 178 });
    } else {
      const isJ1 = player === 'J1';
      const color = isJ1 ? '#d9a9ff' : '#ffc17e';
      this.#addText(isJ1
        ? 'TERRENO · IZQUIERDA A · DERECHA D · ARRIBA W · ABAJO S'
        : 'TERRENO · IZQUIERDA ← · DERECHA → · ARRIBA ↑ · ABAJO ↓', 112, { fontSize: '8px', color });
      this.#addText(isJ1 ? 'VUELO · SUBIR Q · BAJAR E' : 'VUELO · SUBIR I · BAJAR O', 143, { fontSize: '9px', color });
      this.#addText(isJ1 ? 'HACHAZO F · TELETRANSPORTE G · DASH C' : 'HACHAZO L · TELETRANSPORTE K · DASH H', 174, { fontSize: '8px', color });
      this.#addText(isJ1 ? 'BLOQUEO V · ESQUIVA X · ATAQUE ESPECIAL Z' : 'BLOQUEO N · ESQUIVA J · ATAQUE ESPECIAL M', 205, { fontSize: '8px', color });
      this.#addText('OBJETOS · VIDA · FURIA · RAPIDEZ · ESCUDO', 225, { fontSize: '7px', color: '#e7d6a8' });
      this.#addButton('VOLVER A JUGADORES', 244, () => this.showControls(), { width: 190 });
    }
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
  }

  moveSelection(direction) {
    if (!this.buttons.length) return;
    this.selectedIndex = (this.selectedIndex + direction + this.buttons.length) % this.buttons.length;
    this.#refreshButtons();
  }

  activateSelection() {
    this.buttons[this.selectedIndex]?.action();
  }

  #beginPanel(title, requestedHeight) {
    this.container.removeAll(true);
    this.buttons = [];
    this.selectedIndex = 0;

    const panelTopLimit = UI_SPACING.modalTopInset;
    const panelBottomLimit = GAME_HEIGHT - UI_SPACING.modalFooterReserve;
    const height = Math.min(requestedHeight, panelBottomLimit - panelTopLimit);
    const panelY = (panelTopLimit + panelBottomLimit) / 2;
    const panelTop = panelY - height / 2;
    const panelBottom = panelY + height / 2;

    const shade = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78)
      .setInteractive();
    const shadow = this.scene.add.rectangle(GAME_WIDTH / 2 + 3, panelY + 3, this.panelWidth, height, 0x06040b, 0.96);
    const panel = this.scene.add.rectangle(GAME_WIDTH / 2, panelY, this.panelWidth, height, 0x100d1e, 0.99)
      .setStrokeStyle(1, 0xd3a66d, 0.96);
    const inset = this.scene.add.rectangle(GAME_WIDTH / 2, panelY, insetSize(this.panelWidth), insetSize(height), 0x000000, 0)
      .setStrokeStyle(1, 0x4b385c, 0.92);
    const heading = this.scene.add.text(GAME_WIDTH / 2, panelTop + UI_SPACING.modalTopInset, title, {
      fontFamily: 'monospace',
      fontStyle: 'normal',
      fontSize: '12px',
      color: '#f7cf83',
      letterSpacing: 1,
      align: 'center',
    }).setOrigin(0.5);

    const headerRule = this.scene.add.rectangle(
      GAME_WIDTH / 2,
      panelTop + UI_SPACING.modalHeaderRuleInset,
      contentWidth(this.panelWidth),
      1,
      0xd3a66d,
      0.72,
    );
    this.panelLayout = {
      sourceTop: 76,
      sourceBottom: 242,
      targetTop: panelTop + UI_SPACING.modalHeaderRuleInset + 15,
      targetBottom: panelBottom - UI_SPACING.modalBottomInset - 12,
    };
    this.container.add([shade, shadow, panel, inset, heading, headerRule]);
  }

  #mapPanelY(y) {
    const layout = this.panelLayout;
    return layout
      ? mapPanelY(y, layout.sourceTop, layout.sourceBottom, layout.targetTop, layout.targetBottom)
      : y;
  }

  #addText(value, y, style = {}) {
    const label = this.scene.add.text(GAME_WIDTH / 2, this.#mapPanelY(y), value, {
      fontFamily: 'monospace',
      fontStyle: 'normal',
      fontSize: '9px',
      color: '#e7def5',
      align: 'center',
      wordWrap: { width: contentWidth(this.panelWidth), useAdvancedWrap: true },
      ...style,
    }).setOrigin(0.5);
    this.container.add(label);
    return label;
  }

  #addButton(title, y, action, { width = contentWidth(this.panelWidth) } = {}) {
    const buttonY = this.#mapPanelY(y);
    const buttonWidth = Math.min(width, contentWidth(this.panelWidth));
    const box = this.scene.add.rectangle(GAME_WIDTH / 2, buttonY, buttonWidth, 23, 0x241b3c, 0.98)
      .setStrokeStyle(1, 0x62527e, 1);
    const label = this.scene.add.text(GAME_WIDTH / 2, buttonY, title, {
      fontFamily: 'monospace',
      fontStyle: 'normal',
      fontSize: '10px',
      color: '#d9cde9',
      align: 'center',
      wordWrap: { width: contentWidth(buttonWidth, UI_SPACING.buttonTextGutter), useAdvancedWrap: true },
    }).setOrigin(0.5);
    const hitArea = this.scene.add.rectangle(GAME_WIDTH / 2, buttonY, buttonWidth, 23, 0xffffff, 0)
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
      this.activateSelection();
    });

    this.container.add([box, label, hitArea]);
    this.#refreshButtons();
  }

  #refreshButtons() {
    this.buttons.forEach((button, index) => {
      const selected = index === this.selectedIndex;
      button.box.setFillStyle(selected ? 0x60405a : 0x241b3c, 0.98);
      button.box.setStrokeStyle(selected ? 1 : 0.75, selected ? 0xf0bd72 : 0x62527e, 0.9);
      button.label.setColor(selected ? '#fff0c9' : '#d9cde9');
      button.label.setText(button.title);
    });
  }
}
