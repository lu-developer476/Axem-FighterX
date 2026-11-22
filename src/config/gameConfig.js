import Phaser from 'phaser';

/** Resolución lógica del pixel art: 480×270, ampliada en múltiplos enteros. */
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
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Evita factores fraccionarios (2.7x, 3.4x, etc.) que deforman los píxeles.
    zoom: Phaser.Scale.MAX_ZOOM,
  },
  scene: scenes,
});
