import { spriteKeyFor } from './assetManifest.js';

/**
 * Estados que un personaje puede animar. Coinciden con FighterState.
 * Los nombres de archivo siguen la convención: art/source/<ranger>/<estado>.png
 */
export const ANIMATION_STATES = Object.freeze(['idle', 'walk', 'attack', 'hurt', 'teleport', 'ko']);

/** Cuadrícula de pixel art de los sprites actuales (cada "pixel" mide ~49 px en el PNG original). */
const NATIVE_SIZE = Object.freeze({ width: 53, height: 83 });

/**
 * ANIMACIONES POR DATOS
 * ─────────────────────
 * Cada personaje declara qué hojas de sprites puede tener. Para sumar una:
 *   1. Subí una tira horizontal a art/source/<ranger>/<estado>.png
 *      (todos los frames del mismo tamaño, en una sola fila, fondo transparente,
 *      con los pies al borde inferior y el personaje mirando hacia el mismo lado que la pose base).
 *   2. Ajustá `frames` abajo a la cantidad real de cuadros de esa tira.
 * Si el archivo no existe, el estado usa la pose actual con animación por código.
 *
 * - `frames`: cantidad de cuadros de la tira.
 * - `frameRate`: solo para idle y walk (loops). Los demás estados se ajustan solos
 *   a la duración de la acción en el juego (ataque, golpe, teletransporte, KO).
 * - `nativeSize` (opcional): tamaño del cuadro en "pixeles de arte" si el PNG está
 *   ampliado (como las poses actuales). Con eso se reduce sin perder nitidez.
 *   Sin `nativeSize`, un cuadro muy grande se reduce suavemente a `displayHeight`.
 * - `pose.nativeSize`: lo mismo, para la imagen base axem-ranger-<ranger>.png.
 * - `spriteFacing`: hacia dónde mira el arte original: 1 = derecha, -1 = izquierda.
 *   Las poses actuales miran a la izquierda. El juego espeja el sprite cuando el personaje
 *   apunta al lado contrario, así que siempre queda de frente a donde se mueve.
 * - `displayHeight`: alto en píxeles del lienzo con el que se dibuja el personaje.
 *   Con la pose actual (83 px nativos) se dibuja 1:1, igual que el escenario.
 */
export const characterAnimationData = Object.freeze({
  violet: {
    spriteFacing: -1,
    displayHeight: 83,
    fallbackTexture: spriteKeyFor('violet'),
    pose: { nativeSize: NATIVE_SIZE },
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
    spriteFacing: -1,
    displayHeight: 83,
    fallbackTexture: spriteKeyFor('orange'),
    pose: { nativeSize: NATIVE_SIZE },
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
