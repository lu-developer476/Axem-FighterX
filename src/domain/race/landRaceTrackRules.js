export const LAND_RACE_WORLD_SCALE = 0.14;
export const LAND_RACE_RUNNER_X_BOUNDS = Object.freeze({ min: 38, max: 132 });
export function clampLandRaceRunnerX(x) {
  const numeric = Number(x);
  if (!Number.isFinite(numeric)) return LAND_RACE_RUNNER_X_BOUNDS.min;
  return Math.max(LAND_RACE_RUNNER_X_BOUNDS.min, Math.min(LAND_RACE_RUNNER_X_BOUNDS.max, numeric));
}
export const LAND_RACE_MAP_WIDTH = 1080;
export const LAND_RACE_MAP_LOOP_DISTANCE = Math.round(LAND_RACE_MAP_WIDTH / LAND_RACE_WORLD_SCALE);
export const LAND_RACE_LANE_Y = 208;
export const LAND_RACE_LANE_SCALE = 1;