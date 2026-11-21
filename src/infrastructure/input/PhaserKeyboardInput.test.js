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
      dash: 'C',
      block: 'V',
      dodge: 'X',
      specialAttack: 'Z',
    });
  });

  it('asigna a J2 terreno con las flechas, vuelo I/O, ataque L, teletransporte K y dash H', () => {
    expect(KEYMAPS.PLAYER_2).toEqual({
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
    });
  });

  it('no repite ninguna tecla dentro de los controles de J2', () => {
    const keys = Object.values(KEYMAPS.PLAYER_2);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
