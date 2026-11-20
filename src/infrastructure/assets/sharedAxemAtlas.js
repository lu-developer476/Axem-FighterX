import atlasManifest from './axemAtlasFrames.json';
import { ATLAS_EXCLUDED_REGIONS } from './atlasLayoutRules.js';

/**
 * Fuente única de movimientos de los Axem Rangers X.
 *
 * Los cuadros no están en una cuadrícula: cada uno tiene su propio rectángulo
 * en `axemAtlasFrames.json` (generado por `scripts/analyze-atlas.mjs`). Las
 * secuencias activas solo eligen qué grupo reproducir; Violet y Orange usan
 * exactamente las mismas, y únicamente cambia el tono (AXEM_PALETTE_HUES).
 */
export const AXEM_ATLAS_SIZE = Object.freeze({
  width: atlasManifest.width,
  height: atlasManifest.height,
});

export { ATLAS_EXCLUDED_REGIONS as EXCLUDED_ATLAS_REGIONS };

const freezeFrame = (frame) => Object.freeze({ ...frame });
const freezeGroup = (group) => Object.freeze({
  id: group.id,
  bounds: Object.freeze([...group.bounds]),
  frames: Object.freeze(group.frames.map(freezeFrame)),
});

/** Todos los grupos de cuadros detectados, en el orden visual del atlas. */
export const ATLAS_GROUPS = Object.freeze(atlasManifest.groups.map(freezeGroup));

const groupById = (id) => {
  const group = ATLAS_GROUPS.find((candidate) => candidate.id === id);
  if (!group) throw new Error('El atlas no tiene el grupo ' + id + '.');
  return group;
};

const sequenceFrom = (groupId, { frameRate, loop }) => {
  const { frames } = groupById(groupId);
  return Object.freeze({
    groupId,
    frameRate,
    loop,
    frameCount: frames.length,
    // Línea de los pies del grupo: los cuadros se apoyan sobre ella.
    baseline: Math.max(...frames.map((frame) => frame.y + frame.h)),
    frames,
  });
};

/**
 * Secuencias reproducidas en combate. Orden de cuadros = orden en el atlas.
 *  - idle:   grupo 01, 7 cuadros
 *  - walk:   grupo 02, 9 cuadros
 *  - attack: grupo 03, 10 cuadros
 */
export const SHARED_ANIMATION_SEQUENCES = Object.freeze({
  idle: sequenceFrom('group-01', { frameRate: 6, loop: true }),
  walk: sequenceFrom('group-02', { frameRate: 10, loop: true }),
  attack: sequenceFrom('group-03', { frameRate: 24, loop: false }),
});

/** Grupos del atlas que todavía no se reproducen como animación de combate. */
export const AUXILIARY_ATLAS_GROUPS = Object.freeze(
  ATLAS_GROUPS.filter((group) =>
    !Object.values(SHARED_ANIMATION_SEQUENCES).some((sequence) => sequence.groupId === group.id)),
);

/**
 * Celda común a todos los cuadros activos. Mantiene la misma escala en todos
 * los estados y apoya los pies sobre el borde inferior. `anchorX` es la columna
 * de la celda donde cae el pivote de pies de cada cuadro.
 */
export const SHARED_CELL_HEIGHT = 52;
export const SHARED_CELL = (() => {
  const frames = Object.values(SHARED_ANIMATION_SEQUENCES).flatMap((sequence) => sequence.frames);
  const anchorX = Math.max(...frames.map((frame) => frame.pivotX));
  const rightReach = Math.max(...frames.map((frame) => frame.w - frame.pivotX));
  return Object.freeze({
    width: anchorX + rightReach,
    height: SHARED_CELL_HEIGHT,
    anchorX,
  });
})();

/**
 * Posición de un cuadro dentro de su celda: pies sobre la línea base y pivote
 * sobre `anchorX`. Función pura para poder verificarla sin canvas.
 */
export function placeFrameInCell(frame, baseline) {
  return {
    x: SHARED_CELL.anchorX - frame.pivotX,
    y: SHARED_CELL.height - frame.h - (baseline - (frame.y + frame.h)),
  };
}

/** Paletas destino; solo se sustituye la familia cromática roja del atlas. */
export const AXEM_PALETTE_HUES = Object.freeze({
  violet: 268,
  orange: 22,
});
