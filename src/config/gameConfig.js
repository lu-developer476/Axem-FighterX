import Phaser from 'phaser';

/** Resolución lógica del pixel art: 480×270, ampliada en múltiplos enteros. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const createGameConfig = (scenes) => ({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#120f26',
  // Renderiza a doble densidad; pixelArt mantiene el muestreo nearest-neighbor.
  resolution: 2,
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Evita factores fraccionarios (2.7x, 3.4x, etc.) que deforman los píxeles.
    zoom: Phaser.Scale.MAX_ZOOM,
  },
  scene: scenes,
});
