import { describe, expect, it } from 'vitest';
import { KEYMAPS } from './keyMaps.js';

describe('Controles de teclado', () => {
  it('asigna a J1 el movimiento terrestre A/D/W/S y el vuelo Q/E', () => {
    expect(KEYMAPS.PLAYER_1).toEqual({
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
    });
  });

  it('asigna a J2 el movimiento terrestre con flechas y el vuelo I/O', () => {
    expect(KEYMAPS.PLAYER_2).toEqual({
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
    });
  });

  it('mantiene las teclas de terreno y vuelo como acciones independientes', () => {
    expect(KEYMAPS.PLAYER_1.up).not.toBe(KEYMAPS.PLAYER_1.ascend);
    expect(KEYMAPS.PLAYER_1.down).not.toBe(KEYMAPS.PLAYER_1.descend);
    expect(KEYMAPS.PLAYER_2.up).not.toBe(KEYMAPS.PLAYER_2.ascend);
    expect(KEYMAPS.PLAYER_2.down).not.toBe(KEYMAPS.PLAYER_2.descend);
  });

  it('no repite teclas dentro de cada esquema', () => {
    for (const keymap of Object.values(KEYMAPS)) {
      const keys = Object.values(keymap);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
