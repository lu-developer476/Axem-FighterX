import { describe, expect, it } from 'vitest';
import { STAGE_IDS, STAGES } from '../../domain/arena/stageCatalog.js';
import { biomeForStage } from './KenneyStageBackgrounds.js';

describe('Fondos pixel art de Kenney', () => {
  it('asigna un bioma con arte externo a cada escenario', () => {
    expect(STAGES.every(({ id }) => ['sky', 'desert', 'forest'].includes(biomeForStage(id)))).toBe(true);
  });

  it('mantiene las escenas volcánicas, boscosas y urbanas en sus biomas correspondientes', () => {
    expect(biomeForStage(STAGE_IDS.VOLCANO)).toBe('desert');
    expect(biomeForStage(STAGE_IDS.VOLCANO_MOUTH)).toBe('desert');
    expect(biomeForStage(STAGE_IDS.FOREST)).toBe('forest');
    expect(biomeForStage(STAGE_IDS.MEADOW)).toBe('forest');
    expect(biomeForStage(STAGE_IDS.DOWNTOWN)).toBe('sky');
  });
});
