import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';

// BASE_URL permite servir el juego desde un subdirectorio (GitHub Pages) o desde la raíz (Vercel).
const base = import.meta.env.BASE_URL;

/** Asocia cada ranger con su archivo en /public. */
export const spriteManifest = Object.freeze({
  [RANGER_IDS.VIOLET]: `${base}assets/sprites/rangers/violet.png`,
  [RANGER_IDS.ORANGE]: `${base}assets/sprites/rangers/orange.png`,
});

export const spriteKeyFor = (rangerId) => `ranger-${rangerId}`;
