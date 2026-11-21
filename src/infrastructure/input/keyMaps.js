/**
 * Controles independientes de J1 y J2.
 * UP/DOWN recorren el terreno; ASCEND/DESCEND controlan la altura de vuelo.
 */
export const KEYMAPS = Object.freeze({
  PLAYER_1: Object.freeze({
    left: 'A',
    right: 'D',
    up: 'W',
    down: 'S',
    ascend: 'Q',
    descend: 'E',
    attack: 'F',
    teleport: 'G',
    dash: 'C',
    block: 'V',
    dodge: 'X',
    specialAttack: 'Z',
  }),
  PLAYER_2: Object.freeze({
    left: 'LEFT',
    right: 'RIGHT',
    up: 'UP',
    down: 'DOWN',
    ascend: 'I',
    descend: 'O',
    attack: 'L',
    teleport: 'K',
    dash: 'H',
    block: 'N',
    dodge: 'J',
    specialAttack: 'M',
  }),
});
