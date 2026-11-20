import { ARENA } from '../../domain/arena/arena.js';
import { PAL } from './palette.js';
import { hash2, mulberry32 } from './rng.js';
import { bayer, createCanvasTexture, rect } from './canvasTexture.js';

export const VIEW = Object.freeze({ width: 480, height: 270 });

/** Factor de scroll de cada capa: más lejos = se mueve menos que la cámara. */
export const PARALLAX = Object.freeze({ far: 0.15, mid: 0.35, near: 0.65 });

/** Ancho que necesita una capa para cubrir todo el recorrido de la cámara. */
export const layerWidth = (factor) =>
  Math.ceil(VIEW.width + (ARENA.width - VIEW.width) * factor) + 8;

export const STAGE_TEXTURES = Object.freeze({
  sky: 'stage-sky',
  far: 'stage-far',
  mid: 'stage-mid',
  near: 'stage-near',
  fog: 'stage-fog',
  floor: 'stage-floor',
  wall: 'stage-wall',
  pillar: 'stage-pillar',
  barrier: 'stage-barrier',
  flame: (i) => `stage-flame-${i}`,
});

export const FLAME_FRAMES = 4;
export const PILLAR_HEIGHT = 104;
export const WALL_HEIGHT = 140;
export const WALL_WIDTH = 28;
/** Espesor de la superficie transitable superior, antes de la mampostería frontal. */
export const FLOOR_SURFACE_HEIGHT = 14;

/** Genera todas las texturas del escenario "Ruinas de medianoche". */
export function createStageTextures(scene) {
  createCanvasTexture(scene, STAGE_TEXTURES.sky, VIEW.width, VIEW.height, drawSky);
  createCanvasTexture(scene, STAGE_TEXTURES.far, layerWidth(PARALLAX.far), VIEW.height, drawFar);
  createCanvasTexture(scene, STAGE_TEXTURES.mid, layerWidth(PARALLAX.mid), VIEW.height, drawMid);
  createCanvasTexture(scene, STAGE_TEXTURES.near, layerWidth(PARALLAX.near), VIEW.height, drawNear);
  createCanvasTexture(scene, STAGE_TEXTURES.fog, 128, 40, drawFog);
  createCanvasTexture(scene, STAGE_TEXTURES.floor, ARENA.width, VIEW.height - ARENA.groundY, drawFloor);
  createCanvasTexture(scene, STAGE_TEXTURES.wall, WALL_WIDTH, WALL_HEIGHT, drawWall);
  createCanvasTexture(scene, STAGE_TEXTURES.pillar, 24, PILLAR_HEIGHT, drawPillar);
  createCanvasTexture(scene, STAGE_TEXTURES.barrier, 6, 150, drawBarrier);
  for (let i = 0; i < FLAME_FRAMES; i++) {
    createCanvasTexture(scene, STAGE_TEXTURES.flame(i), 14, 18, (ctx) => drawFlame(ctx, i));
  }
}

// ── Cielo ───────────────────────────────────────────────────────────────────

function drawSky(ctx, w, h) {
  const stops = [PAL.night0, PAL.night1, PAL.night2, PAL.night3, PAL.dusk, PAL.rose, PAL.glow];
  const horizon = 205;

  for (let y = 0; y < h; y++) {
    const t = Math.min(1, y / horizon) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(t));
    const frac = t - i;
    let runStart = 0;
    let runColor = null;
    for (let x = 0; x <= w; x++) {
      const color = x === w ? null : frac > bayer(x, y) ? stops[i + 1] : stops[i];
      if (color === runColor) continue;
      if (runColor) rect(ctx, runColor, runStart, y, x - runStart, 1);
      runStart = x;
      runColor = color;
    }
  }

  const rnd = mulberry32(7);
  for (let n = 0; n < 90; n++) {
    const x = Math.floor(rnd() * w);
    const y = Math.floor(rnd() * 140);
    rect(ctx, PAL.star, x, y);
    if (rnd() < 0.18) {
      rect(ctx, PAL.star, x - 1, y);
      rect(ctx, PAL.star, x + 1, y);
      rect(ctx, PAL.star, x, y - 1);
      rect(ctx, PAL.star, x, y + 1);
    }
  }

  drawMoon(ctx, 372, 62, 20);
}

function drawMoon(ctx, cx, cy, radius) {
  for (let dy = -radius - 4; dy <= radius + 4; dy++) {
    for (let dx = -radius - 4; dx <= radius + 4; dx++) {
      const dist = Math.hypot(dx, dy);
      if (dist <= radius) {
        const shaded = dx * 0.6 + dy * 0.4 > 7;
        rect(ctx, shaded ? PAL.moonShade : PAL.moon, cx + dx, cy + dy);
      } else if (dist <= radius + 4 && (dx + dy) % 2 === 0) {
        rect(ctx, PAL.night3, cx + dx, cy + dy);
      }
    }
  }
  for (const [ox, oy, r] of [[-7, -5, 4], [5, 6, 3], [-3, 9, 2]]) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.hypot(dx, dy) <= r) rect(ctx, PAL.moonCrater, cx + ox + dx, cy + oy + dy);
      }
    }
  }
}

// ── Montañas lejanas ────────────────────────────────────────────────────────

function drawFar(ctx, w, h) {
  const rnd = mulberry32(11);
  const phases = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const base = 198;
  for (let x = 0; x < w; x += 4) {
    const height =
      62 + 22 * Math.sin(x / 70 + phases[0]) + 12 * Math.sin(x / 31 + phases[1]) + 6 * Math.sin(x / 13 + phases[2]);
    const top = base - Math.round(height / 2) * 2;
    rect(ctx, PAL.mtnFar, x, top, 4, h - top);
    rect(ctx, PAL.mtnFarLite, x, top, 4, 2);
  }
}

// ── Ruinas de castillo ──────────────────────────────────────────────────────

function drawMid(ctx, w, h) {
  const rnd = mulberry32(23);
  const base = 218;
  let x = -10;
  while (x < w) {
    const bw = 22 + Math.floor(rnd() * 5) * 6;
    const bh = 46 + Math.floor(rnd() * 9) * 8;
    const top = base - bh;

    rect(ctx, PAL.cityMid, x, top, bw, h - top);
    rect(ctx, PAL.cityLite, x + bw - 2, top, 2, h - top);
    rect(ctx, PAL.cityDark, x, top, 2, h - top);

    const roof = rnd();
    if (roof < 0.4) {
      for (let cx = x; cx < x + bw - 2; cx += 6) rect(ctx, PAL.cityMid, cx, top - 4, 3, 4);
    } else if (roof < 0.7) {
      const peak = 12;
      for (let r = 0; r < peak; r += 2) {
        const inset = Math.floor((r / peak) * (bw / 2));
        rect(ctx, PAL.cityMid, x + inset, top - r - 2, bw - 2 * inset, 2);
      }
    }

    for (let wy = top + 8; wy < base - 10; wy += 12) {
      for (let wx = x + 5; wx < x + bw - 8; wx += 9) {
        const roll = rnd();
        if (roll < 0.3) rect(ctx, PAL.windowOn, wx, wy, 3, 5);
        else if (roll < 0.4) rect(ctx, PAL.windowDim, wx, wy, 3, 5);
        else rect(ctx, PAL.cityDark, wx, wy, 3, 5);
      }
    }
    x += bw + Math.floor(rnd() * 4) * 2;
  }
}

// ── Pinos del primer plano ──────────────────────────────────────────────────

function drawNear(ctx, w) {
  const rnd = mulberry32(41);
  const base = ARENA.groundY + 10;
  for (let x = -6; x < w; x += 18 + Math.floor(rnd() * 3) * 8) {
    const treeHeight = 70 + Math.floor(rnd() * 5) * 10;
    const treeWidth = 22 + Math.floor(rnd() * 3) * 4;
    const tiers = 4;
    const tierHeight = (treeHeight / tiers) * 1.35;
    for (let t = 0; t < tiers; t++) {
      const tierTop = base - treeHeight + t * (treeHeight / tiers) * 0.85;
      const tierWidth = treeWidth * (0.5 + t * 0.22);
      for (let y = 0; y < tierHeight; y += 2) {
        const progress = y / tierHeight;
        const half = Math.round((tierWidth * (0.25 + 0.75 * progress)) / 4) * 2;
        const left = Math.round(x + treeWidth / 2 - half);
        rect(ctx, PAL.treeDark, left, tierTop + y, half * 2, 2);
        rect(ctx, PAL.treeMid, left + half * 2 - 2, tierTop + y, 2, 2);
      }
    }
    rect(ctx, PAL.treeDark, x + treeWidth / 2 - 2, base - 10, 4, 14);
  }
}

// ── Niebla ──────────────────────────────────────────────────────────────────

function drawFog(ctx, w, h) {
  ctx.globalAlpha = 0.5;
  for (let y = 0; y < h; y++) {
    const band = Math.sin((y / h) * Math.PI);
    for (let x = 0; x < w; x++) {
      const wave = Math.sin((x / w) * Math.PI * 4 + y * 0.35) * 0.5 + 0.5;
      if (band * wave * 0.9 > bayer(x, y)) rect(ctx, PAL.dusk, x, y);
    }
  }
  ctx.globalAlpha = 1;
}

// ── Suelo ───────────────────────────────────────────────────────────────────

function drawFloor(ctx, w, h) {
  rect(ctx, PAL.ink, 0, 0, w, h);
  const rnd = mulberry32(5);
  const brickW = 20;
  const brickH = 8;
  const top = FLOOR_SURFACE_HEIGHT;
  // El pie del luchador se apoya en una plataforma continua; los ladrillos
  // comienzan más abajo y forman el frente del terreno, no su superficie.
  rect(ctx, PAL.stoneDark, 0, 4, w, FLOOR_SURFACE_HEIGHT - 4);
  rect(ctx, PAL.stoneLite, 0, 4, w, 1);
  for (let row = 0; top + row * brickH < h; row++) {
    const y = top + row * brickH;
    const offset = row % 2 ? brickW / 2 : 0;
    for (let x = -offset; x < w; x += brickW) {
      const base = rnd() < 0.5 ? PAL.stone : PAL.stoneDark;
      rect(ctx, base, x + 1, y + 1, brickW - 2, brickH - 2);
      rect(ctx, PAL.stoneLite, x + 1, y + 1, brickW - 2, 1);
      if (rnd() < 0.25) rect(ctx, PAL.stoneHi, x + 3 + Math.floor(rnd() * 8), y + 1, 3, 1);
    }
  }
  rect(ctx, PAL.grass, 0, 0, w, 4);
  for (let x = 0; x < w; x += 2) {
    const n = hash2(x, 0, 3);
    if (n < 0.45) rect(ctx, PAL.grassLite, x, 0, 2, n < 0.2 ? 2 : 1);
    if (n > 0.85) rect(ctx, PAL.ink, x, 3, 2, 1);
  }
}

// ── Muros, pilares y barreras (límites del escenario) ──────────────────────

function drawWall(ctx, w, h) {
  rect(ctx, PAL.ink, 0, 0, w, h);
  const rnd = mulberry32(17);
  const brickW = 14;
  const brickH = 8;
  for (let row = 0; row * brickH < h; row++) {
    const y = row * brickH;
    const offset = row % 2 ? brickW / 2 : 0;
    for (let x = -offset; x < w; x += brickW) {
      rect(ctx, rnd() < 0.5 ? PAL.stoneDark : PAL.cityMid, x + 1, y + 1, brickW - 2, brickH - 2);
      rect(ctx, PAL.stone, x + 1, y + 1, brickW - 2, 1);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y < 18 && y < bayer(x, y) * 36) rect(ctx, PAL.ink, x, y);
    }
  }
}

function drawPillar(ctx, w, h) {
  const capital = 10;
  rect(ctx, PAL.stoneLite, 0, 0, w, 3);
  rect(ctx, PAL.stone, 0, 3, w, capital - 3);
  rect(ctx, PAL.stoneDark, 0, capital - 2, w, 2);

  const shaftLeft = 4;
  const shaftW = w - 8;
  rect(ctx, PAL.stone, shaftLeft, capital, shaftW, h - capital - 8);
  rect(ctx, PAL.stoneLite, shaftLeft, capital, 2, h - capital - 8);
  rect(ctx, PAL.stoneDark, shaftLeft + shaftW - 3, capital, 3, h - capital - 8);
  for (let y = capital + 10; y < h - 22; y += 16) {
    rect(ctx, PAL.rune, w / 2 - 2, y, 4, 2);
    rect(ctx, PAL.rune, w / 2 - 1, y - 2, 2, 6);
  }

  rect(ctx, PAL.stoneLite, 1, h - 8, w - 2, 2);
  rect(ctx, PAL.stone, 0, h - 6, w, 6);
  rect(ctx, PAL.stoneDark, 0, h - 2, w, 2);
}

function drawBarrier(ctx, w, h) {
  ctx.globalAlpha = 0.28;
  rect(ctx, PAL.barrier, 0, 0, w, h);
  ctx.globalAlpha = 1;
  for (let y = 0; y < h; y += 6) {
    rect(ctx, PAL.barrier, 2, y, 2, 4);
    if (y % 18 === 0) rect(ctx, PAL.white, 2, y, 2, 2);
  }
}

function drawFlame(ctx, frame) {
  const w = 14;
  const h = 18;
  const layers = [
    [1, PAL.flame3],
    [0.72, PAL.flame2],
    [0.48, PAL.flame1],
    [0.24, PAL.flame0],
  ];
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const sway = Math.round(Math.sin(frame * 1.6 + t * 3.2) * 1.6 * (1 - t));
    const wobble = 1 - 0.2 * hash2(y, frame, 9);
    const half = 5.5 * Math.pow(t, 0.75) * wobble;
    for (const [scale, color] of layers) {
      if (scale < 0.5 && t < 0.4) continue;
      const hw = Math.round(half * scale);
      if (hw > 0) rect(ctx, color, w / 2 + sway - hw, y, hw * 2, 1);
    }
  }
}
