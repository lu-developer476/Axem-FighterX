/**
 * Reglas visuales de las hojas de referencia. Son los datos de entrada de la
 * detección (`atlasFrameDetection.js`); los cuadros resultantes viven en
 * `atlasFrames.json`, que genera `scripts/analyze-atlas.mjs`.
 */
export const ATLAS_SOURCES = Object.freeze({
  male: Object.freeze({
    id: 'axem-red',
    file: 'art/source/sprites/references/axem-red/axem-red-spritesheet.png',
    // Teal plano con ruido de compresión. Entre algunos cuadros contiguos solo hay
    // halos tenues (hasta ~100 de distancia al fondo): con menos tolerancia se fusionan.
    background: Object.freeze([0, 128, 128]),
    tolerance: 100,
    despeckle: true,
    strategy: 'rows',
    // bounds = [x, y, ancho, alto]
    excluded: Object.freeze([
      Object.freeze({
        id: 'reference-poses',
        bounds: Object.freeze([525, 0, 205, 385]),
        reason:
          'Siluetas de referencia (rojo pleno, rojo claro y rosa), personaje caído, pose con hacha, ' +
          'y poses sueltas: no forman tiras de animación.',
      }),
    ]),
  }),
  female: Object.freeze({
    id: 'axem-pink',
    file: 'art/source/sprites/references/axem-pink/axem-pink-spritesheet.png',
    // Blanco con ruido tipo JPEG; las estelas rosa pálido exigen tolerancia baja.
    background: Object.freeze([255, 255, 255]),
    tolerance: 30,
    strategy: 'regions',
    gap: 3,
    minPixels: 12,
    excluded: Object.freeze([]),
  }),
});

/**
 * Grupos de Axem Red que el combate reproduce como estados. El resto de los
 * grupos se conserva como secuencia disponible, sin interpretarla.
 */
export const ATLAS_SEQUENCE_ROLES = Object.freeze({
  male: Object.freeze({
    'group-01': 'idle',
    'group-02': 'walk',
    'group-03': 'attack',
  }),
});
