import { repeatCoursePattern } from './raceCourseRules.js';
export const LAND_RACE_WORLD_SCALE = 0.14;
export const LAND_RACE_RUNNER_X_BOUNDS = Object.freeze({ min: 38, max: 132 });
export function clampLandRaceRunnerX(x) {
  const numeric = Number(x);
  if (!Number.isFinite(numeric)) return LAND_RACE_RUNNER_X_BOUNDS.min;
  return Math.max(LAND_RACE_RUNNER_X_BOUNDS.min, Math.min(LAND_RACE_RUNNER_X_BOUNDS.max, numeric));
}
export function getLandRaceGapJumpProgress(distance, startDistance, endDistance) {
  if (![distance, startDistance, endDistance].every(Number.isFinite) || endDistance <= startDistance) return 0;
  return Math.max(0, Math.min(1, (distance - startDistance) / (endDistance - startDistance)));
}
export const LAND_RACE_MAP_WIDTH = 1080;
export const LAND_RACE_MAP_LOOP_DISTANCE = Math.round(LAND_RACE_MAP_WIDTH / LAND_RACE_WORLD_SCALE);
export const LAND_RACE_LANE_Y = 208;
export const LAND_RACE_LANE_SCALE = 1;
export const LAND_RACE_GAP_TRIGGER_DISTANCE = 130;
export const LAND_RACE_GAP_JUMP_DURATION_MS = 4300;
export const LAND_RACE_GAP_FALL_DURATION_MS = 1450;
export const LAND_RACE_TERRAIN_GAPS = Object.freeze([]);
export function createLandRaceObstacles(pattern, totalDistance, { cycleDistance = 1200, finishPadding = 90 } = {}) {
  return repeatCoursePattern(pattern, totalDistance, { cycleDistance, finishPadding });
}
