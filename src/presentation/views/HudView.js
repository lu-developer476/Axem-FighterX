import { GAME_WIDTH } from '../../config/gameConfig.js';
import { PICKUP_TYPES } from '../../domain/entities/PowerUpPickup.js';

const BAR = { width: 176, height: 10, y: 16, margin: 12 };
const COLORS = {
  ink: 0x0d0b16,
  back: 0x2a2260,
  trail: 0xff9a8a,
  good: 0x5dbb6c,
  warn: 0xf2c14e,
  danger: 0xe0405a,
  shine: 0xffffff,
};
const FONT = { fontFamily: 'monospace', color: '#f4efd8' };
const STATUS_LABELS = {
  [PICKUP_TYPES.FURY]: 'FURIA',
  [PICKUP_TYPES.HASTE]: 'RAPIDEZ',
  [PICKUP_TYPES.SHIELD]: 'ESCUDO',
};

/** Interfaz compacta del combate: vida, potenciadores y resultado. */
export class HudView {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../../domain/entities/Fighter.js').Fighter[]} fighters
   */
  constructor(scene, fighters) {
    this.fighters = fighters;
    this.trail = fighters.map((fighter) => fighter.health);
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(10_000);

    const text = (x, y, value, style, originX = 0) =>
      scene.add.text(x, y, value, { ...FONT, ...style }).setOrigin(originX, 0).setScrollFactor(0).setDepth(10_001);

    text(BAR.margin, 3, fighters[0].name.toUpperCase(), { fontSize: '8px' });
    text(GAME_WIDTH - BAR.margin, 3, fighters[1].name.toUpperCase(), { fontSize: '8px' }, 1);

    this.statusLabels = fighters.map((fighter, index) =>
      text(
        index === 0 ? BAR.margin : GAME_WIDTH - BAR.margin,
        31,
        '',
        { fontSize: '7px', color: index === 0 ? '#d9a9ff' : '#ffc17e', align: index === 0 ? 'left' : 'right' },
        index === 0 ? 0 : 1,
      ),
    );

    const center = (y, value, style) =>
      text(GAME_WIDTH / 2, y, value, style, 0.5).setVisible(false);
    this.title = center(82, '¡KO!', {
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#ffc23a',
      stroke: '#0d0b16',
      strokeThickness: 6,
    });
    this.subtitle = center(132, '', {
      fontSize: '14px',
      fontStyle: 'bold',
      stroke: '#0d0b16',
      strokeThickness: 4,
    });
    this.hint = center(156, 'Presioná R para reiniciar', {
      fontSize: '10px',
      stroke: '#0d0b16',
      strokeThickness: 3,
    });
    this.scene = scene;
  }

  update(deltaMs) {
    const g = this.graphics;
    g.clear();
    this.fighters.forEach((fighter, i) => {
      const trailLoss = (60 * deltaMs) / 1000;
      this.trail[i] =
        this.trail[i] > fighter.health ? Math.max(fighter.health, this.trail[i] - trailLoss) : fighter.health;
      this.#drawBar(i, fighter);
      const active = Object.entries(fighter.powerUps)
        .filter(([, remainingMs]) => remainingMs > 0)
        .map(([type, remainingMs]) => `${STATUS_LABELS[type]} ${Math.ceil(remainingMs / 1000)}s`);
      this.statusLabels[i].setText(active.join('  ')).setVisible(active.length > 0);
    });
  }

  showResult(winnerName) {
    this.title.setText(winnerName ? '¡KO!' : 'EMPATE').setVisible(true).setScale(2.4).setAlpha(0);
    this.subtitle.setText(winnerName ? `Gana ${winnerName}` : 'Nadie queda en pie').setVisible(true);
    this.hint.setVisible(true);
    this.scene.tweens.add({ targets: this.title, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
  }

  hideResult() {
    this.title.setVisible(false);
    this.subtitle.setVisible(false);
    this.hint.setVisible(false);
  }

  #drawBar(index, fighter) {
    const g = this.graphics;
    const x = index === 0 ? BAR.margin : GAME_WIDTH - BAR.margin - BAR.width;
    const { y, width, height } = BAR;
    const ratio = fighter.health / fighter.maxHealth;
    const trailRatio = this.trail[index] / fighter.maxHealth;
    const span = (r) => Math.round(width * r);
    const place = (w) => (index === 0 ? x : x + width - w);

    g.fillStyle(COLORS.ink, 1).fillRect(x - 2, y - 2, width + 4, height + 4);
    g.fillStyle(COLORS.back, 1).fillRect(x, y, width, height);
    g.fillStyle(COLORS.trail, 1).fillRect(place(span(trailRatio)), y, span(trailRatio), height);

    const color = ratio > 0.5 ? COLORS.good : ratio > 0.25 ? COLORS.warn : COLORS.danger;
    g.fillStyle(color, 1).fillRect(place(span(ratio)), y, span(ratio), height);
    g.fillStyle(COLORS.shine, 0.3).fillRect(place(span(ratio)), y, span(ratio), 2);

    g.fillStyle(COLORS.ink, 1);
    for (let tick = 1; tick < 10; tick++) g.fillRect(x + Math.round((width * tick) / 10), y, 1, height);
  }
}
