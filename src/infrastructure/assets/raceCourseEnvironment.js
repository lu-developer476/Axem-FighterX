const object = (id, assetId, source, x, y, width, height, scrollFactor, depth, alpha = 1) => Object.freeze({
  id,
  assetId,
  source: Object.freeze(source),
  x,
  y,
  width,
  height,
  scrollFactor,
  depth,
  alpha,
});

/** Dimensiones reales verificadas de las cuatro hojas originales. */
export const RACE_ENVIRONMENT_SHEET_DIMENSIONS = Object.freeze({
  'sunnyland-tall-forest-tileset': Object.freeze({ width: 1280, height: 900 }),
  'free-platformer-tileset': Object.freeze({ width: 1800, height: 1200 }),
  'free-platformer-tileset-2': Object.freeze({ width: 1800, height: 1200 }),
  'sidescroll-tileset': Object.freeze({ width: 1280, height: 1024 }),
});

/** Cada entrada es un recorte individual con su propia posición y velocidad de parallax. */
export const RACE_COURSE_ENVIRONMENT = Object.freeze({
  terrestrial: Object.freeze([
    // Sunnyland: copas, troncos, helechos, vegetación y rocas por separado.
    object('forest-canopy-west', 'sunnyland-tall-forest-tileset', { x: 0, y: 198, width: 190, height: 286 }, 8, 20, 100, 150, 0.18, -94, 0.82),
    object('forest-canopy-center', 'sunnyland-tall-forest-tileset', { x: 192, y: 238, width: 296, height: 242 }, 245, 16, 150, 122, 0.21, -92, 0.84),
    object('forest-trunk-west', 'sunnyland-tall-forest-tileset', { x: 585, y: 320, width: 66, height: 340 }, 72, 5, 36, 185, 0.22, -87, 0.86),
    object('forest-trunk-east', 'sunnyland-tall-forest-tileset', { x: 705, y: 320, width: 61, height: 340 }, 490, 0, 34, 182, 0.24, -86, 0.82),
    object('forest-tree-right', 'sunnyland-tall-forest-tileset', { x: 950, y: 320, width: 246, height: 345 }, 1115, 8, 124, 174, 0.25, -85, 0.88),
    object('forest-bush-west', 'sunnyland-tall-forest-tileset', { x: 278, y: 535, width: 178, height: 125 }, 215, 174, 92, 65, 0.34, -72, 1),
    object('forest-fern-west', 'sunnyland-tall-forest-tileset', { x: 230, y: 700, width: 172, height: 100 }, 360, 182, 92, 52, 0.42, -68, 1),
    object('forest-fern-center', 'sunnyland-tall-forest-tileset', { x: 460, y: 620, width: 118, height: 120 }, 790, 175, 92, 64, 0.43, -67, 1),
    object('forest-fern-east', 'sunnyland-tall-forest-tileset', { x: 584, y: 678, width: 180, height: 122 }, 1335, 178, 94, 64, 0.44, -66, 1),
    object('forest-rust-rock', 'sunnyland-tall-forest-tileset', { x: 122, y: 595, width: 100, height: 125 }, 1030, 177, 58, 66, 0.4, -69, 1),
    object('forest-rock-spire-west', 'sunnyland-tall-forest-tileset', { x: 766, y: 454, width: 62, height: 151 }, 910, 66, 34, 84, 0.2, -90, 0.82),
    object('forest-rock-spire-east', 'sunnyland-tall-forest-tileset', { x: 875, y: 454, width: 60, height: 150 }, 990, 84, 32, 80, 0.21, -89, 0.78),
    object('forest-moss-rock', 'sunnyland-tall-forest-tileset', { x: 768, y: 670, width: 164, height: 154 }, 1595, 145, 88, 82, 0.46, -65, 0.9),
    // Free Platformer: islas y formaciones rocosas flotantes independientes.
    object('floating-island-west', 'free-platformer-tileset', { x: 70, y: 70, width: 475, height: 440 }, 20, 8, 152, 140, 0.12, -100, 0.84),
    object('floating-island-center', 'free-platformer-tileset', { x: 555, y: 68, width: 430, height: 445 }, 610, 5, 164, 160, 0.13, -99, 0.82),
    object('floating-island-hanging-west', 'free-platformer-tileset', { x: 1043, y: 68, width: 195, height: 170 }, 970, 24, 76, 65, 0.15, -98, 1),
    object('floating-island-hanging-east', 'free-platformer-tileset', { x: 1252, y: 68, width: 180, height: 170 }, 1270, 14, 72, 64, 0.16, -98, 1),
    object('floating-island-cross', 'free-platformer-tileset', { x: 1447, y: 68, width: 286, height: 245 }, 1505, 18, 120, 100, 0.17, -97, 1),
    object('floating-island-shelf', 'free-platformer-tileset', { x: 1441, y: 355, width: 292, height: 142 }, 1680, 98, 112, 55, 0.18, -93, 1),
    object('floating-island-square-arch', 'free-platformer-tileset', { x: 987, y: 516, width: 291, height: 280 }, 70, 108, 112, 108, 0.22, -88, 1),
    object('floating-rock-small', 'free-platformer-tileset', { x: 404, y: 602, width: 96, height: 82 }, 560, 116, 42, 38, 0.23, -87, 1),
    object('floating-rock-spire', 'free-platformer-tileset', { x: 759, y: 604, width: 94, height: 145 }, 925, 124, 42, 68, 0.24, -86, 1),
    object('floating-island-u-west', 'free-platformer-tileset', { x: 67, y: 698, width: 290, height: 435 }, 495, 22, 100, 145, 0.23, -89, 1),
    object('floating-island-arch-south', 'free-platformer-tileset', { x: 363, y: 790, width: 473, height: 340 }, 1010, 42, 150, 125, 0.25, -85, 1),
    object('floating-island-long-east', 'free-platformer-tileset', { x: 840, y: 844, width: 481, height: 285 }, 1375, 126, 178, 106, 0.28, -81, 1),
    object('floating-rock-cluster-east', 'free-platformer-tileset', { x: 1347, y: 947, width: 276, height: 194 }, 300, 165, 105, 74, 0.3, -77, 1),
    object('floating-rock-column-east', 'free-platformer-tileset', { x: 1635, y: 897, width: 108, height: 235 }, 1630, 148, 48, 108, 0.31, -76, 1),
    // Free Platformer 2: árboles, arbustos, señal, flores, cristales y plantas.
    object('bush-small-west', 'free-platformer-tileset-2', { x: 68, y: 68, width: 137, height: 134 }, 22, 194, 52, 50, 0.38, -74, 1),
    object('bush-small-center-west', 'free-platformer-tileset-2', { x: 232, y: 78, width: 140, height: 126 }, 475, 198, 48, 47, 0.4, -73, 1),
    object('bush-small-center-east', 'free-platformer-tileset-2', { x: 410, y: 112, width: 88, height: 88 }, 730, 202, 40, 39, 0.41, -73, 1),
    object('bush-small-east', 'free-platformer-tileset-2', { x: 545, y: 138, width: 74, height: 62 }, 895, 204, 36, 42, 0.42, -72, 1),
    object('wooden-sign', 'free-platformer-tileset-2', { x: 692, y: 68, width: 98, height: 90 }, 1120, 145, 48, 60, 0.36, -75, 1),
    object('tree-small', 'free-platformer-tileset-2', { x: 905, y: 68, width: 210, height: 152 }, 1580, 10, 100, 118, 0.29, -84, 1),
    object('tree-medium', 'free-platformer-tileset-2', { x: 1195, y: 66, width: 230, height: 410 }, 710, 12, 118, 166, 0.31, -83, 1),
    object('tree-right', 'free-platformer-tileset-2', { x: 1460, y: 66, width: 265, height: 370 }, 1235, 8, 142, 168, 0.32, -82, 1),
    object('treehouse-tree', 'free-platformer-tileset-2', { x: 68, y: 226, width: 550, height: 906 }, 185, 13, 154, 206, 0.35, -79, 1),
    object('large-oak-tree', 'free-platformer-tileset-2', { x: 644, y: 231, width: 510, height: 896 }, 430, 0, 160, 226, 0.37, -78, 1),
    object('white-flower-west', 'free-platformer-tileset-2', { x: 1350, y: 526, width: 65, height: 122 }, 330, 176, 34, 56, 0.44, -70, 1),
    object('white-flower-center', 'free-platformer-tileset-2', { x: 1529, y: 532, width: 64, height: 116 }, 1010, 177, 34, 56, 0.45, -69, 1),
    object('white-flower-east', 'free-platformer-tileset-2', { x: 1690, y: 534, width: 67, height: 116 }, 1460, 176, 34, 56, 0.45, -69, 1),
    object('blue-crystal-west', 'free-platformer-tileset-2', { x: 1350, y: 682, width: 82, height: 166 }, 760, 156, 38, 74, 0.42, -71, 1),
    object('blue-crystal-center', 'free-platformer-tileset-2', { x: 1518, y: 684, width: 84, height: 160 }, 1215, 169, 36, 66, 0.43, -70, 1),
    object('blue-crystal-east', 'free-platformer-tileset-2', { x: 1688, y: 706, width: 75, height: 136 }, 1700, 178, 34, 60, 0.44, -69, 1),
    object('carnivorous-plant-west', 'free-platformer-tileset-2', { x: 1360, y: 876, width: 165, height: 267 }, 620, 148, 58, 86, 0.47, -66, 1),
    object('carnivorous-plant-east', 'free-platformer-tileset-2', { x: 1547, y: 863, width: 208, height: 282 }, 1420, 148, 84, 88, 0.48, -65, 1),
  ]),
  axem: Object.freeze([
    // Sidescroll: fachadas, arcos, ruinas, muros y columnas independientes.
    object('upper-ruined-arch', 'sidescroll-tileset', { x: 392, y: 0, width: 230, height: 220 }, 45, 8, 116, 110, 0.18, -98, 0.8),
    object('upper-stone-bridge', 'sidescroll-tileset', { x: 630, y: 25, width: 230, height: 190 }, 265, 4, 128, 98, 0.19, -97, 0.74),
    object('broken-stone-shelf', 'sidescroll-tileset', { x: 0, y: 145, width: 300, height: 205 }, 510, 22, 145, 100, 0.2, -96, 0.84),
    object('gothic-facade-left', 'sidescroll-tileset', { x: 455, y: 445, width: 210, height: 300 }, 25, 70, 102, 146, 0.23, -91, 0.94),
    object('gothic-window-facade', 'sidescroll-tileset', { x: 680, y: 445, width: 220, height: 300 }, 255, 55, 108, 150, 0.25, -90, 0.92),
    object('arched-doorway', 'sidescroll-tileset', { x: 905, y: 455, width: 170, height: 300 }, 500, 65, 82, 145, 0.26, -89, 0.9),
    object('stone-column-west', 'sidescroll-tileset', { x: 1080, y: 430, width: 78, height: 285 }, 760, 8, 42, 158, 0.29, -87, 0.96),
    object('stone-column-east', 'sidescroll-tileset', { x: 1180, y: 430, width: 82, height: 285 }, 890, 4, 45, 164, 0.3, -86, 0.96),
    object('broken-wall-section', 'sidescroll-tileset', { x: 0, y: 690, width: 250, height: 300 }, 1090, 40, 120, 146, 0.31, -85, 0.88),
    object('ruined-stone-panel', 'sidescroll-tileset', { x: 260, y: 700, width: 215, height: 285 }, 1330, 65, 100, 132, 0.33, -84, 0.88),
    object('arched-window-detail', 'sidescroll-tileset', { x: 700, y: 245, width: 170, height: 180 }, 1510, 15, 88, 94, 0.28, -88, 0.86),
    object('ornamental-stone-ledge', 'sidescroll-tileset', { x: 890, y: 300, width: 180, height: 105 }, 1700, 154, 92, 54, 0.35, -82, 0.84),
  ]),
});

/** Ciclos de decoración que cubren la distancia completa de cada carrera. */
export const RACE_COURSE_ENVIRONMENT_LAYOUT = Object.freeze({
  terrestrial: Object.freeze({ worldCycle: 1800, repetitions: 6 }),
  axem: Object.freeze({ worldCycle: 1800, repetitions: 5 }),
});

/** Objetos interactivos de Terrestre extraídos de sprites originales. */
export const LAND_RACE_OBJECT_SPECS = Object.freeze([
  Object.freeze({
    id: 'hurdle',
    instruction: 'PLANTA',
    assetId: 'free-platformer-tileset-2',
    source: Object.freeze({ x: 1360, y: 876, width: 165, height: 267 }),
    displayWidth: 48,
    displayHeight: 64,
  }),
  Object.freeze({
    id: 'roll-gate',
    instruction: 'ARBUSTO',
    assetId: 'free-platformer-tileset-2',
    source: Object.freeze({ x: 68, y: 68, width: 137, height: 134 }),
    displayWidth: 48,
    displayHeight: 42,
  }),
  Object.freeze({
    id: 'stamina',
    instruction: 'ENERGÍA',
    assetId: 'free-platformer-tileset-2',
    source: Object.freeze({ x: 1350, y: 682, width: 82, height: 166 }),
    displayWidth: 16,
    displayHeight: 32,
  }),
]);
