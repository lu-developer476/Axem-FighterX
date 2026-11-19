import { GAME_WIDTH } from '../../config/gameConfig.js';

/** Menú superpuesto que oculta los controles hasta que el jugador los solicita. */
export class PauseMenuView {
  constructor(scene, { onResume, onReturnToMenu }) {
    this.scene = scene;
    this.onResume = onResume;
    this.onReturnToMenu = onReturnToMenu;
    this.buttons = [];
    this.selectedIndex = 0;
    this.showingControls = false;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(20_000)
      .setVisible(false);
  }

  showMenu() {
    this.showingControls = false;
    this.#beginPanel('PAUSA', 170);
    this.#addButton('CONTINUAR', 116, this.onResume);
    this.#addButton('TUTORIALES', 151, () => this.showControls());
    this.#addButton('VOLVER AL MENÚ', 186, this.onReturnToMenu);
    this.container.setVisible(true);
  }

  showControls() {
    this.showingControls = true;
    this.#beginPanel('TUTORIALES', 250);
    this.#addText('J1 · A/D MOVER · Q ASCENDER · E DESCENDER', 76, {
      fontSize: '6px',
      color: '#d9a9ff',
    });
    this.#addText('J1 · ATAQUE F · TELETRANSPORTE G', 96, {
      fontSize: '6px',
      color: '#d9a9ff',
    });
    this.#addText('J2 · ←/→ MOVER · ↑ ASCENDER · ↓ DESCENDER', 116, {
      fontSize: '6px',
      color: '#ffc17e',
    });
    this.#addText('J2 · ATAQUE L · TELETRANSPORTE K', 136, {
      fontSize: '6px',
      color: '#ffc17e',
    });
    this.#addText('OBJETOS · VIDA · FURIA · RAPIDEZ · ESCUDO', 164, {
      fontSize: '7px',
      color: '#e7d6a8',
    });
    this.#addText('P · ABRIR / CERRAR PAUSA', 184, {
      fontSize: '7px',
      color: '#fff0c9',
    });
    this.#addText('R · REINICIAR EL COMBATE', 204, {
      fontSize: '7px',
      color: '#aaa0bd',
    });
    this.#addText('ESC · MENÚ / PAUSA: REANUDAR / TUTORIALES: VOLVER', 222, {
      fontSize: '6px',
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
    const panel = this.scene.add.rectangle(GAME_WIDTH / 2, panelY, 270, height, 0x000000, 1)
      .setStrokeStyle(2, 0xd3a66d, 1);
    const inset = this.scene.add.rectangle(GAME_WIDTH / 2, panelY, 262, height - 8, 0x000000, 0)
      .setStrokeStyle(1, 0x59466e, 1);
    const heading = this.scene.add.text(GAME_WIDTH / 2, panelY - height / 2 + 23, title, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f7cf83',
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.container.add([shade, panel, inset, heading]);
  }

  #addText(value, y, style = {}) {
    const label = this.scene.add.text(GAME_WIDTH / 2, y, value, {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#e7def5',
      align: 'center',
      ...style,
    }).setOrigin(0.5);
    this.container.add(label);
    return label;
  }

  #addButton(title, y, action, { width = 194 } = {}) {
    const box = this.scene.add.rectangle(GAME_WIDTH / 2, y, width, 23, 0x241b3c, 0.98)
      .setStrokeStyle(1, 0x62527e, 1);
    const label = this.scene.add.text(GAME_WIDTH / 2, y, title, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#d9cde9',
      align: 'center',
    }).setOrigin(0.5);
    const hitArea = this.scene.add.rectangle(GAME_WIDTH / 2, y, width, 23, 0xffffff, 0)
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
      button.box.setStrokeStyle(selected ? 1.5 : 1, selected ? 0xf0bd72 : 0x62527e, 1);
      button.label.setColor(selected ? '#fff0c9' : '#d9cde9');
      button.label.setText((selected ? '›  ' : '   ') + button.title);
    });
  }
}
