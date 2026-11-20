/**
 * Reglas visuales del atlas `axem-rangers-moves-sprites.png` (730 × 804).
 * Son datos de entrada de la detección; los cuadros resultantes viven en
 * `axemAtlasFrames.json`.
 */

/** Color plano del fondo del atlas. */
export const ATLAS_BACKGROUND = Object.freeze([0, 128, 128]);

/**
 * Zonas que no contienen cuadros del personaje. bounds = [x, y, ancho, alto].
 */
export const ATLAS_EXCLUDED_REGIONS = Object.freeze([
  Object.freeze({
    id: 'reference-and-captions',
    bounds: Object.freeze([525, 0, 205, 385]),
    reason:
      'Siluetas de referencia (rojo pleno, rojo claro y rosa), cadáver con hacha, ' +
      'poses sueltas con accesorios, el rótulo "It\'s over..." y figuras aisladas. ' +
      'No forman tiras de animación ni son cuadros del personaje.',
  }),
]);
