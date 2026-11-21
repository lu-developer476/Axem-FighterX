/**
 * Catálogo de personajes jugables (solo reglas de juego).
 * Violet y Orange comparten las mismas estadísticas; la identidad cromática
 * se resuelve exclusivamente en infrastructure/graphics.
 */
export const RANGER_IDS = Object.freeze({
  VIOLET: 'violet',
  ORANGE: 'orange',
});

const SHARED_RANGER_STATS = Object.freeze({
  maxHealth: 100,
  moveSpeed: 95,
  attackDamage: 5,
  attackReach: 62,
  knockback: 170,
  hoverAmplitude: 12,
  hoverSpeed: 3,
});

export const rangerCatalog = Object.freeze({
  [RANGER_IDS.VIOLET]: {
    id: RANGER_IDS.VIOLET,
    name: 'Axem Violet',
    stats: SHARED_RANGER_STATS,
  },
  [RANGER_IDS.ORANGE]: {
    id: RANGER_IDS.ORANGE,
    name: 'Axem Orange',
    stats: SHARED_RANGER_STATS,
  },
});
