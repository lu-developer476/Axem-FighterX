import { GAME_WIDTH } from '../../config/gameConfig.js';

/** Menú superpuesto con paneles y botones de ancho coherente. */
export class PauseMenuView {
  constructor(scene, { onResume, onReturnToMenu }) {
    this.scene = scene;
    this.onResume = onResume;
    this.onReturnToMenu = onReturnToMenu;
    this.buttons = [];
    this.selectedIndex = 0;
    this.showingControls = false;
    this.panelWidth = 320;
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
    this.#addText('JUGADOR 1 · ATAQUE F · TELETRANSPORTE G', 96, {
      fontSize: '9px',
      color: '#d9a9ff',
    });
    this.#addText('JUGADOR 2 · ←/→/I/O TERRENO · ↑/↓ VUELO', 116, {
      fontSize: '9px',
      color: '#ffc17e',
    });
    this.#addText('JUGADOR 2 · ATAQUE L · TELETRANSPORTE K', 136, {
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
    this.#addText('ESC · MENÚ / PAUSA: REANUDAR / TUTORIALES: VOLVER', 222, {
      fontSize: '9px',
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

  #beginPanel(title, height) {
    this.container.removeAll(true);
    this.buttons = [];
    this.selectedIndex = 0;
    const panelY = 135;

    const shade = this.scene.add.rectangle(GAME_WIDTH / 2, panelY, GAME_WIDTH, 270, 0x000000, 1)
      .setInteractive();
    const panel = this.scene.add.rectangle(GAME_WIDTH / 2, panelY, this.panelWidth, height, 0x000000, 1)
      .setStrokeStyle(1, 0xd3a66d, 0.9);
    const heading = this.scene.add.text(GAME_WIDTH / 2, panelY - height / 2 + 23, title, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f7cf83',
      letterSpacing: 1,
      align: 'center',
    }).setOrigin(0.5);

    this.container.add([shade, panel, heading]);
  }

  #addText(value, y, style = {}) {
    const label = this.scene.add.text(GAME_WIDTH / 2, y, value, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#e7def5',
      align: 'center',
      wordWrap: { width: this.panelWidth - 28, useAdvancedWrap: true },
      ...style,
    }).setOrigin(0.5);
    this.container.add(label);
    return label;
  }

  #addButton(title, y, action, { width = this.panelWidth - 48 } = {}) {
    const buttonWidth = Math.min(width, this.panelWidth - 48);
    const box = this.scene.add.rectangle(GAME_WIDTH / 2, y, buttonWidth, 23, 0x241b3c, 0.98)
      .setStrokeStyle(1, 0x62527e, 1);
    const label = this.scene.add.text(GAME_WIDTH / 2, y, title, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#d9cde9',
      align: 'center',
      wordWrap: { width: buttonWidth - 14, useAdvancedWrap: true },
    }).setOrigin(0.5);
    const hitArea = this.scene.add.rectangle(GAME_WIDTH / 2, y, buttonWidth, 23, 0xffffff, 0)
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
