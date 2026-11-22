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

  it('suaviza el alfa del borde con un mínimo alto y conserva los píxeles y colores del personaje', () => {
    const width = 15;
    const height = 15;
    const background = [1, 1, 1];
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < width * height; index += 1) {
      data.set([...background, 255], index * 4);
    }

    for (let y = 4; y <= 10; y += 1) {
      for (let x = 4; x <= 10; x += 1) setPixel(data, width, x, y, [218, 76, 32]);
    }

    // Este píxel oscuro es lineart de borde, no fondo: permanece visible con alfa alto.
    setPixel(data, width, 4, 7, [20, 20, 20]);
    // Un píxel idéntico al fondo, pero completamente encerrado, debe conservarse.
    setPixel(data, width, 7, 7, background);

    const before = data.slice();
    const result = removeCheckerboardBackground(data, width, height, [background], {
      edgeAlphaFloor: 216,
      fringeLimit: 44,
      coverageStart: 7,
      coverageRange: 32,
    });

    const edgeOffset = (7 * width + 4) * 4;
    const enclosedOffset = (7 * width + 7) * 4;
    expect(result.removedPixels).toBeGreaterThan(0);
    expect(result.softenedPixels).toBeGreaterThan(0);

    // El píxel del borde no se borra ni se aclara: solo recibe alfa parcial alto.
    expect(data[edgeOffset + 3]).toBeGreaterThanOrEqual(216);
    expect(data[edgeOffset + 3]).toBeLessThan(255);
    expect(data.slice(edgeOffset, edgeOffset + 3)).toEqual(before.slice(edgeOffset, edgeOffset + 3));

    // Los píxeles interiores, incluso si comparten el color del fondo, se conservan.
    expect(data[enclosedOffset + 3]).toBe(255);
    expect(data.slice(enclosedOffset, enclosedOffset + 3))
      .toEqual(before.slice(enclosedOffset, enclosedOffset + 3));

    // El resto del personaje mantiene sus valores RGB y alfa opaco.
    const bodyOffset = (5 * width + 5) * 4;
    expect(data.slice(bodyOffset, bodyOffset + 4)).toEqual(before.slice(bodyOffset, bodyOffset + 4));
    expect(data[(0 * width + 0) * 4 + 3]).toBe(0);
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
