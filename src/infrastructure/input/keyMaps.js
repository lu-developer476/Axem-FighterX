/**
 * Controles de los dos jugadores.
 * El eje horizontal desplaza sobre el escenario y el vertical regula el vuelo.
 */
export const KEYMAPS = Object.freeze({
  PLAYER_1: Object.freeze({
    left: 'A',
    right: 'D',
    ascend: 'Q',
    descend: 'E',
    attack: 'F',
    teleport: 'G',
  }),
  PLAYER_2: Object.freeze({
    left: 'LEFT',
    right: 'RIGHT',
    ascend: 'UP',
    descend: 'DOWN',
    attack: 'L',
    teleport: 'K',
  }),
});
