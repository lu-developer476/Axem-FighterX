import { spriteKeyFor } from './assetManifest.js';

/**
 * Estados que un personaje puede animar. Coinciden con FighterState.
 * Los nombres de archivo siguen la convención: <ranger>/<estado>.png
 */
export const ANIMATION_STATES = Object.freeze(['idle', 'walk', 'attack', 'hurt', 'teleport', 'ko']);

/**
 * ANIMACIONES POR DATOS
 * ─────────────────────
 * Cada personaje declara qué hojas de sprites puede tener. Para sumar una:
 *   1. Subí una tira horizontal a public/assets/sprites/rangers/<ranger>/<estado>.png
 *      (todos los frames del mismo tamaño, en una sola fila, con los pies al borde inferior).
 *   2. Ajustá `frames` abajo a la cantidad real de cuadros de esa tira.
 * Si el archivo no existe, el estado usa la pose actual con animación por código.
 *
 * - `frames`: cantidad de cuadros de la tira.
 * - `frameRate`: solo para idle y walk (loops). Los demás estados se ajustan solos
 *   a la duración de la acción en el juego (ataque, golpe, teletransporte, KO).
 * - `spriteFacing`: 1 si el arte mira a la derecha, -1 si mira a la izquierda.
 * - `displayHeight`: alto en píxeles con el que se dibuja el personaje.
 */
export const characterAnimationData = Object.freeze({
  violet: {
    spriteFacing: 1,
    displayHeight: 104,
    fallbackTexture: spriteKeyFor('violet'),
    sheets: {
      idle: { frames: 4, frameRate: 6 },
      walk: { frames: 6, frameRate: 10 },
      attack: { frames: 6 },
      hurt: { frames: 2 },
      teleport: { frames: 6 },
      ko: { frames: 4 },
    },
  },
  orange: {
    spriteFacing: 1,
    displayHeight: 104,
    fallbackTexture: spriteKeyFor('orange'),
    sheets: {
      idle: { frames: 4, frameRate: 6 },
      walk: { frames: 6, frameRate: 10 },
      attack: { frames: 6 },
      hurt: { frames: 2 },
      teleport: { frames: 6 },
      ko: { frames: 4 },
    },
  },
});

export const sheetFile = (rangerId, state) => `${rangerId}/${state}.png`;
export const sheetTextureKey = (rangerId, state) => `sheet-${rangerId}-${state}`;
export const animationKey = (rangerId, state) => `${rangerId}:${state}`;
