import { describe, expect, it } from 'vitest';
import { getStage, STAGES, STAGE_IDS } from './stageCatalog.js';

describe('Catálogo de escenarios', () => {
  it('incluye las ocho zonas seleccionables', () => {
    expect(STAGES.map((stage) => stage.id)).toEqual([
      STAGE_IDS.RUINS,
      STAGE_IDS.VOLCANO,
      STAGE_IDS.FOREST,
      STAGE_IDS.SANCTUARY,
      STAGE_IDS.DOWNTOWN,
      STAGE_IDS.MEADOW,
      STAGE_IDS.VOLCANO_MOUTH,
      STAGE_IDS.YOSHI_ISLAND,
    ]);
  });

  it('suma la Isla de Yoshi como escenario de profundidad libre y sin peligros activos', () => {
    const island = getStage(STAGE_IDS.YOSHI_ISLAND);
    expect(island.name).toBe('Isla de Yoshi');
    expect(island.groundDepthMode).toBe('free');
    expect(island.hazards).toBeUndefined();
  });

  it('distingue escenarios lineales de espacios con profundidad libre', () => {
    expect(Object.fromEntries(STAGES.map((stage) => [stage.id, stage.groundDepthMode]))).toEqual({
      [STAGE_IDS.RUINS]: 'restricted',
      [STAGE_IDS.VOLCANO]: 'restricted',
      [STAGE_IDS.FOREST]: 'free',
      [STAGE_IDS.SANCTUARY]: 'free',
      [STAGE_IDS.DOWNTOWN]: 'free',
      [STAGE_IDS.MEADOW]: 'free',
      [STAGE_IDS.VOLCANO_MOUTH]: 'free',
      [STAGE_IDS.YOSHI_ISLAND]: 'free',
    });
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

  it('usa detalles concretos de cada escenario en lugar de parlamentos intercambiables', () => {
    const anchors = {
      [STAGE_IDS.RUINS]: ['carro', 'reja', 'cadena', 'contrapeso'],
      [STAGE_IDS.VOLCANO]: ['vapor', 'placa', 'válvula', 'veta'],
      [STAGE_IDS.FOREST]: ['tronco', 'corteza', 'arroyo', 'musgo'],
      [STAGE_IDS.SANCTUARY]: ['anillo', 'sello', 'columna', 'pulsos'],
      [STAGE_IDS.DOWNTOWN]: ['avenida', 'hidrante', 'persiana', 'patrullero'],
      [STAGE_IDS.MEADOW]: ['puente', 'torre', 'cerca', 'loma'],
      [STAGE_IDS.VOLCANO_MOUTH]: ['respiradero', 'lava', 'ceniza', 'cráter'],
      [STAGE_IDS.YOSHI_ISLAND]: ['isla', 'palmeras', 'marea', 'acantilado'],
    };

    for (const stage of STAGES) {
      const script = stage.dialogue.map((line) => line.text).join(' ').toLowerCase();
      const groundedDetails = anchors[stage.id].filter((detail) => script.includes(detail));
      expect(groundedDetails.length, stage.name).toBeGreaterThanOrEqual(2);
    }
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

  it('configura tres respiraderos activos y evitables en la boca del volcán', () => {
    const volcano = getStage(STAGE_IDS.VOLCANO_MOUTH);
    expect(volcano.hazards.type).toBe('lava-vents');
    expect(volcano.hazards.positions).toHaveLength(3);
    expect(volcano.hazards.warningMs).toBeGreaterThan(0);
    expect(volcano.hazards.activeMs).toBeGreaterThan(0);
    expect(volcano.hazards.damage).toBeGreaterThan(0);
    expect(volcano.hazards.safeAltitude).toBeGreaterThan(0);
  });

  it('usa las ruinas como escenario seguro ante un identificador desconocido', () => {
    expect(getStage('escenario-inexistente').id).toBe(STAGE_IDS.RUINS);
  });
});
