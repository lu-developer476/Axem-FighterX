/**
 * Distribución visual del atlas original (730 × 804).
 *
 * Los tres primeros grupos de la columna izquierda son secuencias completas y
 * coherentes para los estados que el combate reproduce como sprites:
 * reposo, desplazamiento y ataque. El orden de cada grupo es de izquierda a
 * derecha, sin reordenar cuadros.
 *
 * Los grupos auxiliares se documentan para conservar su ubicación y facilitar
 * futuras integraciones, pero no se interpretan automáticamente como estados:
 * algunos mezclan poses, accesorios y efectos que no deben convertirse en frames.
 */
export const AXEM_ATLAS_SIZE = Object.freeze({ width: 730, height: 804 });

export const SHARED_ANIMATION_SEQUENCES = Object.freeze({
  idle: Object.freeze({
    x: 0, y: 0, frameWidth: 34, frameHeight: 52, stepX: 34,
    frameCount: 7, frameRate: 6, loop: true,
  }),
  walk: Object.freeze({
    x: 0, y: 55, frameWidth: 36, frameHeight: 54, stepX: 36,
    frameCount: 10, frameRate: 10, loop: true,
  }),
  attack: Object.freeze({
    x: 0, y: 111, frameWidth: 45, frameHeight: 54, stepX: 45,
    frameCount: 10, frameRate: 24, loop: false,
  }),
});

/**
 * Grupos de cuadros auxiliares vistos en la columna izquierda del atlas.
 * bounds usa [x, y, width, height] y describe el bloque visual, no una tira
 * horizontal uniforme. No se cargan como animaciones hasta clasificar cada
 * pose y separar con certeza los elementos accesorios.
 */
export const AUXILIARY_ATLAS_GROUPS = Object.freeze([
  Object.freeze({ id: 'group-04', bounds: [0, 165, 372, 55], framesSeen: 9 }),
  Object.freeze({ id: 'group-05', bounds: [0, 220, 368, 54], framesSeen: 8 }),
  Object.freeze({ id: 'group-06', bounds: [0, 277, 246, 54], framesSeen: 5 }),
  Object.freeze({ id: 'group-07', bounds: [0, 335, 246, 54], framesSeen: 5 }),
  Object.freeze({ id: 'group-08', bounds: [0, 395, 252, 54], framesSeen: 5 }),
  Object.freeze({ id: 'group-09', bounds: [0, 455, 258, 54], framesSeen: 5 }),
  Object.freeze({ id: 'group-10', bounds: [0, 514, 421, 55], framesSeen: 11 }),
  Object.freeze({ id: 'group-11', bounds: [0, 575, 402, 55], framesSeen: 8 }),
  Object.freeze({ id: 'group-12', bounds: [0, 630, 590, 55], framesSeen: 13 }),
  Object.freeze({ id: 'group-13', bounds: [0, 687, 278, 55], framesSeen: 6 }),
  Object.freeze({ id: 'group-14', bounds: [0, 747, 278, 55], framesSeen: 6 }),
]);

/** Paletas destino; solo se sustituye la familia cromática roja del atlas. */
export const AXEM_PALETTE_HUES = Object.freeze({
  violet: 273,
  orange: 22,
});
