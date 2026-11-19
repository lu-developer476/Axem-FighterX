/**
 * Convierte una imagen cargada (a veces enorme, como los PNG de art/source de
 * 2617×4096) en una textura del tamaño del juego.
 *
 *  - Con `nativeSize`: copia UN píxel por cada celda de la cuadrícula de pixel art
 *    (el del centro del bloque). Es exacto y nítido; el reescalado "vecino más
 *    cercano" del navegador no garantiza caer en el centro de cada bloque.
 *  - Sin `nativeSize` y con cuadros mucho más altos que `targetHeight`: reduce con
 *    suavizado, en pasos, para no perder detalle.
 *  - Si el cuadro ya es de tamaño razonable, no hace nada.
 *
 * La textura original se elimina para liberar memoria de video.
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

  let width;
  let height;
  if (nativeSize) {
    ({ width, height } = nativeSize);
  } else if (frameHeight > targetHeight * 1.5) {
    height = targetHeight;
    width = Math.max(1, Math.round((frameWidth * height) / frameHeight));
  } else {
    return null;
  }

  const texture = scene.textures.createCanvas(targetKey, width * frames, height);
  const ctx = texture.getContext();

  for (let i = 0; i < frames; i++) {
    if (nativeSize) {
      sampleGrid(ctx, source, { frameX: i * frameWidth, frameWidth, frameHeight, width, height, destX: i * width });
    } else {
      const reduced = halveWhileLarge(cropFrame(source, i * frameWidth, frameWidth, frameHeight), width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(reduced, 0, 0, reduced.width, reduced.height, i * width, 0, width, height);
    }
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, 0, 0, half.width, half.height);
    current = half;
  }
  return current;
}
