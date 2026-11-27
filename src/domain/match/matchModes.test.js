import { describe, expect, it } from 'vitest';
import { COMBAT_MODES, VERSUS_MODES, getCombatMode, getVersusMode } from './matchModes.js';

describe('Opciones de configuración del combate', () => {
  it('ofrece los tres tipos de enfrentamiento solicitados', () => {
    expect(VERSUS_MODES.map((mode) => mode.label)).toEqual([
      'JUGADOR VS IA',
      'IA VS IA',
    ]);
  });

  it('ofrece los cuatro formatos con su cantidad literal de rondas', () => {
    expect(COMBAT_MODES.map(({ label, rounds }) => [label, rounds])).toEqual([
      ['DEFINITIVO', 1],
      ['2 RONDAS', 2],
      ['5 RONDAS', 5],
      ['ENTRENAMIENTO', null],
    ]);
  });

  it('solicita un personaje para jugador vs IA y dos para IA vs IA', () => {
    expect(VERSUS_MODES.map((mode) => mode.characterSlots)).toEqual([1, 2]);
  });

  it('usa opciones seguras si recibe identificadores desconocidos', () => {
    expect(getVersusMode('desconocido').id).toBe('player-vs-ai');
    expect(getCombatMode('desconocido').id).toBe('definitive');
  });
});
