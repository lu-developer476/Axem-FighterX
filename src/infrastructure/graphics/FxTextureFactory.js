import { PAL } from './palette.js';
import { hash2 } from './rng.js';
import { createCanvasTexture, rect } from './canvasTexture.js';

/**
 * Definición de cada efecto: cantidad de frames, tamaño y velocidad.
 * La animación `fx-<nombre>` usa las texturas `fx-<nombre>-0 … fx-<nombre>-N`.
 */
export const FX = Object.freeze({
  explosion: { frames: 8, size: 48, frameRate: 22 },
  spark: { frames: 5, size: 32, frameRate: 30 },
  dust: { frames: 5, size: 24, frameRate: 14 },
  dashTrail: { frames: 6, width: 56, height: 32, frameRate: 26 },
  landing: { frames: 5, width: 48, height: 26, frameRate: 20 },
  electric: { frames: 6, size: 40, frameRate: 32 },
  burst: { frames: 7, size: 56, frameRate: 24 },
  smoke: { frames: 6, size: 40, frameRate: 12 },
  teleOut: { frames: 6, width: 48, height: 72, frameRate: 24 },
  teleIn: { frames: 6, width: 48, height: 72, frameRate: 24 },
  shockwave: { frames: 6, size: 64, frameRate: 20 },
  slash: { frames: 4, size: 56, frameRate: 34 },
  healRing: { frames: 5, size: 40, frameRate: 16 },
});

export const fxFrameKey = (name, i) => `fx-${name}-${i}`;
export const fxAnimKey = (name) => `fx-${name}`;

/** Texturas sueltas para partículas, objetos y potenciadores. */
export const FX_PARTICLES = Object.freeze({
  pixel: 'fx-px',
  plus: 'fx-plus',
  diamond: 'fx-diamond',
  heart: 'fx-heart',
  sword: 'fx-sword',
  shield: 'fx-shield',
  boot: 'fx-boot',
  ember: 'fx-ember',
  leaf: 'fx-leaf',
  rubble: 'fx-rubble',
  star: 'fx-star',
});

export function createFxTextures(scene) {
  const frames = (name, width, height, draw) => {
    const total = FX[name].frames;
    for (let i = 0; i < total; i++) {
      createCanvasTexture(scene, fxFrameKey(name, i), width, height, (ctx) => draw(ctx, i / (total - 1), i));
    }
  };

  frames('explosion', FX.explosion.size, FX.explosion.size, drawExplosion);
  frames('spark', FX.spark.size, FX.spark.size, drawSpark);
  frames('dust', FX.dust.size, FX.dust.size, drawDust);
  frames('dashTrail', FX.dashTrail.width, FX.dashTrail.height, drawDashTrail);
  frames('landing', FX.landing.width, FX.landing.height, drawLanding);
  frames('electric', FX.electric.size, FX.electric.size, drawElectric);
  frames('burst', FX.burst.size, FX.burst.size, drawBurst);
  frames('smoke', FX.smoke.size, FX.smoke.size, drawSmoke);
  frames('teleOut', FX.teleOut.width, FX.teleOut.height, (ctx, t, i) => drawTeleport(ctx, t, i, true));
  frames('teleIn', FX.teleIn.width, FX.teleIn.height, (ctx, t, i) => drawTeleport(ctx, t, i, false));
  frames('shockwave', FX.shockwave.size, FX.shockwave.size, drawShockwave);
  frames('slash', FX.slash.size, FX.slash.size, drawSlash);
  frames('healRing', FX.healRing.size, FX.healRing.size, drawHealRing);

  createCanvasTexture(scene, FX_PARTICLES.pixel, 2, 2, (ctx) => rect(ctx, PAL.white, 0, 0, 2, 2));
  createCanvasTexture(scene, FX_PARTICLES.plus, 7, 7, drawPlus);
  createCanvasTexture(scene, FX_PARTICLES.diamond, 5, 5, drawDiamond);
  createCanvasTexture(scene, FX_PARTICLES.heart, 11, 10, drawHeart);
  createCanvasTexture(scene, FX_PARTICLES.sword, 16, 16, drawSword);
  createCanvasTexture(scene, FX_PARTICLES.shield, 16, 16, drawShield);
  createCanvasTexture(scene, FX_PARTICLES.boot, 16, 16, drawBoot);
  createCanvasTexture(scene, FX_PARTICLES.ember, 5, 6, drawEmberParticle);
  createCanvasTexture(scene, FX_PARTICLES.leaf, 8, 6, drawLeafParticle);
  createCanvasTexture(scene, FX_PARTICLES.rubble, 6, 6, drawRubbleParticle);
  createCanvasTexture(scene, FX_PARTICLES.star, 7, 7, drawStarParticle);
}

// ── Explosión (daño y KO) ───────────────────────────────────────────────────

function drawExplosion(ctx, t, frame) {
  const grid = 24;
  const cell = 2;
  const center = grid / 2;
  const radius = 3 + 9 * Math.sin((t * Math.PI) / 2);
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const dist = Math.hypot(gx + 0.5 - center, gy + 0.5 - center);
      const edge = radius * (0.72 + hash2(gx, gy, 31) * 0.5);
      if (dist > edge) continue;
      const heat = 1 - dist / edge - t * 0.65;
      let color;
      if (heat > 0.72) color = PAL.flame0;
      else if (heat > 0.46) color = PAL.flame1;
      else if (heat > 0.22) color = PAL.flame2;
      else if (heat > 0.02) color = PAL.flame3;
      else color = (gx + gy) % 2 === 0 ? PAL.smoke : PAL.smokeLite;
      if (t > 0.7 && hash2(gx, gy, 40 + frame) < (t - 0.7) * 2.2) continue;
      rect(ctx, color, gx * cell, gy * cell, cell, cell);
    }
  }
}

// ── Chispa de impacto ───────────────────────────────────────────────────────

function drawSpark(ctx, t) {
  const size = 32;
  const cx = size / 2;
  const cy = size / 2;
  const grow = Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.5);
  const fade = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
  const rays = 8;
  for (let k = 0; k < rays; k++) {
    const angle = (k * Math.PI * 2) / rays + Math.PI / 8;
    const length = (4 + 10 * grow) * (k % 2 ? 0.6 : 1) * fade;
    for (let r = 2; r < length; r += 2) {
      const x = Math.round((cx + Math.cos(angle) * r) / 2) * 2;
      const y = Math.round((cy + Math.sin(angle) * r) / 2) * 2;
      rect(ctx, r < length * 0.55 ? PAL.white : PAL.flame1, x, y, 2, 2);
    }
  }
  if (t < 0.7) {
    rect(ctx, PAL.white, cx - 3, cy - 3, 6, 6);
    rect(ctx, PAL.flame1, cx - 5, cy - 1, 10, 2);
    rect(ctx, PAL.flame1, cx - 1, cy - 5, 2, 10);
  }
}

// ── Polvo de pasos ──────────────────────────────────────────────────────────

function drawDust(ctx, t, frame) {
  const grid = 12;
  const cell = 2;
  const puffs = [
    [-3, 0, 2.5],
    [3, 0, 2.5],
    [0, -1, 3],
  ];
  const rise = t * 3;
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      let inside = false;
      for (const [ox, oy, r] of puffs) {
        const grown = r * (0.6 + t * 0.9);
        if (Math.hypot(gx + 0.5 - grid / 2 - ox * (1 + t), gy + 0.5 - 5 - oy + rise) <= grown) inside = true;
      }
      if (!inside) continue;
      if (hash2(gx, gy, 60 + frame) < t * 0.9) continue;
      rect(ctx, gy > 4 ? PAL.dustDark : PAL.dust, gx * cell, gy * cell + 8, cell, cell);
    }
  }
}

function drawDashTrail(ctx, t, frame) {
  const fade = 1 - t * 0.88;
  const colors = ['#fff4c7', '#b9eaff', '#65a7ed'];
  for (let row = 0; row < 5; row++) {
    const y = 7 + row * 4 + Math.round(Math.sin(frame + row) * 2);
    const length = Math.max(2, Math.round((12 + row * 5) * fade));
    rect(ctx, colors[row % colors.length], 3, y, length, row % 2 ? 1 : 2);
  }
  rect(ctx, '#ffffff', 34 - Math.round(t * 12), 13, 5, 2);
  rect(ctx, '#8fd8ff', 38 - Math.round(t * 13), 18, 7, 1);
}
function drawLanding(ctx, t, frame) {
  const cx = 24, radius = 4 + t * 17, fade = 1 - t * 0.82;
  for (let x = 0; x < 48; x += 2) {
    const distance = Math.abs(x + 1 - cx);
    if (Math.abs(distance - radius) < 3 + (frame % 2)) {
      const height = Math.max(1, Math.round((1 - distance / (radius + 5)) * 7 * fade));
      rect(ctx, frame % 2 ? '#d2c4a5' : '#f0dfb8', x, 18 - height, 2, height);
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = 5 + i * 5, y = 14 - Math.round(Math.sin(i * 1.7 + frame) * 4 * fade);
    if (hash2(i, frame, 231) > t * 0.9) rect(ctx, '#b9a78b', x, y, 2, 2);
  }
}
function drawElectric(ctx, t, frame) {
  const points = [[19, 3], [14 + frame % 3, 11], [22, 15], [13, 25], [19, 35]];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[i + 1];
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let s = 0; s <= steps; s += 3) {
      const x = Math.round(x1 + ((x2 - x1) * s) / steps);
      const y = Math.round(y1 + ((y2 - y1) * s) / steps);
      rect(ctx, '#64cfff', x, y, 3, 3);
      rect(ctx, '#fff4c8', x + 1, y, 1, 2);
    }
  }
  rect(ctx, '#ffffff', 17, 16, 5, 3);
  if (t < 0.8) {
    rect(ctx, '#e9f8ff', 4 + frame % 4, 8, 3, 2);
    rect(ctx, '#e9f8ff', 30 - frame % 4, 27, 3, 2);
  }
}
function drawBurst(ctx, t, frame) {
  const center = 28, radius = 4 + t * 23;
  for (let ray = 0; ray < 12; ray++) {
    const angle = (ray / 12) * Math.PI * 2 + frame * 0.04;
    const length = radius * (ray % 2 ? 0.72 : 1);
    for (let step = 3; step < length; step += 3) {
      const x = Math.round((center + Math.cos(angle) * step) / 2) * 2;
      const y = Math.round((center + Math.sin(angle) * step) / 2) * 2;
      rect(ctx, step < length * 0.45 ? '#fff4c8' : (ray % 3 ? '#ffb04f' : '#6dcfff'), x, y, 2, 2);
    }
  }
  if (t < 0.75) rect(ctx, '#ffffff', center - 3, center - 3, 6, 6);
}
function drawSmoke(ctx, t, frame) {
  const fade = 1 - t, puffs = [[11, 25, 7], [20, 18, 9], [29, 24, 8], [18, 29, 6]];
  for (let i = 0; i < puffs.length; i++) {
    const [x, y, r] = puffs[i], radius = r * (0.62 + t * 0.55);
    for (let py = -radius; py <= radius; py += 2) {
      for (let px = -radius; px <= radius; px += 2) {
        if (px * px + py * py <= radius * radius && hash2(px + i, py, frame + 251) < fade + 0.12) {
          rect(ctx, frame % 2 ? '#89909c' : '#a3a5a8', x + px + t * 3, y + py - t * 5, 2, 2);
        }
      }
    }
  }
}

// ── Teletransporte ──────────────────────────────────────────────────────────

function drawTeleport(ctx, t, frame, collapsing) {
  const width = 48;
  const height = 72;
  const strength = collapsing ? Math.sin(t * Math.PI * 0.5) : 1 - Math.sin(t * Math.PI * 0.5);
  const beamHalf = Math.round(2 + 10 * (collapsing ? 1 - t * 0.85 : t * 0.85 + 0.15));
  for (let y = 0; y < height; y += 2) {
    const noise = hash2(y, frame, 71);
    const half = Math.max(1, Math.round(beamHalf * (0.65 + noise * 0.35) * (collapsing ? 1 : 0.4 + t)));
    const cx = width / 2;
    rect(ctx, PAL.teleViolet, cx - half, y, half * 2, 2);
    const mid = Math.max(1, Math.round(half * 0.62));
    rect(ctx, PAL.tele, cx - mid, y, mid * 2, 2);
    const core = Math.max(0, Math.round(half * 0.25));
    if (core) rect(ctx, PAL.white, cx - core, y, core * 2, 2);
  }
  for (let ring = 0; ring < 2; ring++) {
    const phase = (t * 1.3 + ring * 0.5) % 1;
    const y = collapsing ? height - 8 - phase * (height - 16) : 8 + phase * (height - 16);
    const rx = 14 * (1 - phase * 0.5) * strength + 4;
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2;
      rect(ctx, ring ? PAL.tele : PAL.white, Math.round((width / 2 + Math.cos(angle) * rx) / 2) * 2, Math.round((y + Math.sin(angle) * 3) / 2) * 2, 2, 2);
    }
  }
  for (let n = 0; n < 10; n++) {
    if (hash2(n, frame, 83) > 0.7 * (collapsing ? 1 - t : t) + 0.15) continue;
    const x = Math.round((8 + hash2(n, 5, 91) * (width - 16)) / 2) * 2;
    const y = Math.round(((1 - ((t + hash2(n, 7, 92)) % 1)) * (height - 6)) / 2) * 2;
    rect(ctx, PAL.white, x, y, 2, 2);
  }
}

// ── Onda expansiva (KO) ─────────────────────────────────────────────────────

function drawShockwave(ctx, t, frame) {
  const size = 64;
  const radius = 5 + t * 26;
  const thickness = Math.max(1, Math.round(4 - t * 3));
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const dist = Math.hypot(x + 1 - size / 2, (y + 1 - size / 2) * 1.35);
      if (Math.abs(dist - radius) > thickness) continue;
      if (hash2(x, y, 100 + frame) < t * 0.8) continue;
      rect(ctx, t < 0.5 ? PAL.white : PAL.flame1, x, y, 2, 2);
    }
  }
}

// ── Tajo del hacha ──────────────────────────────────────────────────────────

function drawSlash(ctx, t) {
  const size = 56;
  const cx = 10;
  const cy = size / 2;
  const radius = 34;
  const start = -1.15;
  const sweep = 2.3 * Math.min(1, 0.35 + t * 0.9);
  const fade = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
  for (let step = 0; step <= 60; step++) {
    const angle = start + (sweep * step) / 60;
    const taper = Math.sin((step / 60) * Math.PI);
    const thickness = Math.max(1, Math.round(5 * taper * fade));
    for (let k = 0; k < thickness; k += 1) {
      const r = radius - k * 1.6;
      const x = Math.round((cx + Math.cos(angle) * r) / 2) * 2;
      const y = Math.round((cy + Math.sin(angle) * r) / 2) * 2;
      rect(ctx, k === 0 ? PAL.white : k < 3 ? '#c8d4ff' : PAL.teleViolet, x, y, 2, 2);
    }
  }
}

// ── Curación ────────────────────────────────────────────────────────────────

function drawHealRing(ctx, t, frame) {
  const size = 40;
  const radius = 4 + t * 15;
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const dist = Math.hypot(x + 1 - size / 2, (y + 1 - size / 2) * 1.5);
      if (Math.abs(dist - radius) > 2) continue;
      if (hash2(x, y, 120 + frame) < t * 0.75) continue;
      rect(ctx, t < 0.5 ? PAL.white : PAL.heal, x, y, 2, 2);
    }
  }
}

function drawPlus(ctx) {
  rect(ctx, PAL.healDark, 2, 0, 3, 7);
  rect(ctx, PAL.healDark, 0, 2, 7, 3);
  rect(ctx, PAL.heal, 3, 1, 1, 5);
  rect(ctx, PAL.heal, 1, 3, 5, 1);
  rect(ctx, PAL.white, 3, 3, 1, 1);
}

function drawDiamond(ctx) {
  rect(ctx, PAL.heal, 2, 0, 1, 5);
  rect(ctx, PAL.heal, 0, 2, 5, 1);
  rect(ctx, PAL.white, 2, 2, 1, 1);
}

const HEART_MAP = [
  '..ooo.ooo..',
  '.orrrorrro.',
  'orhrrrrrrro',
  'orhrrrrrrro',
  'orrrrrrrrdo',
  '.orrrrrrdo.',
  '..orrrrdo..',
  '...orrdo...',
  '....odo....',
  '.....o.....',
];

function drawHeart(ctx) {
  const colors = { o: PAL.heartOutline, r: PAL.heart, h: PAL.heartLite, d: PAL.heartDark };
  HEART_MAP.forEach((line, y) => {
    [...line].forEach((char, x) => {
      if (colors[char]) rect(ctx, colors[char], x, y);
    });
  });
}

function drawSword(ctx) {
  rect(ctx, '#f8f0d7', 7, 1, 2, 9);
  rect(ctx, '#9aabd8', 6, 3, 1, 6);
  rect(ctx, '#9aabd8', 9, 3, 1, 6);
  rect(ctx, '#ffc35b', 4, 10, 8, 2);
  rect(ctx, '#9b633f', 7, 12, 2, 3);
}

function drawShield(ctx) {
  const widths = [6, 10, 12, 12, 10, 8, 4];
  widths.forEach((width, row) => {
    const x = Math.round((16 - width) / 2);
    rect(ctx, '#7180c7', x, row + 2, width, 2);
    if (width > 6) rect(ctx, '#c5d5ff', x + 2, row + 2, width - 4, 2);
  });
  rect(ctx, '#f7e7b0', 7, 4, 2, 7);
}

function drawBoot(ctx) {
  rect(ctx, '#7edfff', 5, 2, 6, 2);
  rect(ctx, '#7edfff', 6, 4, 5, 4);
  rect(ctx, '#b4efff', 4, 7, 7, 3);
  rect(ctx, '#b4efff', 3, 9, 10, 3);
  rect(ctx, '#477cae', 2, 12, 12, 2);
  rect(ctx, '#ffffff', 8, 3, 2, 2);
}

function drawEmberParticle(ctx) {
  rect(ctx, '#9d382b', 1, 3, 3, 3); rect(ctx, '#ff8b36', 2, 1, 2, 4); rect(ctx, '#ffe08a', 2, 0, 1, 2);
}
function drawLeafParticle(ctx) {
  rect(ctx, '#285d3b', 1, 2, 6, 3); rect(ctx, '#75b85a', 2, 1, 4, 3);
  rect(ctx, '#c6df82', 3, 2, 2, 1); rect(ctx, '#d5b66b', 0, 4, 4, 1);
}
function drawRubbleParticle(ctx) {
  rect(ctx, '#777681', 1, 1, 4, 4); rect(ctx, '#c0b7a9', 1, 1, 3, 1); rect(ctx, '#393d49', 4, 3, 2, 2);
}
function drawStarParticle(ctx) {
  rect(ctx, '#f5d58f', 3, 0, 1, 7); rect(ctx, '#f5d58f', 0, 3, 7, 1); rect(ctx, '#fff5d8', 2, 2, 3, 3);
}
