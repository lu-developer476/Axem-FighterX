import { removeSpriteBackground } from './removeSpriteBackground.js';

/**
 * Enforces the sprite-library alpha policy on one static image or animation
 * frame. Only background-colored pixels connected to the canvas border can be
 * removed; enclosed details are retained.
 */
export function normalizeSpriteFrame(imageData, options = {}) {
  const { data, width, height } = imageData ?? {};
  if (!data || !Number.isInteger(width) || !Number.isInteger(height) ||
      data.length !== width * height * 4) {
    throw new TypeError('Se esperaba una imagen RGBA válida para normalizar el sprite.');
  }

  const transparentBefore = countTransparentPixels(data);
  const result = removeSpriteBackground(imageData, options);
  const transparentAfter = countTransparentPixels(data);

  if (transparentAfter === 0) {
    throw new Error(
      'El sprite no tiene transparencia y no se pudo reconocer un fondo uniforme conectado al borde. ' +
      'Agregá una regla específica para ese fondo; no se eliminarán colores interiores por aproximación.',
    );
  }

  return {
    ...result,
    transparentPixelsBefore: transparentBefore,
    transparentPixelsAfter: transparentAfter,
    changed: result.removedPixels > 0,
  };
}

function countTransparentPixels(data) {
  let count = 0;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] === 0) count += 1;
  }
  return count;
}
