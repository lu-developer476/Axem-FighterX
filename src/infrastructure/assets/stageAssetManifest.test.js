import { describe, expect, it } from 'vitest';
import {
  collectImageFiles,
  DEFAULT_STAGE_ID,
  getStage,
  proceduralTextureKeyForTileset,
  slugifyAssetName,
  STAGES,
  STAGE_MAP_ASSETS,
  STAGE_TILESET_ASSETS,
} from './stageAssetManifest.js';

describe('Descubrimiento automático de escenarios', () => {
  it('detecta todos los mapas y tilesets existentes sin fijar un inventario manual', () => {
    expect(STAGE_MAP_ASSETS.length).toBeGreaterThanOrEqual(1);
    expect(STAGE_TILESET_ASSETS.length).toBeGreaterThanOrEqual(1);
    expect(STAGE_MAP_ASSETS.every(({ url, key }) => typeof url === 'string' && key.startsWith('stage-map-'))).toBe(true);
    expect(STAGE_TILESET_ASSETS.every(({ url, key }) => typeof url === 'string' && key.startsWith('stage-tileset-'))).toBe(true);
    expect(STAGE_MAP_ASSETS.map(({ filename }) => filename)).toContain('castle.png');
    expect(STAGE_MAP_ASSETS.map(({ filename }) => filename)).toContain('cave-1.png');
    expect(STAGE_TILESET_ASSETS.map(({ filename }) => filename)).toContain('cave1-tileset.png');
  });

  it('mantiene separados archivos con el mismo nombre en carpetas distintas y prioriza PNG por variante', () => {
    const assets = collectImageFiles({
      '../../../art/source/environments/maps/forest/arena.webp': '/forest/arena.webp',
      '../../../art/source/environments/maps/forest/arena.png': '/forest/arena.png',
      '../../../art/source/environments/maps/space/arena.png': '/space/arena.png',
    }, 'stage-map-');

    expect(assets).toHaveLength(2);
    expect(new Set(assets.map(({ stem }) => stem)).size).toBe(2);
    expect(assets.find(({ path }) => path.includes('/forest/arena.png'))?.url).toBe('/forest/arena.png');
    expect(assets.some(({ path }) => path.includes('/space/arena.png'))).toBe(true);
  });

  it('crea un escenario seleccionable para cada mapa y cada tileset descubierto', () => {
    const mapStages = STAGES.filter((stage) => stage.kind === 'map');
    const tilesetStages = STAGES.filter((stage) => stage.kind === 'tileset');

    expect(mapStages.map(({ id }) => id)).toEqual(STAGE_MAP_ASSETS.map(({ id }) => id));
    expect(tilesetStages.map(({ id }) => id)).toEqual(STAGE_TILESET_ASSETS.map(({ id }) => 'tileset-' + id));
    expect(STAGES).toHaveLength(STAGE_MAP_ASSETS.length + STAGE_TILESET_ASSETS.length);
    expect(new Set(STAGES.map(({ id }) => id)).size).toBe(STAGES.length);
  });

  it('asocia cada mapa con su imagen y cada tileset con su fondo procedural', () => {
    for (const asset of STAGE_MAP_ASSETS) {
      const stage = getStage(asset.id);
      expect(stage.kind).toBe('map');
      expect(stage.backgroundKey).toBe(asset.key);
      expect(stage.proceduralKey).toBe(null);
    }

    for (const asset of STAGE_TILESET_ASSETS) {
      const stage = getStage('tileset-' + asset.id);
      expect(stage.kind).toBe('tileset');
      expect(stage.backgroundKey).toBe(null);
      expect(stage.proceduralKey).toBe(proceduralTextureKeyForTileset(asset.key));
    }
  });

  it('usa el primer recurso descubierto como escenario inicial y como respaldo de IDs desconocidos', () => {
    expect(DEFAULT_STAGE_ID).toBe(STAGES[0].id);
    expect(getStage('escenario-inexistente')).toBe(STAGES[0]);
  });

  it('normaliza nombres de archivo para crear IDs estables', () => {
    expect(slugifyAssetName('Árboles y Rocas 02.PNG')).toBe('arboles-y-rocas-02-png');
  });

  it('cada escenario tiene introducción y resultados listos para la cinemática', () => {
    for (const stage of STAGES) {
      expect(stage.name.length).toBeGreaterThan(3);
      expect(stage.description.length).toBeGreaterThan(15);
      expect(stage.dialogue.length).toBeGreaterThanOrEqual(6);
      expect(stage.dialogue.some((line) => line.speaker === 'violet')).toBe(true);
      expect(stage.dialogue.some((line) => line.speaker === 'orange')).toBe(true);
      for (const outcome of ['violetWins', 'orangeWins', 'draw']) {
        expect(stage.resultDialogue[outcome]).toHaveLength(2);
      }
    }
  });
});
