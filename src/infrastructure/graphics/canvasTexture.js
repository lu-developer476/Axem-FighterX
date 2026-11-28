/**
 * Crea una textura de Phaser dibujada con la API 2D del canvas.
 * Si ya existe, no hace nada (las escenas pueden reiniciarse).
 *
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {number} width
 * @param {number} height
 * @param {(ctx: CanvasRenderingContext2D, width: number, height: number) => void} draw
 */
export function createCanvasTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx, width, height);
  texture.refresh();
}

/** Rellena un rectángulo de color sólido. */
export function rect(ctx, color, x, y, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Matriz de Bayer 4x4 para tramado ordenado (dithering). */
export const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER_4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
