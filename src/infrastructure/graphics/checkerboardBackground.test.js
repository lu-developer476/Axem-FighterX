import { describe, expect, it } from 'vitest';
import {
  detectCheckerboardColors,
  removeCheckerboardBackground,
} from './checkerboardBackground.js';

function createCheckerboard(width, height, tileSize = 2) {
  const data = new Uint8ClampedArray(width * height * 4);
  const light = [224, 224, 224];
  const mid = [184, 184, 184];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 ? light : mid;
      data.set([...color, 255], (y * width + x) * 4);
    }
  }
  return data;
}

function setPixel(data, width, x, y, color, alpha = 255) {
  data.set([...color, alpha], (y * width + x) * 4);
}

describe('Eliminación del fondo cuadriculado de los artworks', () => {
  it('conserva el lineart negro que toca el borde mientras elimina la cuadrícula', () => {
    const width = 24;
    const height = 24;
    const data = createCheckerboard(width, height);
    const black = [0, 0, 0];

    // Trazo oscuro conectado al borde: no puede confundirse con el fondo gris.
    for (let y = 5; y <= 13; y += 1) setPixel(data, width, 0, y, black);

    const { colors } = detectCheckerboardColors(data, width, height);
    const result = removeCheckerboardBackground(data, width, height, colors);

    expect(result.removedPixels).toBeGreaterThan(0);
    expect(data[(8 * width + 0) * 4 + 3]).toBe(255);
    expect(data[(1 * width + 1) * 4 + 3]).toBe(0);
  });

  it('reconoce el teal oscuro del fondo Orange sin confundirlo con lineart negro', () => {
    const width = 24;
    const height = 24;
    const teal = [76, 105, 113];
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i += 1) {
      data.set([...teal, 255], i * 4);
    }

    // Dibujo naranja con contornos negros, todos desconectados del borde.
    for (let y = 6; y <= 17; y += 1) {
      for (let x = 6; x <= 17; x += 1) setPixel(data, width, x, y, [238, 105, 24]);
    }
    for (let x = 7; x <= 16; x += 1) {
      setPixel(data, width, x, 6, [0, 0, 0]);
      setPixel(data, width, x, 17, [0, 0, 0]);
    }
    for (let y = 7; y <= 16; y += 1) {
      setPixel(data, width, 6, y, [0, 0, 0]);
      setPixel(data, width, 17, y, [0, 0, 0]);
    }

    const { colors } = detectCheckerboardColors(data, width, height);
    removeCheckerboardBackground(data, width, height, colors);

    expect(data[(0 * width + 0) * 4 + 3]).toBe(0);
    expect(data[(6 * width + 10) * 4 + 3]).toBe(255);
    expect(data[(10 * width + 6) * 4 + 3]).toBe(255);
  });

  it('rechaza un borde negro dominante en vez de borrarlo como si fuera el fondo', () => {
    const width = 24;
    const height = 24;
    const data = createCheckerboard(width, height);
    const black = [0, 0, 0];

    for (let x = 0; x < width; x += 1) {
      setPixel(data, width, x, 0, black);
      setPixel(data, width, x, height - 1, black);
    }
    for (let y = 1; y < height - 1; y += 1) {
      setPixel(data, width, 0, y, black);
      setPixel(data, width, width - 1, y, black);
    }

    expect(() => detectCheckerboardColors(data, width, height))
      .toThrow(/demasiado oscuro/);
  });

  it('conserva líneas oscuras separadas diagonalmente del fondo', () => {
    const width = 20;
    const height = 20;
    const data = createCheckerboard(width, height, 1);
    const black = [18, 18, 18];

    // El píxel oscuro toca la zona de fondo solo por las esquinas.
    setPixel(data, width, 5, 5, black);
    const { colors } = detectCheckerboardColors(data, width, height);
    removeCheckerboardBackground(data, width, height, colors);

    expect(data[(5 * width + 5) * 4 + 3]).toBe(255);
  });
});
