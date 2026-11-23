import { repeatCoursePattern } from './raceCourseRules.js';
import { TREADMILL_RUNNER_X } from './treadmillRaceRules.js';

/** Escala horizontal compartida por el mapa, los corredores y los objetos. */
export const LAND_RACE_WORLD_SCALE = 0.14;

/** Zona segura del corredor en pantalla; el resto del ancho queda para el recorrido. */
export const LAND_RACE_RUNNER_X_BOUNDS = Object.freeze({ min: 38, max: 132 });

export function clampLandRaceRunnerX(x) {
  const numeric = Number(x);
  if (!Number.isFinite(numeric)) return LAND_RACE_RUNNER_X_BOUNDS.min;
  return Math.max(LAND_RACE_RUNNER_X_BOUNDS.min, Math.min(LAND_RACE_RUNNER_X_BOUNDS.max, numeric));
}

export function getLandRaceGapJumpProgress(distance, startDistance, endDistance) {
  if (![distance, startDistance, endDistance].every(Number.isFinite) ||
      endDistance <= startDistance) return 0;
  return Math.max(0, Math.min(1, (distance - startDistance) / (endDistance - startDistance)));
}
export const LAND_RACE_MAP_WIDTH = 1080;
export const LAND_RACE_MAP_LOOP_DISTANCE = Math.round(LAND_RACE_MAP_WIDTH / LAND_RACE_WORLD_SCALE);

/** Línea única del recorrido: los pies quedan apoyados en la plataforma inferior. */
export const LAND_RACE_LANE_Y = 208;
export const LAND_RACE_LANE_SCALE = 1;

/** Hueco visible al inicio de cave-2.png, medido sobre el mapa ya escalado. */
const CAVE_TWO_GAP_START_X = 750;
const CAVE_TWO_GAP_END_X = 805;
export const LAND_RACE_GAP_TRIGGER_DISTANCE = 130;
export const LAND_RACE_GAP_JUMP_DURATION_MS = 4300;
export const LAND_RACE_GAP_FALL_DURATION_MS = 1450;
const GAP_APPROACH_CLEARANCE = 160;
const GAP_EXIT_CLEARANCE = 120;

export const LAND_RACE_TERRAIN_GAPS = Object.freeze([
  Object.freeze({
    distance: Math.round((CAVE_TWO_GAP_START_X - TREADMILL_RUNNER_X) / LAND_RACE_WORLD_SCALE),
    width: Math.round((CAVE_TWO_GAP_END_X - CAVE_TWO_GAP_START_X) / LAND_RACE_WORLD_SCALE),
    action: 'jump',
    type: 'gap',
  }),
]);

/**
 * Combina los obstáculos del circuito con los huecos reales del mapa.
 * Evita colocar obstáculos artificiales sobre el hueco o su zona de aterrizaje.
 */
export function createLandRaceObstacles(pattern, totalDistance, {
  cycleDistance = 1200,
  finishPadding = 90,
} = {}) {
  const repeatedObstacles = repeatCoursePattern(pattern, totalDistance, {
    cycleDistance,
    finishPadding,
  });
  const gaps = repeatCoursePattern(LAND_RACE_TERRAIN_GAPS, totalDistance, {
    cycleDistance: LAND_RACE_MAP_LOOP_DISTANCE,
    finishPadding: Math.max(finishPadding, LAND_RACE_TERRAIN_GAPS[0].width + GAP_EXIT_CLEARANCE),
  });

  const clearOfGaps = repeatedObstacles.filter((obstacle) => !gaps.some((gap) =>
    obstacle.distance >= gap.distance - GAP_APPROACH_CLEARANCE &&
    obstacle.distance <= gap.distance + gap.width + GAP_EXIT_CLEARANCE,
  ));

  return [...clearOfGaps, ...gaps].sort((left, right) => left.distance - right.distance);
}
