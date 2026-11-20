/**
 * Controles de los dos jugadores.
 * Los ejes de terreno mueven sobre el piso; ascend/descend controlan la altura aérea.
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
  }),
  PLAYER_2: Object.freeze({
    left: 'LEFT',
    right: 'RIGHT',
    forward: 'I',
    backward: 'O',
    ascend: 'UP',
    descend: 'DOWN',
    attack: 'L',
    teleport: 'K',
    dash: 'M',
  }),
});
