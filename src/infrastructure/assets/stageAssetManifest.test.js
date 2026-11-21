import { describe, expect, it } from 'vitest';
import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import {
  getStageVisualVariants,
  proceduralTextureKeyForTileset,
  stageScopeForMapName,
  STAGE_MAP_ASSETS,
  STAGE_TILESET_ASSETS,
} from './stageAssetManifest.js';

describe('Descubrimiento automático de escenarios', () => {
  it('detecta mapas y tilesets sin fijar un número máximo', () => {
    expect(STAGE_MAP_ASSETS.length).toBeGreaterThanOrEqual(1);
    expect(STAGE_TILESET_ASSETS.length).toBeGreaterThanOrEqual(1);
    expect(STAGE_MAP_ASSETS.every(({ url, key }) => typeof url === 'string' && key.startsWith('stage-map-'))).toBe(true);
    expect(STAGE_TILESET_ASSETS.every(({ url, key }) => typeof url === 'string' && key.startsWith('stage-tileset-'))).toBe(true);
    expect(STAGE_MAP_ASSETS.map(({ filename }) => filename)).toContain('castle.png');
    expect(STAGE_TILESET_ASSETS.map(({ filename }) => filename)).toContain('cave1-tileset.png');
  });

  it('mantiene mapas genéricos y permite asociar mapas por prefijo', () => {
    expect(stageScopeForMapName('ruins--snowy-castle.png')).toEqual({
      stageId: STAGE_IDS.RUINS,
      variantName: 'snowy-castle',
    });
    expect(stageScopeForMapName('cave-1.png')).toBe(null);
  });

  it('ofrece el diseño original, cada mapa compatible y cada tileset generado', () => {
    const variants = getStageVisualVariants(STAGE_IDS.RUINS);
    const expectedMaps = STAGE_MAP_ASSETS.filter((asset) => !asset.stageId || asset.stageId === STAGE_IDS.RUINS);
    expect(variants[0].id).toBe('classic');
    expect(variants.filter((entry) => entry.kind === 'map')).toHaveLength(expectedMaps.length);
    expect(variants.filter((entry) => entry.kind === 'procedural')).toHaveLength(STAGE_TILESET_ASSETS.length);
    expect(variants.filter((entry) => entry.kind === 'procedural')
      .map((entry) => entry.proceduralKey))
      .toEqual(STAGE_TILESET_ASSETS.map((asset) => proceduralTextureKeyForTileset(asset.key)));
  });

  it('filtra mapas etiquetados para otro escenario sin ocultar mapas genéricos', () => {
    const otherStage = getStageVisualVariants(STAGE_IDS.VOLCANO);
    const scoped = STAGE_MAP_ASSETS.filter((asset) => asset.stageId === STAGE_IDS.RUINS);
    expect(otherStage.some((entry) => scoped.some((asset) => entry.sourceId === asset.id))).toBe(false);
  });
});
