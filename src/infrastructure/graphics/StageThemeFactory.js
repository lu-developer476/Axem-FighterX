import { ARENA } from '../../domain/arena/arena.js';
import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import { hash2, mulberry32 } from './rng.js';
import { createCanvasTexture, rect } from './canvasTexture.js';
import { AMBIENT_FRAMES, FLOOR_SURFACE_HEIGHT, layerWidth, PARALLAX, STAGE_TEXTURES, VIEW } from './StageTextureFactory.js';

const THEMES = Object.freeze({
  [STAGE_IDS.VOLCANO]: {
    sky: ['#120d1d', '#321525', '#65262c', '#a3442d', '#ed7940'],
    far: '#38202d',
    farLight: '#69313a',
    mid: '#281b29',
    midLight: '#71302e',
    near: '#171522',
    accent: '#ff7738',
    floor: '#29212a',
    tile: '#44303a',
    tileLight: '#a54a36',
    wall: '#33252f',
    pillar: '#4b3034',
    barrier: '#ff7440',
    haze: '#d94a32',
  },
  [STAGE_IDS.FOREST]: {
    sky: ['#071a20', '#10343a', '#1d5150', '#39715b', '#94a36a'],
    far: '#143638',
    farLight: '#27564b',
    mid: '#102b2c',
    midLight: '#38634a',
    near: '#0a2022',
    accent: '#9de17b',
    floor: '#182d29',
    tile: '#294339',
    tileLight: '#66865a',
    wall: '#203d34',
    pillar: '#426348',
    barrier: '#8ee4a2',
    haze: '#68b58a',
  },
  [STAGE_IDS.SANCTUARY]: {
    sky: ['#10152e', '#1a2850', '#344875', '#716b8b', '#d3a96f'],
    far: '#263354',
    farLight: '#59668b',
    mid: '#202b48',
    midLight: '#8d7b60',
    near: '#17213b',
    accent: '#ffe09a',
    floor: '#42445a',
    tile: '#68677a',
    tileLight: '#c1a978',
    wall: '#48485e',
    pillar: '#a68a60',
    barrier: '#e9d18c',
    haze: '#b7a9a0',
  },
  [STAGE_IDS.DOWNTOWN]: {
    sky: ['#101a31', '#28334d', '#5b4854', '#a05d56', '#e6a26a'],
    far: '#252b3c',
    farLight: '#4b4653',
    mid: '#392c36',
    midLight: '#8f5145',
    near: '#1b202d',
    accent: '#ffca70',
    floor: '#34343a',
    tile: '#777174',
    tileLight: '#b4a8a0',
    wall: '#45333b',
    pillar: '#66515a',
    barrier: '#ef9b62',
    haze: '#aaa0a0',
  },
  [STAGE_IDS.MEADOW]: {
    sky: ['#6ab8ed', '#89d1f4', '#b7e8fb', '#e4f5d4', '#fff0b8'],
    far: '#4b9c63',
    farLight: '#87c66d',
    mid: '#32784c',
    midLight: '#80b85d',
    near: '#235b3e',
    accent: '#ffe78c',
    floor: '#7c5838',
    tile: '#4a9b4e',
    tileLight: '#b0da71',
    wall: '#76533a',
    pillar: '#a17b4b',
    barrier: '#e4c47a',
    haze: '#d8edc2',
  },
  [STAGE_IDS.VOLCANO_MOUTH]: {
    sky: ['#130d20', '#27152a', '#4e202d', '#8b342c', '#df6736'],
    far: '#211925',
    farLight: '#51252b',
    mid: '#2c1a24',
    midLight: '#9d3528',
    near: '#17131d',
    accent: '#ff6429',
    floor: '#1e1b22',
    tile: '#353039',
    tileLight: '#65505a',
    wall: '#30212a',
    pillar: '#5b2828',
    barrier: '#ff7440',
    haze: '#d65a37',
  },
  [STAGE_IDS.YOSHI_ISLAND]: {
    sky: ['#4fb3f0', '#74c9f5', '#a4def7', '#d3f1f2', '#f6efc0'],
    far: '#2f93bd',
    farLight: '#6fd0dc',
    mid: '#2f8a52',
    midLight: '#6cc26a',
    near: '#1f6a45',
    accent: '#ffe27a',
    floor: '#b98d55',
    tile: '#d8b673',
    tileLight: '#f3dc9c',
    wall: '#8a6a45',
    pillar: '#a47c4c',
    barrier: '#bfeaf0',
    haze: '#e8f8f2',
  },
});

const makeKeys = (id) => ({
  sky: `stage-${id}-sky`,
  far: `stage-${id}-far`,
  mid: `stage-${id}-mid`,
  near: `stage-${id}-near`,
  fog: `stage-${id}-fog`,
  floor: `stage-${id}-floor`,
  wall: `stage-${id}-wall`,
  pillar: `stage-${id}-pillar`,
  barrier: `stage-${id}-barrier`,
  flame: (frame) => `stage-${id}-flame-${frame}`,
  ambient: (frame) => `stage-${id}-ambient-${frame}`,
});

export const getStageTextures = (stageId = STAGE_IDS.RUINS) =>
  stageId === STAGE_IDS.RUINS ? STAGE_TEXTURES : makeKeys(stageId);

/** Genera los tres escenarios adicionales sin cargar imágenes externas. */
export function createAdditionalStageTextures(scene) {
  for (const [stageId, palette] of Object.entries(THEMES)) {
    const keys = makeKeys(stageId);
    const farWidth = layerWidth(PARALLAX.far);
    const midWidth = layerWidth(PARALLAX.mid);
    const nearWidth = layerWidth(PARALLAX.near);

    createCanvasTexture(scene, keys.sky, VIEW.width, VIEW.height, (ctx, w, h) => drawSky(ctx, w, h, palette, stageId));
    createCanvasTexture(scene, keys.far, farWidth, VIEW.height, (ctx, w, h) => drawFar(ctx, w, h, palette, stageId));
    createCanvasTexture(scene, keys.mid, midWidth, VIEW.height, (ctx, w, h) => drawMid(ctx, w, h, palette, stageId));
    createCanvasTexture(scene, keys.near, nearWidth, VIEW.height, (ctx, w, h) => drawNear(ctx, w, h, palette, stageId));
    createCanvasTexture(scene, keys.fog, 128, 40, (ctx, w, h) => drawHaze(ctx, w, h, palette));
    createCanvasTexture(scene, keys.floor, ARENA.width, VIEW.height - ARENA.groundY, (ctx, w, h) => drawFloor(ctx, w, h, palette, stageId));
    createCanvasTexture(scene, keys.wall, 28, 140, (ctx, w, h) => drawWall(ctx, w, h, palette, stageId));
    createCanvasTexture(scene, keys.pillar, 24, 104, (ctx, w, h) => drawPillar(ctx, w, h, palette, stageId));
    createCanvasTexture(scene, keys.barrier, 6, 150, (ctx, w, h) => drawBarrier(ctx, w, h, palette));

    for (let frame = 0; frame < 4; frame++) {
      createCanvasTexture(scene, keys.flame(frame), 14, 18, (ctx) => drawEmber(ctx, frame, palette));
    }
    for (let frame = 0; frame < AMBIENT_FRAMES; frame++) {
      createCanvasTexture(scene, keys.ambient(frame), 24, 24, (ctx) => drawStageAmbient(ctx, frame, palette, stageId));
    }
  }
}

function drawStageAmbient(ctx, frame, palette, stageId) {
  const pulse = frame % 2 === 0;
  if (stageId === STAGE_IDS.FOREST) {
    rect(ctx, palette.near, 7 + (pulse ? 1 : 0), 9, 10, 3);
    rect(ctx, palette.farLight, 10, 7 + (pulse ? 1 : 0), 5, 2);
    rect(ctx, '#d7ff9c', 15 + (pulse ? 1 : 0), 6, 3, 3);
    rect(ctx, palette.accent, 17, 5, 2, 2);
    return;
  }
  if (stageId === STAGE_IDS.SANCTUARY) {
    rect(ctx, palette.accent, 11, 3, 2, 5);
    rect(ctx, palette.accent, 7, 7, 10, 2);
    rect(ctx, palette.midLight, 5 + (pulse ? 0 : 1), 9, 14, 2);
    rect(ctx, palette.accent, 8, 11, 8, 2);
    rect(ctx, '#fff0c7', 11, 8, 3, 5);
    rect(ctx, palette.midLight, 10, 14, 4, 3);
    return;
  }
  if (stageId === STAGE_IDS.DOWNTOWN) {
    const offset = frame % 3;
    rect(ctx, palette.accent, 10, 2, 4, 3);
    rect(ctx, '#fff2b5', 11 + offset, 5, 2, 4);
    rect(ctx, palette.accent, 8 + offset, 9, 5, 3);
    rect(ctx, '#fff2b5', 12, 12, 2, 4);
    rect(ctx, palette.accent, 7, 15, 5, 2);
    return;
  }
  if (stageId === STAGE_IDS.YOSHI_ISLAND) {
    // Gaviota en vuelo: las alas suben y bajan con el cuadro.
    const lift = pulse ? 3 : 0;
    rect(ctx, '#f7fbff', 4, 9 - lift, 6, 2);
    rect(ctx, '#f7fbff', 14, 9 - lift, 6, 2);
    rect(ctx, '#dbe8f0', 10, 10, 4, 3);
    rect(ctx, palette.accent, 12, 13, 2, 1);
    return;
  }
  if (stageId === STAGE_IDS.MEADOW) {
    rect(ctx, palette.near, 8 + frame, 10 - (frame % 2), 9, 3);
    rect(ctx, palette.accent, 10 + frame, 7, 5, 3);
    rect(ctx, palette.midLight, 12 + frame, 12, 2, 4);
    rect(ctx, '#f8e3a4', 7, 8, 2, 2);
    return;
  }
  rect(ctx, palette.midLight, 8, 13 - frame, 8, 6);
  rect(ctx, palette.accent, 10, 9 - frame, 5, 7);
  rect(ctx, '#ffce70', 11, 6 - frame, 3, 5);
  if (pulse) rect(ctx, '#fff0bd', 12, 5 - frame, 2, 2);
}

function drawSky(ctx, width, height, palette, stageId) {
  const stops = palette.sky;
  const horizon = 208;
  for (let y = 0; y < height; y++) {
    const t = Math.min(0.999, y / horizon) * (stops.length - 1);
    const index = Math.floor(t);
    const shade = t - index > hash2(y, 4, 17) * 0.75 ? stops[index + 1] : stops[index];
    rect(ctx, shade, 0, y, width, 1);
  }

  if (stageId === STAGE_IDS.MEADOW) {
    drawHalo(ctx, 378, 56, 22, '#fff0a6');
    for (const [x, y] of [[54, 54], [132, 82], [286, 46], [438, 73]]) {
      drawPixelCloud(ctx, x, y, '#f7fbec');
    }
    return;
  }

  if (stageId === STAGE_IDS.YOSHI_ISLAND) {
    drawHalo(ctx, 394, 52, 20, '#fff2a8');
    for (const [x, y] of [[40, 48], [150, 76], [262, 40], [452, 82]]) {
      drawPixelCloud(ctx, x, y, '#fbfdf4');
    }
    return;
  }

  const random = mulberry32(stageId.length * 127);
  for (let i = 0; i < 84; i++) {
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * 145);
    if ([STAGE_IDS.VOLCANO, STAGE_IDS.VOLCANO_MOUTH].includes(stageId) && random() < 0.55) continue;
    const starColor = stageId === STAGE_IDS.SANCTUARY ? '#f5dba6' : '#d6e6c5';
    rect(ctx, starColor, x, y);
    if (i % 13 === 0) rect(ctx, palette.accent, x - 1, y, 3, 1);
  }

  if (stageId === STAGE_IDS.SANCTUARY) {
    drawHalo(ctx, 360, 66, 25, '#e7c78e');
  } else if (stageId === STAGE_IDS.FOREST) {
    drawHalo(ctx, 368, 70, 17, '#a5cda0');
  } else if (stageId === STAGE_IDS.DOWNTOWN) {
    drawHalo(ctx, 382, 60, 14, '#e7b88d');
  } else if (stageId === STAGE_IDS.VOLCANO_MOUTH) {
    // La boca ilumina la nube de ceniza desde abajo.
    for (let x = 180; x < 460; x += 8) {
      const glowY = 30 + Math.round(hash2(x, 12, 22) * 18);
      rect(ctx, palette.accent, x, glowY, 4, 1);
    }
    drawPixelCloud(ctx, 78, 52, '#6a3b44');
    drawPixelCloud(ctx, 340, 35, '#58313b');
  } else {
    drawHalo(ctx, 370, 66, 12, '#ffb05b');
  }
}

function drawPixelCloud(ctx, x, y, color) {
  rect(ctx, color, x + 5, y, 18, 4);
  rect(ctx, color, x, y + 4, 34, 7);
  rect(ctx, color, x + 8, y + 11, 20, 3);
  rect(ctx, '#ffffff', x + 7, y + 3, 8, 1);
}

function drawHalo(ctx, cx, cy, radius, color) {
  for (let y = -radius - 4; y <= radius + 4; y++) {
    for (let x = -radius - 4; x <= radius + 4; x++) {
      const distance = Math.hypot(x, y);
      if (distance <= radius && distance >= radius - 2) rect(ctx, color, cx + x, cy + y);
      else if (distance < radius - 2 && (x + y) % 7 === 0) rect(ctx, '#f8e9c6', cx + x, cy + y);
    }
  }
}

function drawFar(ctx, width, height, palette, stageId) {
  if (stageId === STAGE_IDS.YOSHI_ISLAND) {
    // Mar abierto hasta el horizonte, con crestas de espuma e islotes lejanos.
    rect(ctx, palette.far, 0, 178, width, height - 178);
    for (let y = 182; y < 208; y += 5) {
      for (let x = Math.round(hash2(y, 3, 9) * 20); x < width; x += 28) {
        rect(ctx, palette.farLight, x, y, 10, 1);
      }
    }
    for (let x = 36; x < width; x += 176) {
      const span = 38 + Math.round(hash2(x, 6, 14) * 16);
      rect(ctx, '#3a8f63', x, 170, span, 9);
      rect(ctx, '#58b06a', x + 6, 164, span - 14, 7);
      rect(ctx, '#2b6d4a', x + span / 2, 156, 2, 10);
      rect(ctx, '#58b06a', x + span / 2 - 5, 154, 12, 2);
    }
    return;
  }

  if (stageId === STAGE_IDS.MEADOW) {
    drawRollingHill(ctx, width, height, 192, 48, 0.026, palette.far);
    drawRollingHill(ctx, width, height, 205, 26, 0.041, palette.farLight);
    return;
  }

  if (stageId === STAGE_IDS.DOWNTOWN) {
    for (let x = -12; x < width; x += 52) {
      const buildingHeight = 58 + Math.round(hash2(x, 8, 34) * 54);
      const top = 202 - buildingHeight;
      const buildingWidth = 38 + Math.round(hash2(x, 2, 52) * 18);
      rect(ctx, palette.far, x, top, buildingWidth, height - top);
      rect(ctx, palette.farLight, x + 3, top + 4, 2, height - top - 4);
      for (let wy = top + 12; wy < 194; wy += 13) {
        for (let wx = x + 8; wx < x + buildingWidth - 6; wx += 12) {
          rect(ctx, hash2(wx, wy, 17) > 0.62 ? palette.accent : palette.mid, wx, wy, 4, 5);
        }
      }
      if (x % 3 === 0) rect(ctx, palette.mid, x + 8, top - 7, 3, 8);
    }
    return;
  }

  if (stageId === STAGE_IDS.VOLCANO_MOUTH) {
    const center = width * 0.52;
    for (let x = 0; x < width; x += 2) {
      const normalized = Math.abs(x - center) / (width * 0.43);
      if (normalized > 1) continue;
      const peak = 52 + Math.round(normalized * 66 + Math.sin(x / 17) * 6);
      rect(ctx, palette.far, x, peak, 2, height - peak);
      if (x % 12 === 0) rect(ctx, palette.farLight, x, peak + 7, 2, height - peak - 7);
    }
    rect(ctx, palette.accent, center - 28, 49, 56, 3);
    rect(ctx, '#ffb04b', center - 17, 45, 34, 3);
    rect(ctx, '#ffd47b', center - 8, 42, 16, 2);
    for (let x = 40; x < width; x += 92) {
      const streamY = 142 + Math.round(hash2(x, 9, 47) * 30);
      rect(ctx, palette.midLight, x, streamY, 5, 32);
      rect(ctx, palette.accent, x + 1, streamY + 27, 2, 19);
    }
    return;
  }

  if (stageId === STAGE_IDS.FOREST) {
    for (let x = -8; x < width; x += 34) {
      const treeHeight = 88 + Math.round(hash2(x, 1, 31) * 46);
      const trunkWidth = 8 + Math.round(hash2(x, 2, 32) * 8);
      rect(ctx, palette.far, x + 10, 206 - treeHeight, trunkWidth, treeHeight + 30);
      drawCanopy(ctx, x + 15, 206 - treeHeight + 18, 25 + Math.round(hash2(x, 3, 33) * 12), palette.farLight);
    }
    return;
  }

  if (stageId === STAGE_IDS.SANCTUARY) {
    for (let x = -18; x < width; x += 78) {
      const top = 106 + Math.round(hash2(x, 5, 41) * 48);
      rect(ctx, palette.far, x, top + 14, 48, 86);
      rect(ctx, palette.farLight, x + 3, top + 9, 42, 5);
      rect(ctx, palette.farLight, x + 8, top, 6, 18);
      rect(ctx, palette.farLight, x + 33, top, 6, 18);
      rect(ctx, palette.accent, x + 21, top + 29, 5, 17);
      rect(ctx, palette.far, x - 8, 198, 64, 10);
    }
    return;
  }

  // Cordillera volcánica: crestas dentadas y fumarolas lejanas.
  for (let x = 0; x < width; x += 4) {
    const wave = Math.sin(x / 35) * 12 + Math.sin(x / 13) * 5;
    const peak = 174 - Math.round(wave + hash2(x, 7, 52) * 12);
    rect(ctx, palette.far, x, peak, 4, height - peak);
    rect(ctx, palette.farLight, x, peak, 4, 2);
    if (x % 64 < 4) {
      rect(ctx, palette.haze, x + 1, peak - 8, 2, 7);
      rect(ctx, palette.haze, x - 2, peak - 12, 7, 2);
    }
  }
}

function drawMid(ctx, width, height, palette, stageId) {
  if (stageId === STAGE_IDS.YOSHI_ISLAND) {
    drawRollingHill(ctx, width, height, 186, 12, 0.047, palette.mid);
    drawRollingHill(ctx, width, height, 198, 8, 0.071, palette.midLight);
    // Palmeras inclinadas hacia el mar y un muelle de tablones sobre el agua.
    for (let x = 34; x < width; x += 118) {
      drawPalm(ctx, x, 192, 54 + Math.round(hash2(x, 5, 21) * 22), '#7a4d2b', palette.mid, palette.midLight);
    }
    rect(ctx, '#7a5a38', 300, 188, 96, 4);
    rect(ctx, '#b38a55', 300, 192, 96, 3);
    for (let x = 304; x < 396; x += 12) rect(ctx, '#4e392a', x, 192, 3, 14);
    return;
  }

  if (stageId === STAGE_IDS.DOWNTOWN) {
    const stores = [
      { x: 8, width: 96, color: '#70413f', sign: '#f0c875' },
      { x: 116, width: 112, color: '#474c5d', sign: '#e79a62' },
      { x: 242, width: 108, color: '#5b3944', sign: '#e6c17c' },
      { x: 364, width: 116, color: '#46515a', sign: '#d88a65' },
      { x: 492, width: 116, color: '#69453e', sign: '#f1c77b' },
    ];
    for (const store of stores) {
      const top = 78 + Math.round(hash2(store.x, 4, 52) * 16);
      rect(ctx, palette.mid, store.x, top, store.width, ARENA.groundY - top);
      rect(ctx, palette.midLight, store.x, top, store.width, 4);
      rect(ctx, store.color, store.x + 5, top + 17, store.width - 10, 34);
      rect(ctx, store.sign, store.x + 9, top + 7, store.width - 18, 8);
      rect(ctx, '#171a25', store.x + 14, top + 29, 20, 22);
      rect(ctx, '#171a25', store.x + 40, top + 29, store.width - 54, 22);
      rect(ctx, palette.accent, store.x + 15, top + 29, 3, 18);
      for (let awning = 0; awning < store.width - 12; awning += 12) {
        rect(ctx, awning % 24 === 0 ? store.sign : palette.midLight, store.x + 6 + awning, top + 54, 11, 5);
      }
      rect(ctx, palette.near, store.x + 2, top + 61, store.width - 4, 3);
    }
    // Escalera de incendios, cables y una marquesina desprendida.
    for (let y = 95; y < 190; y += 22) {
      rect(ctx, palette.near, 270, y, 66, 2);
      rect(ctx, palette.near, 278, y, 2, 18);
      rect(ctx, palette.near, 327, y, 2, 18);
    }
    for (let x = 10; x < width; x += 2) {
      const cableY = 45 + Math.round(Math.sin(x / 48) * 4);
      if (x % 8 === 0) rect(ctx, '#171b29', x, cableY, 2, 1);
    }
    rect(ctx, palette.accent, 438, 165, 36, 3);
    rect(ctx, palette.near, 446, 168, 3, 20);
    return;
  }

  if (stageId === STAGE_IDS.MEADOW) {
    drawRollingHill(ctx, width, height, 176, 34, 0.038, palette.mid);
    drawRollingHill(ctx, width, height, 191, 20, 0.062, palette.midLight);
    // Torre de vigilancia sobre una lomada y postes de cerca en perspectiva.
    rect(ctx, palette.near, 418, 102, 28, 79);
    rect(ctx, palette.pillar, 410, 98, 44, 7);
    rect(ctx, palette.accent, 424, 112, 16, 18);
    rect(ctx, palette.near, 414, 138, 4, 50);
    rect(ctx, palette.near, 446, 138, 4, 50);
    for (let x = 40; x < width; x += 46) {
      rect(ctx, palette.pillar, x, 174 + Math.round(hash2(x, 4, 23) * 10), 3, 34);
      rect(ctx, palette.pillar, x + 16, 181 + Math.round(hash2(x, 8, 12) * 7), 2, 30);
    }
    rect(ctx, palette.pillar, 0, 188, width, 3);
    rect(ctx, palette.pillar, 0, 202, width, 3);
    // Puente de tablones que cruza una depresión de tierra.
    rect(ctx, '#725236', 214, 158, 150, 6);
    rect(ctx, '#b58a50', 214, 164, 150, 4);
    for (let x = 220; x < 364; x += 12) rect(ctx, '#4e392a', x, 158, 2, 10);
    return;
  }

  if (stageId === STAGE_IDS.VOLCANO_MOUTH) {
    // Interior de la caldera: paredes negras en arco y dos coladas laterales.
    for (let x = 0; x < width; x += 4) {
      const arch = 116 + Math.round(Math.sin(x / 38) * 15 + hash2(x, 17, 49) * 18);
      rect(ctx, palette.mid, x, arch, 4, height - arch);
      if (x % 28 === 0) {
        rect(ctx, palette.midLight, x + 1, arch + 22, 2, 35);
        rect(ctx, palette.accent, x + 2, arch + 52, 1, 28);
      }
    }
    for (const x of [112, 492]) {
      rect(ctx, palette.midLight, x, 150, 22, 58);
      rect(ctx, palette.accent, x + 5, 158, 7, 50);
      rect(ctx, '#ffbd4d', x + 7, 176, 3, 31);
    }
    for (let x = 188; x < 448; x += 54) {
      rect(ctx, palette.near, x, 130 + Math.round(hash2(x, 1, 31) * 14), 13, 64);
      rect(ctx, palette.midLight, x - 3, 127, 19, 5);
    }
    return;
  }

  if (stageId === STAGE_IDS.FOREST) {
    const trunks = [34, 122, 224, 342, 456, 560];
    for (const x of trunks) {
      const trunkWidth = 18 + Math.round(hash2(x, 9, 44) * 12);
      rect(ctx, palette.mid, x, 78, trunkWidth, height - 78);
      rect(ctx, palette.midLight, x + 3, 88, 3, 106);
      rect(ctx, palette.near, x + trunkWidth - 4, 80, 4, 125);
      drawCanopy(ctx, x + trunkWidth / 2, 83, 38, palette.midLight);
      rect(ctx, palette.accent, x + 7, 143 + Math.round(hash2(x, 8, 42) * 26), 2, 2);
    }
    // Raíces que se extienden sobre el suelo.
    for (let x = 0; x < width; x += 34) {
      rect(ctx, palette.mid, x, ARENA.groundY - 22 + Math.round(hash2(x, 3, 45) * 8), 23, 4);
    }
    return;
  }

  if (stageId === STAGE_IDS.SANCTUARY) {
    for (let x = 12; x < width; x += 74) {
      const top = 88 + Math.round(hash2(x, 1, 61) * 28);
      rect(ctx, palette.mid, x, top, 10, 130);
      rect(ctx, palette.midLight, x - 5, top - 4, 20, 6);
      rect(ctx, palette.midLight, x + 2, top + 12, 2, 99);
      rect(ctx, palette.near, x + 8, top + 12, 2, 103);
      rect(ctx, palette.accent, x + 3, top + 36, 3, 11);
      rect(ctx, palette.mid, x - 12, ARENA.groundY - 14, 34, 8);
    }
    rect(ctx, palette.mid, 0, ARENA.groundY - 22, width, 10);
    for (let x = 18; x < width; x += 96) {
      rect(ctx, palette.midLight, x, 70, 3, 16);
      rect(ctx, palette.accent, x - 2, 82, 7, 2);
    }
    return;
  }

  // Cresta de basalto y un flujo de lava que cae al fondo.
  for (let x = 0; x < width; x += 6) {
    const peak = 154 + Math.round(Math.sin(x / 24) * 19 + hash2(x, 2, 71) * 18);
    rect(ctx, palette.mid, x, peak, 6, height - peak);
    if (x % 42 < 6) {
      rect(ctx, palette.midLight, x + 1, peak - 8, 3, 10);
      rect(ctx, palette.accent, x + 2, peak + 28, 2, 24);
    }
  }
  for (let x = 72; x < width; x += 156) {
    rect(ctx, palette.midLight, x, 116, 6, 20);
    rect(ctx, palette.accent, x - 2, 134, 10, 3);
  }
}

function drawPalm(ctx, x, baseY, trunkHeight, trunkColor, leafColor, leafLight) {
  for (let i = 0; i < trunkHeight; i += 3) {
    rect(ctx, trunkColor, x + Math.round(Math.sin(i / 14) * 3), baseY - i, 4, 3);
  }
  const topX = x + Math.round(Math.sin(trunkHeight / 14) * 3) + 2;
  const topY = baseY - trunkHeight;
  for (const [dx, dy, w] of [[-18, 2, 16], [-10, -4, 12], [3, -5, 14], [8, 2, 18], [-3, -9, 8]]) {
    rect(ctx, leafColor, topX + dx, topY + dy, w, 3);
    rect(ctx, leafLight, topX + dx + 2, topY + dy, Math.max(2, w - 6), 1);
  }
  rect(ctx, '#7a4d2b', topX - 2, topY + 3, 3, 3);
  rect(ctx, '#7a4d2b', topX + 2, topY + 4, 3, 3);
}

function drawRollingHill(ctx, width, height, base, amplitude, frequency, color) {
  for (let x = 0; x < width; x += 2) {
    const ridge = base - Math.round(Math.sin(x * frequency) * amplitude
      + Math.sin(x * frequency * 0.43 + 1.7) * amplitude * 0.36);
    rect(ctx, color, x, ridge, 2, height - ridge);
  }
}

function drawCanopy(ctx, cx, cy, radius, color) {
  const points = [
    [-18, -5, 0.66], [0, -16, 0.82], [18, -4, 0.68], [-8, 12, 0.76], [10, 12, 0.7],
  ];
  for (const [ox, oy, scale] of points) {
    const r = radius * scale;
    for (let y = -r; y <= r; y += 2) {
      const half = Math.sqrt(Math.max(0, r * r - y * y));
      rect(ctx, color, cx + ox - half, cy + oy + y, half * 2, 2);
    }
  }
}

function drawNear(ctx, width, height, palette, stageId) {
  if (stageId === STAGE_IDS.YOSHI_ISLAND) {
    const base = ARENA.groundY - 4;
    // Rocas de la orilla, caracolas y matas de hierba con flores.
    for (let x = 18; x < width; x += 54) {
      const rockHeight = 7 + Math.round(hash2(x, 3, 38) * 10);
      rect(ctx, palette.near, x, base - rockHeight, 16, rockHeight);
      rect(ctx, palette.midLight, x + 2, base - rockHeight, 9, 2);
      rect(ctx, '#f7ecd0', x + 20, base - 4, 5, 4);
      rect(ctx, '#e9a3a0', x + 22, base - 3, 2, 2);
    }
    for (let x = 6; x < width; x += 38) {
      const stem = 5 + Math.round(hash2(x, 2, 51) * 7);
      rect(ctx, palette.near, x + 9, base - stem, 1, stem);
      rect(ctx, hash2(x, 8, 6) > 0.5 ? '#fff2a0' : '#f4a6b8', x + 7, base - stem - 3, 5, 3);
    }
    return;
  }

  if (stageId === STAGE_IDS.DOWNTOWN) {
    const base = ARENA.groundY - 3;
    // Auto abandonado: carrocería abollada, ruedas y parabrisas roto.
    rect(ctx, '#242936', 68, base - 23, 84, 17);
    rect(ctx, '#48505c', 80, base - 34, 48, 13);
    rect(ctx, '#7d8a8b', 87, base - 31, 16, 9);
    rect(ctx, '#283441', 105, base - 31, 16, 9);
    rect(ctx, '#151822', 78, base - 9, 14, 10);
    rect(ctx, '#151822', 128, base - 9, 14, 10);
    rect(ctx, '#d4d0bb', 91, base - 29, 9, 2);
    rect(ctx, palette.accent, 150, base - 8, 4, 3);
    // Hidrante abierto y surtidor de agua en abanico.
    rect(ctx, '#bd443c', 224, base - 18, 9, 15);
    rect(ctx, '#e98062', 221, base - 22, 15, 5);
    for (let i = 0; i < 5; i++) rect(ctx, '#9bdcf0', 228 + i * 5, base - 35 - (i % 2) * 4, 2, 13);
    // Cesto volcado y señal de tránsito doblada.
    rect(ctx, '#343946', 392, base - 20, 16, 15);
    rect(ctx, '#7c8587', 388, base - 6, 24, 2);
    rect(ctx, '#b3a27e', 530, base - 39, 4, 38);
    rect(ctx, '#e7bd75', 516, base - 48, 29, 17);
    rect(ctx, '#24232a', 521, base - 43, 20, 2);
    rect(ctx, '#24232a', 521, base - 36, 15, 2);
    return;
  }

  if (stageId === STAGE_IDS.MEADOW) {
    const base = ARENA.groundY - 4;
    for (let x = 14; x < width; x += 48) {
      const rockHeight = 8 + Math.round(hash2(x, 3, 38) * 12);
      rect(ctx, palette.near, x, base - rockHeight, 18, rockHeight);
      rect(ctx, palette.midLight, x + 2, base - rockHeight, 10, 2);
      rect(ctx, palette.accent, x + 8, base - rockHeight - 3, 2, 3);
    }
    // Flores silvestres, hierba alta y postes de madera cercanos.
    for (let x = 8; x < width; x += 34) {
      const stem = 6 + Math.round(hash2(x, 2, 51) * 7);
      rect(ctx, palette.near, x + 9, base - stem, 1, stem);
      rect(ctx, hash2(x, 8, 6) > 0.5 ? '#f6d86e' : '#e5b4ca', x + 7, base - stem - 3, 5, 3);
    }
    rect(ctx, palette.pillar, 18, base - 27, 3, 24);
    rect(ctx, palette.pillar, 18, base - 27, 34, 3);
    rect(ctx, palette.accent, 22, base - 24, 26, 14);
    return;
  }

  if (stageId === STAGE_IDS.VOLCANO_MOUTH) {
    // Rocas de obsidiana y chorros de lava que se filtran por la cornisa.
    for (let x = 0; x < width; x += 42) {
      const peak = 14 + Math.round(hash2(x, 9, 23) * 22);
      rect(ctx, palette.near, x, ARENA.groundY - peak, 14, peak);
      rect(ctx, palette.midLight, x + 5, ARENA.groundY - peak - 5, 5, 5);
      rect(ctx, palette.accent, x + 18, ARENA.groundY - 8, 5, 3);
      rect(ctx, '#ffb24a', x + 19, ARENA.groundY - 5, 3, 3);
    }
    return;
  }

  if (stageId === STAGE_IDS.FOREST) {
    for (let x = -12; x < width; x += 56) {
      const bushY = ARENA.groundY - 18 - Math.round(hash2(x, 2, 84) * 15);
      for (let part = 0; part < 4; part++) {
        drawCanopy(ctx, x + part * 11, bushY + (part % 2) * 4, 18, part % 2 ? palette.near : palette.mid);
      }
      rect(ctx, palette.accent, x + 14, bushY - 4, 2, 2);
      rect(ctx, palette.accent, x + 38, bushY + 3, 2, 2);
    }
    return;
  }

  if (stageId === STAGE_IDS.SANCTUARY) {
    for (let x = 20; x < width; x += 106) {
      rect(ctx, palette.near, x, ARENA.groundY - 44, 32, 42);
      rect(ctx, palette.pillar, x - 4, ARENA.groundY - 48, 40, 5);
      rect(ctx, palette.accent, x + 15, ARENA.groundY - 40, 3, 24);
      rect(ctx, palette.midLight, x + 5, ARENA.groundY - 30, 22, 2);
    }
    return;
  }

  for (let x = 0; x < width; x += 48) {
    const spike = 18 + Math.round(hash2(x, 4, 92) * 24);
    rect(ctx, palette.near, x, ARENA.groundY - spike, 16, spike);
    rect(ctx, palette.mid, x + 8, ARENA.groundY - spike - 7, 8, 7);
    rect(ctx, palette.accent, x + 4, ARENA.groundY - 7 - spike, 2, 5);
  }
}

function drawHaze(ctx, width, height, palette) {
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const wave = Math.sin((x / width) * Math.PI * 4 + y * 0.19) * 0.5 + 0.5;
      if (wave > 0.83 && hash2(x, y, 104) > 0.35) rect(ctx, palette.haze, x, y, 2, 1);
    }
  }
}

function drawFloor(ctx, width, height, palette, stageId) {
  rect(ctx, palette.floor, 0, 0, width, height);
  const random = mulberry32(stageId.length * 19);

  if (stageId === STAGE_IDS.DOWNTOWN) {
    rect(ctx, '#a39a91', 0, 0, width, 4);
    rect(ctx, '#d2c7b3', 0, 0, width, 1);
    rect(ctx, '#4a4b50', 0, 4, width, FLOOR_SURFACE_HEIGHT - 4);
    for (let x = 12; x < width; x += 76) {
      rect(ctx, '#bcb2a1', x, 6 + Math.round(hash2(x, 3, 5) * 4), 22, 1);
      rect(ctx, '#292d38', x + 26, 5, 2, 7);
    }
    rect(ctx, '#e7d6ad', 18, 12, 34, 1);
    rect(ctx, '#242730', 72, 8, 14, 2);
    return;
  }

  if (stageId === STAGE_IDS.YOSHI_ISLAND) {
    // Arena clara con borde de pasto y tierra húmeda debajo de la superficie transitable.
    rect(ctx, '#f2dc9a', 0, 0, width, FLOOR_SURFACE_HEIGHT);
    rect(ctx, '#fff1bd', 0, 0, width, 2);
    rect(ctx, '#c79a5a', 0, 5, width, FLOOR_SURFACE_HEIGHT - 5);
    for (let x = 0; x < width; x += 14) {
      rect(ctx, '#e4c27a', x + 3, 2 + Math.round(hash2(x, 7, 5) * 4), 5, 1);
      if (x % 28 === 0) rect(ctx, '#79c25e', x, 0, 3, 2);
    }
    return;
  }

  if (stageId === STAGE_IDS.MEADOW) {
    rect(ctx, '#5c9b49', 0, 0, width, FLOOR_SURFACE_HEIGHT);
    rect(ctx, '#b8d66d', 0, 0, width, 3);
    rect(ctx, '#8c633e', 0, 4, width, FLOOR_SURFACE_HEIGHT - 4);
    for (let x = 0; x < width; x += 12) {
      rect(ctx, '#d2a15c', x + 2, 7 + Math.round(hash2(x, 7, 5) * 5), 6, 1);
      if (x % 24 === 0) rect(ctx, '#4e813e', x, 4, 2, 4);
    }
    return;
  }

  if (stageId === STAGE_IDS.VOLCANO_MOUTH) {
    rect(ctx, '#ff6a22', 0, 0, width, 3);
    rect(ctx, '#ffc45b', 0, 0, width, 1);
    rect(ctx, '#18171d', 0, 3, width, FLOOR_SURFACE_HEIGHT - 3);
    for (let x = 8; x < width; x += 30) {
      const crack = 4 + Math.round(hash2(x, 8, 44) * 7);
      rect(ctx, '#e84921', x, 4, 2, crack);
      rect(ctx, '#ffb13b', x + 1, crack + 4, 2, 3);
    }
    return;
  }
  const tileWidth = stageId === STAGE_IDS.SANCTUARY ? 28 : 20;
  const tileHeight = 8;

  // Los cuatro escenarios comparten una superficie superior continua de 14 px.
  // La mampostería decorativa empieza debajo de ella, no donde pisan los rangers.
  rect(ctx, palette.tile, 0, 3, width, FLOOR_SURFACE_HEIGHT - 3);
  rect(ctx, palette.tileLight, 0, 3, width, 1);

  for (let y = FLOOR_SURFACE_HEIGHT; y < height; y += tileHeight) {
    const offset = (y / tileHeight) % 2 ? tileWidth / 2 : 0;
    for (let x = -offset; x < width; x += tileWidth) {
      rect(ctx, palette.tile, x + 1, y + 1, tileWidth - 2, tileHeight - 2);
      rect(ctx, palette.tileLight, x + 1, y + 1, tileWidth - 2, 1);
      if (stageId === STAGE_IDS.VOLCANO && random() < 0.24) {
        rect(ctx, palette.accent, x + 5, y + 4, tileWidth - 10, 1);
      } else if (stageId === STAGE_IDS.FOREST && random() < 0.32) {
        rect(ctx, palette.accent, x + 4, y + 3, 2, 2);
      } else if (stageId === STAGE_IDS.SANCTUARY && y % 16 === 4) {
        rect(ctx, palette.accent, x + 3, y + 3, 3, 1);
      }
    }
  }
  rect(ctx, palette.accent, 0, 0, width, 2);
  rect(ctx, palette.floor, 0, 2, width, 1);
}

function drawWall(ctx, width, height, palette, stageId) {
  rect(ctx, palette.wall, 0, 0, width, height);
  for (let y = 0; y < height; y += 8) {
    const offset = y % 16 ? 7 : 0;
    for (let x = -offset; x < width; x += 14) {
      rect(ctx, palette.mid, x + 1, y + 1, 12, 6);
      rect(ctx, palette.midLight, x + 1, y + 1, 12, 1);
      if (stageId === STAGE_IDS.VOLCANO && (x + y) % 3 === 0) rect(ctx, palette.accent, x + 5, y + 5, 2, 2);
      if (stageId === STAGE_IDS.FOREST && (x + y) % 4 === 0) rect(ctx, palette.accent, x + 4, y + 3, 2, 2);
    }
  }
}

function drawPillar(ctx, width, height, palette, stageId) {
  rect(ctx, palette.midLight, 0, 0, width, 4);
  rect(ctx, palette.pillar, 2, 4, width - 4, height - 10);
  rect(ctx, palette.midLight, 3, 4, 3, height - 10);
  rect(ctx, palette.near, width - 6, 4, 3, height - 10);
  rect(ctx, palette.midLight, 0, height - 8, width, 4);
  rect(ctx, palette.near, 0, height - 4, width, 4);

  if (stageId === STAGE_IDS.FOREST) {
    for (let y = 12; y < height - 14; y += 22) {
      rect(ctx, palette.accent, 5, y, 3, 2);
      rect(ctx, palette.accent, 8, y + 2, 8, 2);
      rect(ctx, palette.mid, 12, y - 3, 3, 8);
    }
  } else {
    for (let y = 16; y < height - 16; y += 24) {
      rect(ctx, palette.accent, width / 2 - 1, y, 2, stageId === STAGE_IDS.SANCTUARY ? 10 : 5);
      rect(ctx, palette.midLight, width / 2 - 5, y + 4, 10, 2);
    }
  }
}

function drawBarrier(ctx, width, height, palette) {
  rect(ctx, palette.near, 0, 0, width, height);
  rect(ctx, palette.barrier, 2, 0, 2, height);
  for (let y = 0; y < height; y += 12) {
    rect(ctx, '#ffffff', 1, y, 4, 2);
    rect(ctx, palette.accent, 0, y + 4, 6, 2);
  }
}

function drawEmber(ctx, frame, palette) {
  const center = 7;
  for (let y = 0; y < 18; y++) {
    const width = Math.round((y / 17) * (3 + frame % 2));
    const drift = Math.round(Math.sin(frame + y / 3) * 2);
    rect(ctx, palette.accent, center + drift - width, y, width * 2 + 1, 1);
    if (y % 4 === 0) rect(ctx, '#fff0bd', center + drift, y, 1, 2);
  }
  rect(ctx, palette.midLight, 5, 16, 4, 2);
}
