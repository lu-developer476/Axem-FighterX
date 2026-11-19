/** Dimensiones y reglas del escenario (unidades = píxeles del lienzo interno). */
export const ARENA = Object.freeze({
  width: 640,
  /** Profundidad máxima (arriba) y mínima (abajo) del plano de combate. */
  minY: 170,
  groundY: 232,
  maxY: 232,
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

export const PICKUP = Object.freeze({
  firstSpawnMs: 7000,
  intervalMs: 12000,
  lifetimeMs: 9000,
  healAmount: 25,
  width: 16,
  height: 28,
});
