import { removeSpriteBackground } from './removeSpriteBackground.js';

/**
 * Prepara una imagen cargada como textura de juego y elimina automáticamente
 * el fondo plano conectado a los bordes de cada cuadro.
 *
 * - Con `nativeSize`: toma un píxel central por celda de la cuadrícula pixel art.
 * - Sin `nativeSize`: reduce imágenes grandes en pasos o conserva su tamaño.
 * - Procesa cada frame por separado para que las hojas de animación también
 *   queden con transparencia real antes de registrarse en Phaser.
 *
 * @param {Phaser.Scene} scene
 * @param {object} options
 * @param {string} options.sourceKey textura cargada
 * @param {string} options.targetKey textura resultante
 * @param {number} [options.frames] cuadros de la tira horizontal (1 = imagen suelta)
 * @param {{ width: number, height: number }} [options.nativeSize] tamaño nativo de UN cuadro
 * @param {number} options.targetHeight alto de referencia del personaje
 * @returns {{ key: string, frameWidth: number, frameHeight: number } | null}
 */
export function prepareSpriteTexture(scene, { sourceKey, targetKey, frames = 1, nativeSize, targetHeight }) {
  const source = scene.textures.get(sourceKey).getSourceImage();
  const frameWidth = Math.floor(source.width / frames);
  const frameHeight = source.height;

  let width = frameWidth;
  let height = frameHeight;
  if (nativeSize) {
    ({ width, height } = nativeSize);
  } else if (frameHeight > targetHeight * 1.5) {
    height = targetHeight;
    width = Math.max(1, Math.round((frameWidth * height) / frameHeight));
  }

  const texture = scene.textures.createCanvas(targetKey, width * frames, height);
  const ctx = texture.getContext();
  // Toda operación de dibujo conserva el borde del pixel art sin interpolación.
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < frames; i++) {
    const frameX = i * frameWidth;
    const destX = i * width;

    if (nativeSize) {
      sampleGrid(ctx, source, {
        frameX,
        frameWidth,
        frameHeight,
        width,
        height,
        destX,
      });
    } else if (frameWidth === width && frameHeight === height) {
      ctx.drawImage(source, frameX, 0, frameWidth, frameHeight, destX, 0, width, height);
    } else {
      const reduced = halveWhileLarge(cropFrame(source, frameX, frameWidth, frameHeight), width, height);
      // Pixel art must never be interpolated while resizing user-provided sprites.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(reduced, 0, 0, reduced.width, reduced.height, destX, 0, width, height);
    }

    const frameData = ctx.getImageData(destX, 0, width, height);
    removeSpriteBackground(frameData);
    ctx.putImageData(frameData, destX, 0);
  }

  texture.refresh();
  scene.textures.remove(sourceKey);
  return { key: targetKey, frameWidth: width, frameHeight: height };
}

/** Copia el píxel central de cada celda de la cuadrícula (copias 1:1, sin escalar). */
function sampleGrid(ctx, source, { frameX, frameWidth, frameHeight, width, height, destX }) {
  for (let gy = 0; gy < height; gy++) {
    const sy = Math.min(frameHeight - 1, Math.floor(((gy + 0.5) * frameHeight) / height));
    for (let gx = 0; gx < width; gx++) {
      const sx = frameX + Math.min(frameWidth - 1, Math.floor(((gx + 0.5) * frameWidth) / width));
      ctx.drawImage(source, sx, sy, 1, 1, destX + gx, gy, 1, 1);
    }
  }
}

function cropFrame(source, x, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(source, x, 0, width, height, 0, 0, width, height);
  return canvas;
}

/** Reduce a la mitad mientras sobre más del doble: el filtro del navegador rinde mejor en pasos. */
function halveWhileLarge(canvas, targetWidth, targetHeight) {
  let current = canvas;
  while (current.height / 2 > targetHeight && current.width / 2 > targetWidth) {
    const half = document.createElement('canvas');
    half.width = Math.ceil(current.width / 2);
    half.height = Math.ceil(current.height / 2);
    const ctx = half.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(current, 0, 0, half.width, half.height);
    current = half;
  }
  return current;
}
