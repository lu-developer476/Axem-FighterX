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

  it('cada escenario tiene una conversación propia con ambos personajes', () => {
    const allLines = [];

    for (const stage of STAGES) {
      expect(stage.name.length).toBeGreaterThan(4);
      expect(stage.description.length).toBeGreaterThan(20);
      expect(stage.dialogue.length).toBeGreaterThanOrEqual(6);
      expect(stage.dialogue.some((line) => line.speaker === 'violet')).toBe(true);
      expect(stage.dialogue.some((line) => line.speaker === 'orange')).toBe(true);
      expect(stage.dialogue.every((line) => line.text.length > 12)).toBe(true);
      allLines.push(...stage.dialogue.map((line) => line.text));
    }

    expect(new Set(allLines).size).toBe(allLines.length);
  });

  it('cada escenario tiene parlamentos distintos para victoria, derrota y empate', () => {
    const allAftermathLines = [];
    for (const stage of STAGES) {
      for (const outcome of ['violetWins', 'orangeWins', 'draw']) {
        const dialogue = stage.resultDialogue[outcome];
        expect(dialogue).toHaveLength(2);
        const expectedSpeakers = outcome === 'violetWins'
          ? ['violet', 'orange']
          : outcome === 'orangeWins'
            ? ['orange', 'violet']
            : ['violet', 'orange'];
        expect(dialogue.map((line) => line.speaker)).toEqual(expectedSpeakers);
        expect(dialogue.every((line) => line.text.length > 20)).toBe(true);
        allAftermathLines.push(...dialogue.map((line) => line.text));
      }
    }
    expect(new Set(allAftermathLines).size).toBe(allAftermathLines.length);
  });

  it('usa las ruinas como escenario seguro ante un identificador desconocido', () => {
    expect(getStage('escenario-inexistente').id).toBe(STAGE_IDS.RUINS);
  });
});
