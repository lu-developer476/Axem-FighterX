import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import ASSET_STANDARDS from '../../../art/source/sprites/asset-standards.json';

/** Estados del luchador; las poses de combate se aplican de forma procedural. */
export const ANIMATION_STATES = Object.freeze([
  'idle', 'walk', 'dash', 'dodge', 'block', 'block-hit', 'attack',
  'special-attack', 'hurt', 'land', 'teleport', 'victory', 'ko',
]);

/**
 * Orientación nativa de cada fuente, separada por género.
 * Menú, cinemática y combate consultan este dato para no invertir imágenes a mano.
 */
const CHARACTER_DATA = Object.freeze({
  spriteFacing: Object.freeze({
    // Las dos ilustraciones Super Axem tienen orientación nativa hacia la derecha.
    male: 1,
    female: 1,
  }),
  displayHeight: ASSET_STANDARDS.categories.combatTexture.height,
  // Alto fijo de cada celda de animación: no depende del frame activo.
  frameHeight: ASSET_STANDARDS.categories.combatTexture.height,
  sheets: Object.freeze({}),
});

export const characterAnimationData = Object.freeze({
  [RANGER_IDS.VIOLET]: Object.freeze({
    ...CHARACTER_DATA,
    spriteFacing: Object.freeze({ male: 1, female: 1 }),
    sheets: Object.freeze({}),
  }),
  [RANGER_IDS.ORANGE]: CHARACTER_DATA,
});

export const spriteFacingFor = (rangerId, gender = 'male') =>
  characterAnimationData[rangerId]?.spriteFacing?.[gender] ?? -1;

export const animationKey = (rangerId, state) => rangerId + ':' + state;

/**
 * Hojas de juego generadas desde los GIF de 150×100 px. Cada cuadro mide 86×57 px
 * (los 150×100 a escala 1/1,75, la escala nativa del resto de las hojas).
 */
export const GIF_ACTIONS = Object.freeze([
  'idle', 'dash', 'punch-01', 'punch-02', 'punch-03', 'hit', 'hurt',
  'jump', 'teleport', 'charge', 'battle-pose', 'pose',
  'guard', 'roll', 'ko',
]);
export const GIF_CELL = Object.freeze({
  width: ASSET_STANDARDS.categories.actionFrameCell.width,
  height: ASSET_STANDARDS.categories.actionFrameCell.height,
});
/**
 * Las hojas de carrera (53×83) apoyan los pies 27 px sobre el borde inferior de la celda
 * y se dibujan con origen en ese borde. Para que los pies queden en el mismo punto, las
 * hojas GIF (pies en la fila 55 de 57) usan un origen vertical equivalente.
 */
export const GIF_ORIGIN_Y = (
  ASSET_STANDARDS.categories.actionFrameCell.feetY +
  ASSET_STANDARDS.categories.combatTexture.feetY
) / GIF_CELL.height;
