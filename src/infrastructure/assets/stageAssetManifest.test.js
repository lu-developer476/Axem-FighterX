import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_MAP_ASSETS,
  collectImageFiles,
  DEFAULT_STAGE_ID,
  getStage,
  MINIGAME_MAP_ASSETS,
  proceduralTextureKeyForTileset,
  slugifyAssetName,
  STAGES,
  STAGE_MAP_ASSETS,
  STAGE_TILESET_ASSETS,
  TRAINING_MAP_ASSETS,
} from './stageAssetManifest.js';

describe('Descubrimiento automático de escenarios por modalidad', () => {
  it('clasifica cada mapa en su colección correspondiente', () => {
    expect(TRAINING_MAP_ASSETS.map(({ filename }) => filename)).toContain('practice-zone.png');
    expect(MINIGAME_MAP_ASSETS.terrestrial.map(({ filename }) => filename)).toContain('lost-town.png');
    expect(MINIGAME_MAP_ASSETS.racing.map(({ filename }) => filename)).toContain('castle.png');
    expect(Array.isArray(CAMPAIGN_MAP_ASSETS)).toBe(true);
  });

  it('solo ofrece los mapas de training como escenarios del modo combate', () => {
    expect(STAGE_MAP_ASSETS).toEqual(TRAINING_MAP_ASSETS);
    expect(STAGE_MAP_ASSETS.map(({ filename }) => filename)).toContain('practice-zone.png');
    expect(STAGE_MAP_ASSETS.map(({ filename }) => filename)).not.toContain('castle.png');
    expect(STAGE_MAP_ASSETS.map(({ filename }) => filename)).not.toContain('lost-town.png');
    expect(STAGE_TILESET_ASSETS.every(({ url, key }) =>
      typeof url === 'string' && key.startsWith('stage-tileset-'))).toBe(true);
  });

  it('mantiene separados archivos homónimos de la misma modalidad y prioriza PNG por variante', () => {
    const assets = collectImageFiles({
      '../../../art/source/environments/maps/training/forest/arena.webp': '/forest/arena.webp',
      '../../../art/source/environments/maps/training/forest/arena.png': '/forest/arena.png',
      '../../../art/source/environments/maps/training/space/arena.png': '/space/arena.png',
    }, 'stage-map-', '/maps/training/');

    expect(assets).toHaveLength(2);
    expect(new Set(assets.map(({ stem }) => stem)).size).toBe(2);
    expect(assets.find(({ path }) => path.includes('/forest/arena.png'))?.url).toBe('/forest/arena.png');
    expect(assets.some(({ path }) => path.includes('/space/arena.png'))).toBe(true);
  });

  it('crea automáticamente un escenario de combate por cada mapa y tileset de training', () => {
    const mapStages = STAGES.filter((stage) => stage.kind === 'map');
    const tilesetStages = STAGES.filter((stage) => stage.kind === 'tileset');

    expect(mapStages.map(({ id }) => id)).toEqual(STAGE_MAP_ASSETS.map(({ id }) => id));
    expect(tilesetStages.map(({ id }) => id)).toEqual(STAGE_TILESET_ASSETS.map(({ id }) => 'tileset-' + id));
    expect(STAGES).toHaveLength(STAGE_MAP_ASSETS.length + STAGE_TILESET_ASSETS.length);
    expect(new Set(STAGES.map(({ id }) => id)).size).toBe(STAGES.length);
  });

  it('mantiene una colección independiente para cada submodalidad de minijuego', () => {
    for (const [category, assets] of Object.entries(MINIGAME_MAP_ASSETS)) {
      expect(assets.every(({ url, key }) =>
        typeof url === 'string' && key.startsWith('minigame-' + category + '-map-'))).toBe(true);
      expect(new Set(assets.map(({ id }) => id)).size).toBe(assets.length);
    }
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

  it('usa el primer recurso de training como escenario inicial y respaldo de IDs desconocidos', () => {
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
      expect(stage.dialogue.some((line) => line.speaker === 'orange')).toBe(true);
      for (const outcome of ['orangeWins', 'draw']) {
        expect(stage.resultDialogue[outcome]).toHaveLength(2);
      }
    }
  });
});
