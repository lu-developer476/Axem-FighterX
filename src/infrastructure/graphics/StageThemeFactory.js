import { ARENA } from '../../domain/arena/arena.js';
import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import { hash2, mulberry32 } from './rng.js';
import { createCanvasTexture, rect } from './canvasTexture.js';
import { layerWidth, PARALLAX, STAGE_TEXTURES, VIEW } from './StageTextureFactory.js';

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
  }
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

  const random = mulberry32(stageId.length * 127);
  for (let i = 0; i < 84; i++) {
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * 145);
    if (stageId === STAGE_IDS.VOLCANO && random() < 0.4) continue;
    rect(ctx, stageId === STAGE_IDS.SANCTUARY ? '#f5dba6' : '#d6e6c5', x, y);
    if (i % 13 === 0) rect(ctx, palette.accent, x - 1, y, 3, 1);
  }

  if (stageId === STAGE_IDS.SANCTUARY) {
    drawHalo(ctx, 360, 66, 25, '#e7c78e');
  } else if (stageId === STAGE_IDS.FOREST) {
    drawHalo(ctx, 368, 70, 17, '#a5cda0');
  } else {
    drawHalo(ctx, 370, 66, 12, '#ffb05b');
  }
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
      rect(ctx, palette.mid, x, 210 + Math.round(hash2(x, 3, 45) * 8), 23, 4);
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
      rect(ctx, palette.mid, x - 12, 218, 34, 8);
    }
    rect(ctx, palette.mid, 0, 210, width, 10);
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
  if (stageId === STAGE_IDS.FOREST) {
    for (let x = -12; x < width; x += 56) {
      const bushY = 214 - Math.round(hash2(x, 2, 84) * 15);
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
      rect(ctx, palette.near, x, 188, 32, 42);
      rect(ctx, palette.pillar, x - 4, 184, 40, 5);
      rect(ctx, palette.accent, x + 15, 192, 3, 24);
      rect(ctx, palette.midLight, x + 5, 202, 22, 2);
    }
    return;
  }

  for (let x = 0; x < width; x += 48) {
    const spike = 18 + Math.round(hash2(x, 4, 92) * 24);
    rect(ctx, palette.near, x, 232 - spike, 16, spike);
    rect(ctx, palette.mid, x + 8, 232 - spike - 7, 8, 7);
    rect(ctx, palette.accent, x + 4, 225 - spike, 2, 5);
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
  const tileWidth = stageId === STAGE_IDS.SANCTUARY ? 28 : 20;
  const tileHeight = 8;

  for (let y = 4; y < height; y += tileHeight) {
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
  rect(ctx, palette.floor, 0, 2, width, 2);
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
