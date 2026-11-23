export const MOTORCYCLE_LANE_COUNT = 2;
export const MOTORCYCLE_LANE_BASELINES = Object.freeze([173, 233]);
export const MOTORCYCLE_LANE_SCALES = Object.freeze([0.82, 1.08]);
export const MOTORCYCLE_RACE_OBSTACLES = Object.freeze([
  Object.freeze({ kind: 'barrier', lane: 0, distance: 420 }),
  Object.freeze({ kind: 'oil', lane: 1, distance: 610 }),
  Object.freeze({ kind: 'crate', lane: 0, distance: 880 }),
  Object.freeze({ kind: 'barrier', lane: 1, distance: 1120 }),
  Object.freeze({ kind: 'oil', lane: 0, distance: 1380 }),
  Object.freeze({ kind: 'crate', lane: 1, distance: 1640 }),
  Object.freeze({ kind: 'barrier', lane: 0, distance: 1910 }),
  Object.freeze({ kind: 'oil', lane: 1, distance: 2180 }),
  Object.freeze({ kind: 'crate', lane: 0, distance: 2470 }),
  Object.freeze({ kind: 'barrier', lane: 1, distance: 2760 }),
  Object.freeze({ kind: 'oil', lane: 0, distance: 3070 }),
  Object.freeze({ kind: 'crate', lane: 1, distance: 3380 }),
]);

export function normalizeMotorcycleLane(lane) {
  const numeric = Number(lane);
  const normalized = Number.isFinite(numeric) ? Math.round(numeric) : 0;
  return Math.max(0, Math.min(MOTORCYCLE_LANE_COUNT - 1, normalized));
}