import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';

// Vite resuelve estos PNG al compilar y les asigna su URL final.
// Los sprites del juego viven en art/source (sin fondo): art/source/axem-ranger-<ranger>.png
const poseFiles = import.meta.glob('/art/source/axem-ranger-*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Pose base de cada ranger: la imagen que se usa mientras no haya hojas de sprites. */
export const spriteManifest = Object.freeze(
  Object.fromEntries(
    Object.values(RANGER_IDS).map((rangerId) => {
      const url = poseFiles[`/art/source/axem-ranger-${rangerId}.png`];
      if (!url) throw new Error(`Falta el sprite art/source/axem-ranger-${rangerId}.png`);
      return [rangerId, url];
    }),
  ),
);

/** Textura final (ya reducida a la resolución del juego) de la pose base. */
export const spriteKeyFor = (rangerId) => `ranger-${rangerId}`;

/** Textura con la imagen original en alta resolución, usada solo durante la carga. */
export const sourceKeyFor = (rangerId) => `source-ranger-${rangerId}`;
