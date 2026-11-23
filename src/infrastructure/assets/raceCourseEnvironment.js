const placement = (assetId, kind, source, target, alpha = 1) => Object.freeze({
  assetId,
  kind,
  source: Object.freeze(source),
  target: Object.freeze(target),
  alpha,
});

const layer = (id, scrollFactor, alpha, patternWidth, placements) => Object.freeze({
  id,
  scrollFactor,
  alpha,
  patternWidth,
  placements: Object.freeze(placements),
});

/** Dimensiones originales de las hojas de sprites usadas por los dos circuitos. */
export const RACE_ENVIRONMENT_SHEET_DIMENSIONS = Object.freeze({
  'sunnyland-tall-forest-tileset': Object.freeze({ width: 1280, height: 900 }),
  'free-platformer-tileset': Object.freeze({ width: 1800, height: 1200 }),
  'free-platformer-tileset-2': Object.freeze({ width: 1800, height: 1200 }),
  'sidescroll-tileset': Object.freeze({ width: 1280, height: 1024 }),
});

/**
 * Recortes intencionales de objetos completos. Las hojas no se muestrean por
 * cuadrículas aleatorias: cada árbol, formación rocosa, planta o pieza de
 * arquitectura tiene una región de origen y una ubicación escénica explícita.
 */
export const RACE_COURSE_ENVIRONMENT = Object.freeze({
  terrestrial: Object.freeze([
    layer('suspended-rock-formations', 0.16, 0.62, 1800, [
      placement('free-platformer-tileset', 'floating-rock', { x: 650, y: 55, width: 605, height: 585 },
        { x: 700, y: 6, width: 220, height: 195 }, 0.9),
      placement('free-platformer-tileset', 'floating-rock-cluster', { x: 55, y: 55, width: 565, height: 530 },
        { x: 55, y: 22, width: 190, height: 178 }, 0.84),
      placement('free-platformer-tileset', 'hanging-rocks', { x: 1235, y: 45, width: 535, height: 410 },
        { x: 1430, y: 14, width: 190, height: 154 }, 0.8),
    ]),
    layer('tall-forest-silhouettes', 0.25, 0.76, 1800, [
      placement('sunnyland-tall-forest-tileset', 'forest-canopy', { x: 185, y: 190, width: 315, height: 415 },
        { x: 0, y: 28, width: 172, height: 184 }, 0.78),
      placement('sunnyland-tall-forest-tileset', 'tall-tree-trunk', { x: 560, y: 315, width: 205, height: 355 },
        { x: 520, y: 8, width: 108, height: 190 }, 0.8),
      placement('sunnyland-tall-forest-tileset', 'forest-tree', { x: 935, y: 305, width: 270, height: 355 },
        { x: 1110, y: 15, width: 145, height: 186 }, 0.78),
      placement('sunnyland-tall-forest-tileset', 'fern-cluster', { x: 215, y: 675, width: 195, height: 140 },
        { x: 285, y: 174, width: 105, height: 74 }, 0.88),
      placement('sunnyland-tall-forest-tileset', 'fern-cluster', { x: 425, y: 610, width: 210, height: 125 },
        { x: 850, y: 174, width: 118, height: 70 }, 0.86),
      placement('sunnyland-tall-forest-tileset', 'rock-and-foliage', { x: 755, y: 650, width: 190, height: 175 },
        { x: 1580, y: 158, width: 100, height: 92 }, 0.82),
    ]),
    layer('forest-objects-and-details', 0.39, 0.9, 1800, [
      placement('free-platformer-tileset-2', 'treehouse-tree', { x: 55, y: 185, width: 660, height: 875 },
        { x: 32, y: 10, width: 238, height: 238 }, 0.96),
      placement('free-platformer-tileset-2', 'large-oak-tree', { x: 750, y: 185, width: 650, height: 900 },
        { x: 470, y: 4, width: 242, height: 244 }, 0.94),
      placement('free-platformer-tileset-2', 'tall-tree', { x: 1370, y: 35, width: 420, height: 505 },
        { x: 1010, y: 16, width: 185, height: 220 }, 0.92),
      placement('free-platformer-tileset-2', 'small-bushes', { x: 45, y: 42, width: 545, height: 155 },
        { x: 280, y: 174, width: 182, height: 55 }, 0.98),
      placement('free-platformer-tileset-2', 'wooden-sign', { x: 805, y: 42, width: 165, height: 160 },
        { x: 760, y: 145, width: 66, height: 66 }, 0.96),
      placement('free-platformer-tileset-2', 'blue-crystal', { x: 660, y: 800, width: 155, height: 300 },
        { x: 880, y: 150, width: 48, height: 92 }, 0.96),
      placement('free-platformer-tileset-2', 'carnivorous-plants', { x: 1250, y: 570, width: 525, height: 585 },
        { x: 1370, y: 105, width: 220, height: 150 }, 0.9),
    ]),
  ]),
  axem: Object.freeze([
    layer('gothic-fortress-facades', 0.2, 0.72, 2048, [
      placement('sidescroll-tileset', 'windowed-stone-facade', { x: 430, y: 430, width: 660, height: 330 },
        { x: 35, y: 8, width: 335, height: 168 }, 0.92),
      placement('sidescroll-tileset', 'arched-ruin', { x: 385, y: 0, width: 500, height: 270 },
        { x: 495, y: 4, width: 245, height: 132 }, 0.76),
      placement('sidescroll-tileset', 'broken-stone-wall', { x: 0, y: 650, width: 405, height: 355 },
        { x: 840, y: 20, width: 205, height: 168 }, 0.84),
    ]),
    layer('fortress-columns-and-ornaments', 0.31, 0.86, 2048, [
      placement('sidescroll-tileset', 'stone-columns', { x: 1080, y: 395, width: 195, height: 325 },
        { x: 1195, y: 0, width: 105, height: 178 }, 0.96),
      placement('sidescroll-tileset', 'arched-doorway-detail', { x: 690, y: 450, width: 390, height: 305 },
        { x: 1515, y: 8, width: 205, height: 158 }, 0.9),
    ]),
  ]),
});
