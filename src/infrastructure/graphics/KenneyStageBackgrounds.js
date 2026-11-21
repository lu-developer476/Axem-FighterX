import { STAGE_IDS, STAGES } from '../../domain/arena/stageCatalog.js';
import { createCanvasTexture, rect } from './canvasTexture.js';
import { layerWidth, PARALLAX, STAGE_TEXTURES, VIEW } from './StageTextureFactory.js';
import { getStageTextures } from './StageThemeFactory.js';

export const KENNEY_STAGE_ATLAS_KEY = 'kenney-stage-background-atlas';

const BIOMES = Object.freeze({
  [STAGE_IDS.RUINS]: 'sky',
  [STAGE_IDS.VOLCANO]: 'desert',
  [STAGE_IDS.FOREST]: 'forest',
  [STAGE_IDS.SANCTUARY]: 'desert',
  [STAGE_IDS.DOWNTOWN]: 'sky',
  [STAGE_IDS.MEADOW]: 'forest',
  [STAGE_IDS.VOLCANO_MOUTH]: 'desert',
  [STAGE_IDS.YOSHI_ISLAND]: 'sky',
});

const SOURCE = Object.freeze({
  sky: { firstColumn: 0, columns: 4, color: '#c8eff0' },
  desert: { firstColumn: 4, columns: 2, color: '#f5c785' },
  forest: { firstColumn: 6, columns: 2, color: '#92e9ad' },
});

const LAYERS = Object.freeze([
  { name: 'sky', width: VIEW.width, height: VIEW.height, sourceRow: 0, y: 0, alpha: 0.82 },
  { name: 'far', width: layerWidth(PARALLAX.far), height: VIEW.height, sourceRow: 1, y: 128, alpha: 0.92 },
  { name: 'mid', width: layerWidth(PARALLAX.mid), height: VIEW.height, sourceRow: 2, y: 166, alpha: 0.94 },
  { name: 'near', width: layerWidth(PARALLAX.near), height: VIEW.height, sourceRow: 2, y: 192, alpha: 0.76 },
]);

export function biomeForStage(stageId) {
  return BIOMES[stageId] ?? 'sky';
}

/** Sustituye las cuatro capas ambientales generadas por mosaicos del atlas CC0 de Kenney. */
export function createKenneyStageBackgrounds(scene) {
  if (!scene.textures.exists(KENNEY_STAGE_ATLAS_KEY)) return;

  const atlas = scene.textures.get(KENNEY_STAGE_ATLAS_KEY).getSourceImage();
  for (const stage of STAGES) {
    const keys = stage.id === STAGE_IDS.RUINS ? STAGE_TEXTURES : getStageTextures(stage.id);
    const biome = SOURCE[biomeForStage(stage.id)];

    for (const layer of LAYERS) {
      const key = keys[layer.name];
      scene.textures.remove(key);
      createCanvasTexture(scene, key, layer.width, layer.height, (ctx, width, height) => {
        drawAtlasLayer(ctx, width, height, atlas, biome, layer);
      });
    }
  }
}

function drawAtlasLayer(ctx, width, height, atlas, biome, layer) {
  rect(ctx, biome.color, 0, 0, width, height);
  ctx.globalAlpha = layer.alpha;
  ctx.imageSmoothingEnabled = false;

  const tileSize = 24;
  const spacing = 25;
  const rowY = layer.sourceRow * spacing;
  let tileIndex = 0;
  for (let x = -tileSize; x < width; x += tileSize) {
    const column = biome.firstColumn + (tileIndex % biome.columns);
    const sourceX = column * spacing;
    const yOffset = layer.name === 'sky' ? 0 : (tileIndex % 3) * 4;
    ctx.drawImage(
      atlas,
      sourceX,
      rowY,
      tileSize,
      tileSize,
      x,
      layer.y + yOffset,
      tileSize,
      tileSize,
    );
    tileIndex += 1;
  }

  ctx.globalAlpha = 1;
}
