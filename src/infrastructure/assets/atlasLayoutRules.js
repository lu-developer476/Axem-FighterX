/**
 * Reglas visuales de las hojas de referencia. Son los datos de entrada de la
 * detección (`atlasFrameDetection.js`); los cuadros resultantes viven en
 * `atlasFrames.json`, que genera `scripts/analyze-atlas.mjs`.
 */
export const ATLAS_SOURCES = Object.freeze({
  male: Object.freeze({
    id: 'axem-red',
    file: 'art/source/sprites/references/axem-red/axem-red-animation-atlas.png',
    compositeReference: 'art/source/sprites/references/axem-red/axem-red-spritesheet.png',
    // Teal plano con ruido de compresión. Entre algunos cuadros contiguos solo hay
    // halos tenues (hasta ~100 de distancia al fondo): con menos tolerancia se fusionan.
    background: Object.freeze([0, 128, 128]),
    tolerance: 100,
    despeckle: true,
    strategy: 'rows',
    // Cinco renglones con poses de referencia y siluetas, no animaciones.
    supplementalRowCuts: Object.freeze([65, 135, 205, 280]),
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
    file: 'art/source/sprites/references/axem-pink/axem-pink-animation-atlas.png',
    compositeReference: 'art/source/sprites/references/axem-pink/axem-pink-spritesheet.png',
    // Blanco con ruido tipo JPEG; las estelas rosa pálido exigen tolerancia baja.
    background: Object.freeze([255, 255, 255]),
    tolerance: 30,
    strategy: 'regions',
    gap: 3,
    minPixels: 12,
    // Centros verticales que separan las siete franjas de la hoja Pink.
    rowCuts: Object.freeze([56, 122, 191, 248, 305, 370]),
    excluded: Object.freeze([]),
  }),
});

/**
 * Clasificación manual de las 14 secuencias de Axem Red. Los grupos que
 * comparten una animación conservan su identidad individual en el atlas.
 */
export const ATLAS_SEQUENCE_ROLES = Object.freeze({
  male: Object.freeze({
    'group-01': 'idle',
    'group-02': 'idle',
    'group-03': 'punch',
    'group-04': 'punch',
    'group-05': 'punch',
    'group-06': 'battle-pose',
    'group-07': 'battle-pose',
    'group-08': 'battle-pose',
    'group-09': 'battle-pose',
    'group-10': 'run',
    'group-11': 'dash',
    'group-12': 'jump',
    'group-13': 'hit-hurt',
    'group-14': 'teleport',
  }),
});
