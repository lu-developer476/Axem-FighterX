/**
 * Catálogo de personajes jugables. Los valores de stats son provisionales.
 * `spriteKey` es una clave lógica; el archivo real se resuelve en infrastructure.
 */
export const RANGER_IDS = Object.freeze({
  VIOLET: 'violet',
  ORANGE: 'orange',
});

export const rangerCatalog = Object.freeze({
  [RANGER_IDS.VIOLET]: {
    id: RANGER_IDS.VIOLET,
    name: 'Axem Violet',
    stats: { moveSpeed: 90, hoverAmplitude: 4, hoverSpeed: 3 },
  },
  [RANGER_IDS.ORANGE]: {
    id: RANGER_IDS.ORANGE,
    name: 'Axem Orange',
    stats: { moveSpeed: 75, hoverAmplitude: 3, hoverSpeed: 2.4 },
  },
});
