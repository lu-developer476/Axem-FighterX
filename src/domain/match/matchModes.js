export const VERSUS_MODES = Object.freeze([
  Object.freeze({ id: 'player-vs-ai', label: 'JUGADOR VS IA', characterSlots: 1, slotLabels: Object.freeze(['JUGADOR']) }),
  Object.freeze({ id: 'player-vs-player', label: 'JUGADOR VS JUGADOR', characterSlots: 2, slotLabels: Object.freeze(['JUGADOR 1', 'JUGADOR 2']) }),
  Object.freeze({ id: 'ai-vs-ai', label: 'IA VS IA', characterSlots: 2, slotLabels: Object.freeze(['IA 1', 'IA 2']) }),
]);

/** rounds es la cantidad TOTAL de rondas que se disputan. */
export const COMBAT_MODES = Object.freeze([
  Object.freeze({ id: 'definitive', label: 'DEFINITIVO', rounds: 1 }),
  Object.freeze({ id: 'two-rounds', label: '2 RONDAS', rounds: 2 }),
  Object.freeze({ id: 'five-rounds', label: '5 RONDAS', rounds: 5 }),
  Object.freeze({ id: 'training', label: 'ENTRENAMIENTO', rounds: null }),
]);

export function getVersusMode(modeId) {
  return VERSUS_MODES.find((mode) => mode.id === modeId) ?? VERSUS_MODES[0];
}

export function getCombatMode(modeId) {
  return COMBAT_MODES.find((mode) => mode.id === modeId) ?? COMBAT_MODES[0];
}
