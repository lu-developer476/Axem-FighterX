import { describe, expect, it } from 'vitest';
import { getStage, STAGES, STAGE_IDS } from './stageCatalog.js';

describe('Catálogo de escenarios', () => {
  it('incluye las cuatro zonas seleccionables', () => {
    expect(STAGES.map((stage) => stage.id)).toEqual([
      STAGE_IDS.RUINS,
      STAGE_IDS.VOLCANO,
      STAGE_IDS.FOREST,
      STAGE_IDS.SANCTUARY,
    ]);
  });

  it('cada escenario tiene descripción y diálogo entre ambos personajes', () => {
    for (const stage of STAGES) {
      expect(stage.name.length).toBeGreaterThan(4);
      expect(stage.description.length).toBeGreaterThan(20);
      expect(stage.dialogue.length).toBeGreaterThanOrEqual(6);
      expect(stage.dialogue.some((line) => line.speaker === 'violet')).toBe(true);
      expect(stage.dialogue.some((line) => line.speaker === 'orange')).toBe(true);
      expect(stage.dialogue.every((line) => line.text.length > 12)).toBe(true);
    }
  });

  it('usa las ruinas como escenario seguro ante un identificador desconocido', () => {
    expect(getStage('escenario-inexistente').id).toBe(STAGE_IDS.RUINS);
  });
});
