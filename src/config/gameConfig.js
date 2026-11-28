import Phaser from 'phaser';

/** Resolución lógica 480×270; Phaser expande el canvas al área visible completa. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const createGameConfig = (scenes) => ({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  // Mantiene una sola resolución lógica y evita un segundo reescalado.
  resolution: 1,
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: scenes,
});
