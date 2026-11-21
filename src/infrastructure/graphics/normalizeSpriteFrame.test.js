import { describe, expect, it } from 'vitest';
import { normalizeSpriteFrame } from './normalizeSpriteFrame.js';

function createImage(width, height, color) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data.set([...color, 255], offset);
  }
  return { data, width, height };
}

function setPixel(image, x, y, color, alpha = 255) {
  image.data.set([...color, alpha], (y * image.width + x) * 4);
}

describe('Regla global de procesamiento de sprites', () => {
  it('elimina el fondo conectado al borde y mantiene los píxeles interiores', () => {
    const image = createImage(11, 11, [0, 128, 128]);
    for (let y = 2; y <= 8; y += 1) {
      for (let x = 3; x <= 7; x += 1) setPixel(image, x, y, [190, 60, 110]);
    }
    setPixel(image, 5, 5, [0, 128, 128]); // Color igual al fondo, pero encerrado en el sprite.

    const result = normalizeSpriteFrame(image, {
      tolerance: 28,
      minBorderCoverage: 0.22,
    });

    expect(result.changed).toBe(true);
    expect(result.removedPixels).toBeGreaterThan(0);
    expect(image.data[3]).toBe(0);
    expect(image.data[(5 * 11 + 5) * 4 + 3]).toBe(255);
    expect(image.width).toBe(11);
    expect(image.height).toBe(11);
  });

  it('conserva una imagen que ya tiene transparencia real', () => {
    const image = createImage(9, 9, [0, 0, 0]);
    for (let x = 0; x < 9; x += 1) {
      setPixel(image, x, 0, [0, 0, 0], 0);
      setPixel(image, x, 8, [0, 0, 0], 0);
    }
    for (let y = 1; y < 8; y += 1) {
      setPixel(image, 0, y, [0, 0, 0], 0);
      setPixel(image, 8, y, [0, 0, 0], 0);
    }
    const before = image.data.slice();

    const result = normalizeSpriteFrame(image);

    expect(result.changed).toBe(false);
    expect(result.transparentPixelsAfter).toBeGreaterThan(0);
    expect(image.data).toEqual(before);
  });

  it('falla de forma segura cuando el fondo opaco no se puede identificar', () => {
    const image = createImage(12, 12, [0, 0, 0]);
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        setPixel(image, x, y, [x * 17, y * 17, (x + y) * 8]);
      }
    }

    expect(() => normalizeSpriteFrame(image, {
      tolerance: 12,
      minBorderCoverage: 0.3,
    })).toThrow(/no se pudo reconocer un fondo uniforme/);
  });
});
