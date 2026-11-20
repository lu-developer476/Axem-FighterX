/** Dimensiones y reglas del escenario (unidades = píxeles del lienzo interno). */
export const ARENA = Object.freeze({
  width: 640,
  /** Profundidad del plano del suelo; nunca permite caminar por debajo del piso. */
  minY: 170,
  groundY: 218,
  maxY: 218,
  minX: 40,
  maxX: 600,
  /** Distancia mínima entre centros: evita que los luchadores se atraviesen. */
  minGap: 34,
  /** Distancia máxima: la cámara solo muestra 480px de los 640 del escenario. */
  maxSeparation: 380,
  spawnLeftX: 240,
  spawnRightX: 400,
  teleportDistance: 110,
  teleportRange: 150,
});

/**
 * Restringe únicamente la profundidad del plano del suelo (Y).
 * La altura de vuelo (Z) sigue gobernada por FLIGHT en todos los escenarios.
 */
export function getArenaForGroundDepthMode(groundDepthMode = 'free') {
  if (groundDepthMode !== 'restricted') return ARENA;
  return Object.freeze({
    ...ARENA,
    minY: ARENA.groundY,
    maxY: ARENA.groundY,
  });
}

/** Límites de vuelo medidos desde el plano del suelo, no desde la cámara. */
export const FLIGHT = Object.freeze({
  maxAltitude: 140,
  skyMargin: 8,
  attackDepthTolerance: 18,
});

export const PICKUP = Object.freeze({
  firstSpawnMs: 7000,
  intervalMs: 12000,
  lifetimeMs: 9000,
  healAmount: 25,
  width: 16,
  height: 28,
});
