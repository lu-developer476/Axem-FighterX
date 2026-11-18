import Phaser from 'phaser';

/** Resolución interna baja para look retro; se escala al contenedor. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const STAGE_BOUNDS = Object.freeze({
  minX: 40,
  maxX: GAME_WIDTH - 40,
  minY: 150,
  maxY: GAME_HEIGHT - 20,
});

export const createGameConfig = (scenes) => ({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b1730',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: scenes,
});
