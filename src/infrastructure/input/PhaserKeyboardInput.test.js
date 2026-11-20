import { describe, expect, it } from 'vitest';
import { KEYMAPS } from './keyMaps.js';

describe('Controles de teclado', () => {
  it('asigna a J1 movimiento terrestre A/D/W/S, vuelo Q/E, ataque F y teletransporte G', () => {
    expect(KEYMAPS.PLAYER_1).toEqual({
      left: 'A',
      right: 'D',
      forward: 'W',
      backward: 'S',
      ascend: 'Q',
      descend: 'E',
      attack: 'F',
      teleport: 'G',
    });
  });

  it('asigna a J2 movimiento terrestre izquierda/derecha e I/O, vuelo arriba/abajo', () => {
    expect(KEYMAPS.PLAYER_2).toEqual({
      left: 'LEFT',
      right: 'RIGHT',
      forward: 'I',
      backward: 'O',
      ascend: 'UP',
      descend: 'DOWN',
      attack: 'L',
      teleport: 'K',
    });
  });
});
