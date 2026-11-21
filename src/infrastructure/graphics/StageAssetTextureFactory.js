import { ARENA } from '../../domain/arena/arena.js';
import { STAGE_TILESET_ASSETS, tileOverlayKeyForTileset } from '../assets/stageAssetManifest.js';
import { createCanvasTexture } from './canvasTexture.js';
import { VIEW } from './StageTextureFactory.js';

const DEFAULT_CELL_SIZE = 32;

/**
 * Creates restrained decorative layers from the reusable pieces in each tileset.
 * These textures are visual only: they do not add platforms or collision geometry.
 */
export function createStageAssetTextures(scene) {
  for (const asset of Object.values(STAGE_TILESET_ASSETS)) {
    createTilesetOverlay(scene, asset);
  }
}

function createTilesetOverlay(scene, asset) {
  const source = scene.textures.get(asset.key).getSourceImage();
  const cellSize = asset.cellSize ?? DEFAULT_CELL_SIZE;
  const scratch = document.createElement('canvas');
  scratch.width = source.width;
  scratch.height = source.height;
  const sampleContext = scratch.getContext('2d', { willReadFrequently: true });
  sampleContext.drawImage(source, 0, 0);

  const candidates = [];
  for (let y = 0; y + cellSize <= source.height; y += cellSize) {
    for (let x = 0; x + cellSize <= source.width; x += cellSize) {
      const pixels = sampleContext.getImageData(x, y, cellSize, cellSize).data;
      let visible = 0;
      let samples = 0;
      for (let py = 1; py < cellSize; py += 3) {
        for (let px = 1; px < cellSize; px += 3) {
          const offset = (py * cellSize + px) * 4;
          const alpha = pixels[offset + 3];
          const brightness = pixels[offset] + pixels[offset + 1] + pixels[offset + 2];
          if (alpha > 36 && brightness > 24) visible += 1;
          samples += 1;
        }
      }
      const coverage = samples ? visible / samples : 0;
      if (coverage >= 0.2 && coverage <= 0.96) candidates.push({ x, y });
    }
  }

  if (candidates.length === 0) candidates.push({ x: 0, y: 0 });

  const textureKey = tileOverlayKeyForTileset(asset.key);
  createCanvasTexture(scene, textureKey, ARENA.width, VIEW.height, (ctx, width, height) => {
    const random = createRandom(asset.seed ?? 1);
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    for (let index = 0; index < 38; index += 1) {
      const tile = candidates[Math.floor(random() * candidates.length)];
      const size = random() > 0.84 ? 48 : cellSize;
      const x = Math.floor(random() * Math.max(1, width - size));
      const y = Math.floor(22 + random() * 156);
      ctx.globalAlpha = 0.12 + random() * 0.1;
      ctx.drawImage(source, tile.x, tile.y, cellSize, cellSize, x, y, size, size);
    }

    for (let x = 0; x < width; x += cellSize) {
      const tile = candidates[Math.floor(random() * candidates.length)];
      ctx.globalAlpha = 0.16;
      ctx.drawImage(
        source,
        tile.x,
        tile.y,
        cellSize,
        cellSize,
        x,
        height - cellSize - 2,
        cellSize,
        cellSize,
      );
    }
    ctx.globalAlpha = 1;
  });
}

function createRandom(initialSeed) {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
