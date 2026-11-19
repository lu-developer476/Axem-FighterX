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
  teleOut: { frames: 6, width: 48, height: 72, frameRate: 24 },
  teleIn: { frames: 6, width: 48, height: 72, frameRate: 24 },
  shockwave: { frames: 6, size: 64, frameRate: 20 },
  slash: { frames: 4, size: 56, frameRate: 34 },
  healRing: { frames: 5, size: 40, frameRate: 16 },
});

export const fxFrameKey = (name, i) => `fx-${name}-${i}`;
export const fxAnimKey = (name) => `fx-${name}`;

/** Texturas sueltas (partículas, corazón). */
export const FX_PARTICLES = Object.freeze({
  pixel: 'fx-px',
  plus: 'fx-plus',
  diamond: 'fx-diamond',
  heart: 'fx-heart',
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
  frames('teleOut', FX.teleOut.width, FX.teleOut.height, (ctx, t, i) => drawTeleport(ctx, t, i, true));
  frames('teleIn', FX.teleIn.width, FX.teleIn.height, (ctx, t, i) => drawTeleport(ctx, t, i, false));
  frames('shockwave', FX.shockwave.size, FX.shockwave.size, drawShockwave);
  frames('slash', FX.slash.size, FX.slash.size, drawSlash);
  frames('healRing', FX.healRing.size, FX.healRing.size, drawHealRing);

  createCanvasTexture(scene, FX_PARTICLES.pixel, 2, 2, (ctx) => rect(ctx, PAL.white, 0, 0, 2, 2));
  createCanvasTexture(scene, FX_PARTICLES.plus, 7, 7, drawPlus);
  createCanvasTexture(scene, FX_PARTICLES.diamond, 5, 5, drawDiamond);
  createCanvasTexture(scene, FX_PARTICLES.heart, 11, 10, drawHeart);
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
