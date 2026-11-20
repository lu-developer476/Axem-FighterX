import { describe, expect, it } from 'vitest';
import { RANGER_IDS, rangerCatalog } from '../../domain/rangers/rangerCatalog.js';
import { AXEM_ATLAS_SIZE, SHARED_ANIMATION_SEQUENCES } from '../assets/sharedAxemAtlas.js';
import { recolorAxemPixels } from './prepareSharedAxemTextures.js';

function hueOf(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;

  let hue;
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return hue * 60;
}

describe('atlas compartido de Axem Rangers X', () => {
  it('mantiene los recortes activos dentro de las dimensiones del atlas', () => {
    for (const sequence of Object.values(SHARED_ANIMATION_SEQUENCES)) {
      expect(sequence.x).toBeGreaterThanOrEqual(0);
      expect(sequence.y).toBeGreaterThanOrEqual(0);
      expect(sequence.x + (sequence.frameCount - 1) * sequence.stepX + sequence.frameWidth)
        .toBeLessThanOrEqual(AXEM_ATLAS_SIZE.width);
      expect(sequence.y + sequence.frameHeight).toBeLessThanOrEqual(AXEM_ATLAS_SIZE.height);
    }
  });

  it('define una sola fuente y un mismo orden de cuadros para cada estado', () => {
    expect(Object.keys(SHARED_ANIMATION_SEQUENCES)).toEqual(['idle', 'walk', 'attack']);
    expect(SHARED_ANIMATION_SEQUENCES.idle.frameCount).toBe(7);
    expect(SHARED_ANIMATION_SEQUENCES.walk.frameCount).toBe(10);
    expect(SHARED_ANIMATION_SEQUENCES.attack.frameCount).toBe(10);
  });

  it('genera Violet y Orange solo cambiando el tono rojo de los mismos píxeles', () => {
    const source = {
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        30, 110, 150, 255,
        120, 120, 120, 255,
        255, 0, 0, 0,
      ]),
    };
    const violet = { data: new Uint8ClampedArray(source.data) };
    const orange = { data: new Uint8ClampedArray(source.data) };

    expect(recolorAxemPixels(violet, 273)).toBe(1);
    expect(recolorAxemPixels(orange, 22)).toBe(1);
    expect(hueOf(violet.data[0], violet.data[1], violet.data[2])).toBeGreaterThan(260);
    expect(hueOf(orange.data[0], orange.data[1], orange.data[2])).toBeGreaterThan(12);
    expect(hueOf(orange.data[0], orange.data[1], orange.data[2])).toBeLessThan(32);
    expect(Array.from(violet.data.slice(4, 12))).toEqual(Array.from(source.data.slice(4, 12)));
    expect(Array.from(orange.data.slice(4, 12))).toEqual(Array.from(source.data.slice(4, 12)));
  });

  it('mantiene idénticos los parámetros de combate de ambos rangers', () => {
    expect(rangerCatalog[RANGER_IDS.VIOLET].stats)
      .toEqual(rangerCatalog[RANGER_IDS.ORANGE].stats);
  });
});
