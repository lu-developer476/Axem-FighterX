import { describe, expect, it } from 'vitest';
import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import {
  getStageVisualVariants,
  STAGE_MAP_ASSETS,
  STAGE_TILESET_ASSETS,
  STAGE_VISUAL_VARIANTS,
} from './stageAssetManifest.js';

describe('Variantes de escenario', () => {
  it('registra los ocho mapas y los cinco tilesets disponibles', () => {
    expect(Object.keys(STAGE_MAP_ASSETS)).toHaveLength(8);
    expect(Object.keys(STAGE_TILESET_ASSETS)).toHaveLength(5);
    expect(Object.values(STAGE_MAP_ASSETS).every(({ url }) => typeof url === 'string')).toBe(true);
    expect(Object.values(STAGE_TILESET_ASSETS).every(({ url }) => typeof url === 'string')).toBe(true);
  });

  it('ofrece el diseño original y variantes seleccionables para las arenas compatibles', () => {
    for (const [stageId, variants] of Object.entries(STAGE_VISUAL_VARIANTS)) {
      const options = getStageVisualVariants(stageId);
      expect(options[0].id).toBe('classic');
      expect(options.length).toBe(variants.length + 1);
      expect(options.slice(1).every((entry) => entry.tilesetKey)).toBe(true);
    }
    expect(getStageVisualVariants(STAGE_IDS.RUINS)).toHaveLength(4);
    expect(getStageVisualVariants(STAGE_IDS.YOSHI_ISLAND)).toHaveLength(1);
  });

  it('utiliza cada mapa y cada tileset en al menos una variante seleccionable', () => {
    const variants = Object.values(STAGE_VISUAL_VARIANTS).flat();
    const mapKeys = new Set(variants.map((entry) => entry.backgroundKey).filter(Boolean));
    const tilesetKeys = new Set(variants.map((entry) => entry.tilesetKey).filter(Boolean));

    expect(mapKeys).toEqual(new Set(Object.values(STAGE_MAP_ASSETS).map((asset) => asset.key)));
    expect(tilesetKeys).toEqual(new Set(Object.values(STAGE_TILESET_ASSETS).map((asset) => asset.key)));
  });
});
