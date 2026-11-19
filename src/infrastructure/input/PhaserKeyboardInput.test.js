import { describe, expect, it } from 'vitest';
import { KEYMAPS } from './keyMaps.js';

describe('Controles de teclado', () => {
  it('asigna a J1 movimiento A/D, vuelo Q/E, ataque F y teletransporte G', () => {
    expect(KEYMAPS.PLAYER_1).toEqual({
      left: 'A',
      right: 'D',
      ascend: 'Q',
      descend: 'E',
      attack: 'F',
      teleport: 'G',
    });
  });

  it('asigna a J2 movimiento izquierda/derecha y vuelo arriba/abajo', () => {
    expect(KEYMAPS.PLAYER_2).toEqual({
      left: 'LEFT',
      right: 'RIGHT',
      ascend: 'UP',
      descend: 'DOWN',
      attack: 'L',
      teleport: 'K',
    });
  });
});
