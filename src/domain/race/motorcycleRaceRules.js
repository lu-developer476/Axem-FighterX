/** Escala compartida por escenario, cámara, motos y objetos. */
export const MOTORCYCLE_WORLD_SCALE = 0.14;

export const MOTORCYCLE_LANE_COUNT = 2;
export const MOTORCYCLE_LANE_BASELINES = Object.freeze([173, 233]);
export const MOTORCYCLE_LANE_SCALES = Object.freeze([0.82, 1.08]);
export const MOTORCYCLE_RACE_OBSTACLES = Object.freeze([
  Object.freeze({ kind: 'hurdle', lane: 0, distance: 420 }),
  Object.freeze({ kind: 'roll-gate', lane: 1, distance: 610 }),
  Object.freeze({ kind: 'hurdle', lane: 0, distance: 880 }),
  Object.freeze({ kind: 'roll-gate', lane: 1, distance: 1120 }),
  Object.freeze({ kind: 'hurdle', lane: 0, distance: 1380 }),
  Object.freeze({ kind: 'roll-gate', lane: 1, distance: 1640 }),
  Object.freeze({ kind: 'hurdle', lane: 0, distance: 1910 }),
  Object.freeze({ kind: 'roll-gate', lane: 1, distance: 2180 }),
  Object.freeze({ kind: 'hurdle', lane: 0, distance: 2470 }),
  Object.freeze({ kind: 'roll-gate', lane: 1, distance: 2760 }),
  Object.freeze({ kind: 'hurdle', lane: 0, distance: 3070 }),
  Object.freeze({ kind: 'roll-gate', lane: 1, distance: 3380 }),
]);

export function normalizeMotorcycleLane(lane) {
  const numeric = Number(lane);
  const normalized = Number.isFinite(numeric) ? Math.round(numeric) : 0;
  return Math.max(0, Math.min(MOTORCYCLE_LANE_COUNT - 1, normalized));
}

/** Avanza el desplazamiento horizontal dentro del carril con un eje -1/0/1. */
export function advanceMotorcycleLateralOffset(offset, direction, deltaMs, speed = 280) {
  const current = Number.isFinite(Number(offset)) ? Number(offset) : 0;
  const axis = Number.isFinite(Number(direction))
    ? Math.max(-1, Math.min(1, Number(direction)))
    : 0;
  const elapsed = Number.isFinite(Number(deltaMs))
    ? Math.max(0, Math.min(50, Number(deltaMs)))
    : 0;
  const rate = Number.isFinite(Number(speed)) && Number(speed) > 0 ? Number(speed) : 280;
  return current + axis * rate * elapsed / 1000;
}
