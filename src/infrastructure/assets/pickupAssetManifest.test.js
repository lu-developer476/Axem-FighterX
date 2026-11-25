import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { PICKUP_ASSETS, pickupTextureKeyFor } from './pickupAssetManifest.js';
import { PICKUP_ASSET_STANDARD } from './pickupAssetStandard.js';

const PICKUP_DIRECTORY = fileURLToPath(new URL('../../../art/source/pickups/', import.meta.url));

async function pickupPngFiles() {
  return (await fs.readdir(PICKUP_DIRECTORY))
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort();
}

function isWithinTransparentMargin(x, y, width, height, padding) {
  return x < padding || y < padding ||
    x >= width - padding || y >= height - padding;
}

describe('Recursos PNG de consumibles', () => {
  it('descubre automáticamente todos los PNG del directorio', async () => {
    const files = await pickupPngFiles();
    const names = files.map((file) => path.basename(file, '.png'));
    expect(names).toEqual(expect.arrayContaining([
      'bike-key', 'bomb', 'heart', 'shield', 'sword', 'thunder',
    ]));
    expect(Object.keys(PICKUP_ASSETS).sort()).toEqual(names);
  });

  it('genera claves de textura estables', () => {
    for (const name of Object.keys(PICKUP_ASSETS)) {
      expect(pickupTextureKeyFor(name)).toBe('pickup-' + name);
    }
  });

  it('cumple el lienzo, la transparencia y los márgenes en todos los pickups', async () => {
    const { canvas, artwork } = PICKUP_ASSET_STANDARD;
    const files = await pickupPngFiles();

    for (const file of files) {
      const filename = path.join(PICKUP_DIRECTORY, file);
      const metadata = await sharp(filename).metadata();

      expect(metadata.format, file).toBe(canvas.format);
      expect(metadata.width, file).toBe(canvas.width);
      expect(metadata.height, file).toBe(canvas.height);
      expect(metadata.channels, file).toBe(canvas.channels);
      expect(metadata.hasAlpha, file).toBe(true);

      const { data, info } = await sharp(filename)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let transparentPixels = 0;
      let left = info.width;
      let top = info.height;
      let right = -1;
      let bottom = -1;

      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          const alpha = data[(y * info.width + x) * 4 + 3];
          if (alpha === 0) transparentPixels += 1;
          expect(
            isWithinTransparentMargin(x, y, info.width, info.height, artwork.minTransparentPadding)
              ? alpha === 0
              : true,
            file + ' debe reservar un margen exterior transparente',
          ).toBe(true);

          if (alpha < artwork.visibleAlphaThreshold) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x + 1);
          bottom = Math.max(bottom, y + 1);
        }
      }

      expect(transparentPixels, file).toBeGreaterThan(0);
      expect(right, file).toBeGreaterThan(left);
      expect(bottom, file).toBeGreaterThan(top);
      const visibleWidth = right - left;
      const visibleHeight = bottom - top;
      expect(visibleWidth, file).toBeLessThanOrEqual(artwork.maxWidth);
      expect(visibleHeight, file).toBeLessThanOrEqual(artwork.maxHeight);
      expect(left, file).toBeGreaterThanOrEqual(artwork.minTransparentPadding);
      expect(top, file).toBeGreaterThanOrEqual(artwork.minTransparentPadding);
      expect(info.width - right, file).toBeGreaterThanOrEqual(artwork.minTransparentPadding);
      expect(info.height - bottom, file).toBeGreaterThanOrEqual(artwork.minTransparentPadding);
      expect(Math.abs((left + right) / 2 - info.width / 2), file)
        .toBeLessThanOrEqual(artwork.centeringTolerance);
      expect(Math.abs((top + bottom) / 2 - info.height / 2), file)
        .toBeLessThanOrEqual(artwork.centeringTolerance);
    }
  });
});
