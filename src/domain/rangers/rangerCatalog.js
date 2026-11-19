/**
 * Catálogo de personajes jugables (solo reglas de juego).
 * Lo visual (sprites, animaciones) vive en infrastructure/assets.
 * Los valores de stats son provisionales y se pueden ajustar libremente.
 */
export const RANGER_IDS = Object.freeze({
  VIOLET: 'violet',
  ORANGE: 'orange',
});

export const rangerCatalog = Object.freeze({
  [RANGER_IDS.VIOLET]: {
    id: RANGER_IDS.VIOLET,
    name: 'Axem Violet',
    stats: {
      maxHealth: 100,
      moveSpeed: 95,
      attackDamage: 5,
      attackReach: 62,
      knockback: 170,
      hoverAmplitude: 12,
      hoverSpeed: 3,
    },
  },
  [RANGER_IDS.ORANGE]: {
    id: RANGER_IDS.ORANGE,
    name: 'Axem Orange',
    stats: {
      maxHealth: 100,
      moveSpeed: 80,
      attackDamage: 5,
      attackReach: 70,
      knockback: 150,
      hoverAmplitude: 10,
      hoverSpeed: 2.4,
    },
  },
});
