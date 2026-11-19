import { describe, expect, it } from 'vitest';
import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import { STAGE_TEXTURES } from './StageTextureFactory.js';
import { getStageTextures } from './StageThemeFactory.js';

describe('Texturas por escenario', () => {
  it('mantiene las texturas originales de Ruinas de medianoche', () => {
    expect(getStageTextures(STAGE_IDS.RUINS)).toBe(STAGE_TEXTURES);
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
