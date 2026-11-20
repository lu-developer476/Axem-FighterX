import { GAME_HEIGHT, GAME_WIDTH } from '../../config/gameConfig.js';
import { contentWidth, insetSize, mapPanelY, UI_SPACING } from './uiLayout.js';

/** Menú superpuesto con paneles y botones de ancho coherente. */
export class PauseMenuView {
  constructor(scene, { onResume, onReturnToMenu }) {
    this.scene = scene;
    this.onResume = onResume;
    this.onReturnToMenu = onReturnToMenu;
    this.buttons = [];
    this.selectedIndex = 0;
    this.showingControls = false;
    this.panelWidth = 344;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(30_000)
      .setVisible(false);
  }

  showMenu() {
    this.showingControls = false;
    this.#beginPanel('PAUSA', 170);
    this.#addButton('CONTINUAR', 116, this.onResume);
    this.#addButton('TUTORIAL', 151, () => this.showControls());
    this.#addButton('VOLVER AL MENÚ', 186, this.onReturnToMenu);
    this.container.setVisible(true);
  }

  showControls() {
    this.showingControls = true;
    this.#beginPanel('TUTORIAL', 250);
    this.#addText('JUGADOR 1 · A/D/W/S TERRENO · Q/E VUELO', 76, {
      fontSize: '9px',
      color: '#d9a9ff',
    });
    this.#addText('JUGADOR 1 · ATAQUE F · TELETRANSPORTE G · DASH C', 96, {
      fontSize: '9px',
      color: '#d9a9ff',
    });
    this.#addText('JUGADOR 2 · ←/→/I/O TERRENO · ↑/↓ VUELO', 116, {
      fontSize: '9px',
      color: '#ffc17e',
    });
    this.#addText('JUGADOR 2 · ATAQUE L · TELETRANSPORTE K · DASH M', 136, {
      fontSize: '9px',
      color: '#ffc17e',
    });
    this.#addText('OBJETOS · VIDA · FURIA · RAPIDEZ · ESCUDO', 164, {
      fontSize: '9px',
      color: '#e7d6a8',
    });
    this.#addText('P · ABRIR / CERRAR PAUSA', 184, {
      fontSize: '9px',
      color: '#fff0c9',
    });
    this.#addText('R · REINICIAR EL COMBATE', 204, {
      fontSize: '9px',
      color: '#aaa0bd',
    });
    this.#addText('ESC · VOLVER AL COMBATE / CERRAR TUTORIAL', 222, {
      fontSize: '8px',
      color: '#aaa0bd',
    });
    this.#addButton('VOLVER A PAUSA', 242, () => this.showMenu(), { width: 178 });
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
