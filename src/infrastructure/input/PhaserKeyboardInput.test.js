import { describe, expect, it, vi } from 'vitest';

// Phaser consulta window al importarse; en estas pruebas se aísla JustDown.
vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        JustDown: (key) => {
          const justDown = Boolean(key._justDown);
          key._justDown = false;
          return justDown;
        },
      },
    },
  },
}));
import { KEYMAPS } from './keyMaps.js';
import { PhaserKeyboardInput } from './PhaserKeyboardInput.js';

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

  it('W y la flecha arriba mueven hacia arriba en el terreno; S y abajo, hacia abajo', () => {
    const createScene = () => ({
      input: {
        keyboard: {
          addKeys: (definitions) => Object.fromEntries(
            Object.keys(definitions).map((name) => [name, { isDown: false, _justDown: false }]),
          ),
        },
      },
    });

    const j1 = new PhaserKeyboardInput(createScene(), KEYMAPS.PLAYER_1);
    j1.keys.up.isDown = true;
    expect(j1.readIntent().y).toBe(-1);
    j1.keys.up.isDown = false;
    j1.keys.down.isDown = true;
    expect(j1.readIntent().y).toBe(1);

    const j2 = new PhaserKeyboardInput(createScene(), KEYMAPS.PLAYER_2);
    j2.keys.up.isDown = true;
    expect(j2.readIntent().y).toBe(-1);
    j2.keys.up.isDown = false;
    j2.keys.down.isDown = true;
    expect(j2.readIntent().y).toBe(1);
  });

  it('Q/I suben en vuelo y E/O bajan sin alterar el eje terrestre', () => {
    const createScene = () => ({
      input: {
        keyboard: {
          addKeys: (definitions) => Object.fromEntries(
            Object.keys(definitions).map((name) => [name, { isDown: false, _justDown: false }]),
          ),
        },
      },
    });

    for (const keymap of Object.values(KEYMAPS)) {
      const input = new PhaserKeyboardInput(createScene(), keymap);
      input.keys.ascend.isDown = true;
      expect(input.readIntent()).toMatchObject({ y: 0, z: 1 });
      input.keys.ascend.isDown = false;
      input.keys.descend.isDown = true;
      expect(input.readIntent()).toMatchObject({ y: 0, z: -1 });
    }
  });

  it('conecta hachazo, teletransporte, dash, bloqueo, esquiva y especial en cada esquema', () => {
    const createScene = () => ({
      input: {
        keyboard: {
          addKeys: (definitions) => Object.fromEntries(
            Object.keys(definitions).map((name) => [name, { isDown: false, _justDown: false }]),
          ),
        },
      },
    });

    for (const keymap of Object.values(KEYMAPS)) {
      const input = new PhaserKeyboardInput(createScene(), keymap);
      input.keys.attack._justDown = true;
      input.keys.teleport._justDown = true;
      input.keys.dash._justDown = true;
      input.keys.block.isDown = true;
      input.keys.dodge._justDown = true;
      input.keys.specialAttack._justDown = true;

      expect(input.readIntent()).toMatchObject({
        attack: true,
        teleport: true,
        dash: true,
        block: true,
        dodge: true,
        specialAttack: true,
      });
    }
  });

  it('no repite teclas dentro de cada esquema', () =>
    for (const keymap of Object.values(KEYMAPS)) {
      const keys = Object.values(keymap);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
