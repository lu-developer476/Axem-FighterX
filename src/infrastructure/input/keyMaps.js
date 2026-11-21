/**
 * Controles de los dos jugadores.
 * X/Y recorren el terreno; Z es exclusivamente la altura de vuelo.
 */
export const KEYMAPS = Object.freeze({
  PLAYER_1: Object.freeze({
    left: 'A',
    right: 'D',
    forward: 'W',
    backward: 'S',
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
    forward: 'UP',
    backward: 'DOWN',
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
