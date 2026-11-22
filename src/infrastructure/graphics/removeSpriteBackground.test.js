import { describe, expect, it } from 'vitest';
import { removeSpriteBackground } from './removeSpriteBackground.js';

function makeImage(width, height, color) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data.set([...color, 255], i * 4);
  }
  return { data, width, height };
}

function setPixel(image, x, y, color, alpha = 255) {
  const offset = (y * image.width + x) * 4;
  image.data.set([...color, alpha], offset);
}

describe('Eliminación automática del fondo de sprites', () => {
  it('hace transparente el fondo uniforme conectado a los bordes', () => {
    const image = makeImage(9, 9, [24, 220, 46]);
    for (let y = 2; y <= 6; y++) {
      for (let x = 2; x <= 6; x++) setPixel(image, x, y, [210, 48, 90]);
    }

    const result = removeSpriteBackground(image);

    expect(result.removedPixels).toBeGreaterThan(0);
    expect(image.data[(0 * 9 + 0) * 4 + 3]).toBe(0);
    expect(image.data[(4 * 9 + 4) * 4 + 3]).toBe(255);
  });

  it('conserva los detalles del personaje que no están conectados al borde', () => {
    const image = makeImage(9, 9, [245, 245, 245]);
    for (let y = 2; y <= 6; y++) {
      for (let x = 2; x <= 6; x++) setPixel(image, x, y, [35, 35, 35]);
    }

    removeSpriteBackground(image);

    expect(image.data[(4 * 9 + 4) * 4 + 3]).toBe(255);
    expect(image.data[(0 * 9 + 4) * 4 + 3]).toBe(0);
  });

  it('conserva píxeles interiores del color de fondo que no están conectados al borde', () => {
    const image = makeImage(11, 11, [245, 245, 245]);
    for (let y = 1; y <= 9; y++) {
      for (let x = 1; x <= 9; x++) setPixel(image, x, y, [90, 45, 180]);
    }
    // Simula un detalle claro encerrado dentro del cuerpo del personaje.
    setPixel(image, 5, 5, [245, 245, 245]);

    removeSpriteBackground(image);

    expect(image.data[(5 * 11 + 5) * 4 + 3]).toBe(255);
    expect(image.data[(4 * 11 + 4) * 4 + 3]).toBe(255);
    expect(image.data[(0 * 11 + 0) * 4 + 3]).toBe(0);
  });

  it('conserva la silueta cuando un tono cercano al fondo conecta con el borde', () => {
    const image = makeImage(11, 11, [0, 128, 128]);
    const characterColor = [40, 128, 128];
    for (let y = 3; y <= 7; y += 1) {
      for (let x = 3; x <= 7; x += 1) setPixel(image, x, y, characterColor);
    }
    // Simula un contorno roto: el color del personaje toca el fondo exterior.
    setPixel(image, 2, 5, characterColor);
    setPixel(image, 1, 5, characterColor);

    removeSpriteBackground(image);

    expect(image.data[(5 * 11 + 5) * 4 + 3]).toBe(255);
    expect(image.data[(0 * 11 + 0) * 4 + 3]).toBe(0);
  });

  it('no usa negro dominante como fondo porque puede ser lineart', () => {
    const image = makeImage(9, 9, [0, 0, 0]);
    for (let y = 2; y <= 6; y++) {
      for (let x = 2; x <= 6; x++) setPixel(image, x, y, [245, 245, 245]);
    }

    const before = image.data.slice();
    const result = removeSpriteBackground(image);

    expect(result.removedPixels).toBe(0);
    expect(image.data).toEqual(before);
  });

  it('no modifica una imagen que ya tiene transparencia en el contorno', () => {
    const image = makeImage(9, 9, [255, 255, 255]);
    for (let x = 0; x < image.width; x++) {
      setPixel(image, x, 0, [0, 0, 0], 0);
      setPixel(image, x, image.height - 1, [0, 0, 0], 0);
    }
    for (let y = 1; y < image.height - 1; y++) {
      setPixel(image, 0, y, [0, 0, 0], 0);
      setPixel(image, image.width - 1, y, [0, 0, 0], 0);
    }

    const before = image.data.slice();
    const result = removeSpriteBackground(image);

    expect(result.removedPixels).toBe(0);
    expect(image.data).toEqual(before);
  });
});
