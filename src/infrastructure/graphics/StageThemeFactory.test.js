import { describe, expect, it } from 'vitest';
import { ARENA } from '../../domain/arena/arena.js';
import { STAGE_IDS, STAGES } from '../../domain/arena/stageCatalog.js';
import { FLOOR_SURFACE_HEIGHT, STAGE_TEXTURES, VIEW } from './StageTextureFactory.js';
import { getStageTextures } from './StageThemeFactory.js';

describe('Texturas por escenario', () => {
  it('reserva una superficie transitable antes de las filas de ladrillos', () => {
    expect(FLOOR_SURFACE_HEIGHT).toBe(14);
    expect(FLOOR_SURFACE_HEIGHT).toBeGreaterThan(4);
    expect(VIEW.height - ARENA.groundY).toBeGreaterThan(FLOOR_SURFACE_HEIGHT + 8);
  });

  it('mantiene las texturas originales de Ruinas de medianoche', () => {
    expect(getStageTextures(STAGE_IDS.RUINS)).toBe(STAGE_TEXTURES);
  });

  it('mantiene una textura de suelo para cada uno de los cuatro escenarios', () => {
    expect(STAGES).toHaveLength(4);
    const floors = STAGES.map((stage) => getStageTextures(stage.id).floor);
    expect(floors).toHaveLength(4);
    expect(floors.every((floor) => typeof floor === 'string')).toBe(true);
  });

  it('asigna claves independientes a los tres escenarios nuevos', () => {
    const ids = [STAGE_IDS.VOLCANO, STAGE_IDS.FOREST, STAGE_IDS.SANCTUARY];
    const backgrounds = ids.map((id) => getStageTextures(id));

    expect(new Set(backgrounds.map((textures) => textures.sky)).size).toBe(3);
    for (const textures of backgrounds) {
      expect(textures.sky).toContain('stage-');
      expect(textures.far).not.toBe(textures.sky);
      expect(textures.mid).not.toBe(textures.far);
      expect(typeof textures.flame).toBe('function');
      expect(textures.flame(0)).not.toBe(textures.flame(1));
    }
  });
});
