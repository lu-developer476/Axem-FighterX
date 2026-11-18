import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';

/** Asocia cada ranger con su archivo en /public. */
export const spriteManifest = Object.freeze({
  [RANGER_IDS.VIOLET]: '/assets/sprites/rangers/violet.png',
  [RANGER_IDS.ORANGE]: '/assets/sprites/rangers/orange.png',
});

export const spriteKeyFor = (rangerId) => `ranger-${rangerId}`;
