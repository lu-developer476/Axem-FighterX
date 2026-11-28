import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Input: { Keyboard: { JustDown: (key) => { const value = Boolean(key._justDown); key._justDown = false; return value; } } } } }));
import { KEYMAPS } from './keyMaps.js';
import { PhaserKeyboardInput } from './PhaserKeyboardInput.js';
const createScene = () => ({ input: { keyboard: { addKeys: (definitions) => Object.fromEntries(Object.keys(definitions).map((name) => [name, { isDown: false, _justDown: false }])) } } });

describe('Controles de teclado', () => {
  it('define un único esquema de teclado humano y no registra controles de J2', () => {
    expect(KEYMAPS.PLAYER_1).toMatchObject({ left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', ascend: 'Q', descend: 'E', attack: 'A', teleport: 'F', dash: 'D', block: 'B', dodge: 'R', specialAttack: 'S', levitate: 'C', chargeKi: 'V' });
    expect(KEYMAPS.PLAYER_2).toBeUndefined();
  });
  it('mantiene independientes el movimiento terrestre y el vuelo', () => {
    expect(KEYMAPS.PLAYER_1.up).not.toBe(KEYMAPS.PLAYER_1.ascend);
    expect(KEYMAPS.PLAYER_1.down).not.toBe(KEYMAPS.PLAYER_1.descend);
  });
  it('las flechas controlan el terreno y Q/E la altura', () => {
    const input = new PhaserKeyboardInput(createScene(), KEYMAPS.PLAYER_1);
    input.keys.up.isDown = true; expect(input.readIntent().y).toBe(-1);
    input.keys.up.isDown = false; input.keys.down.isDown = true; expect(input.readIntent().y).toBe(1);
    input.keys.down.isDown = false; input.keys.left.isDown = true; expect(input.readIntent().x).toBe(-1);
    input.keys.left.isDown = false; input.keys.right.isDown = true; expect(input.readIntent().x).toBe(1);
    input.keys.right.isDown = false; input.keys.ascend.isDown = true; expect(input.readIntent()).toMatchObject({ x: 0, y: 0, z: 1 });
    input.keys.ascend.isDown = false; input.keys.descend.isDown = true; expect(input.readIntent()).toMatchObject({ y: 0, z: -1 });
  });
  it('conecta ataques, teletransporte, dash, bloqueo, esquiva, levitación y carga de Ki', () => {
    const input = new PhaserKeyboardInput(createScene(), KEYMAPS.PLAYER_1);
    input.keys.attack._justDown = true; input.keys.teleport._justDown = true; input.keys.dash._justDown = true;
    input.keys.block.isDown = true; input.keys.dodge._justDown = true; input.keys.specialAttack._justDown = true;
    input.keys.levitate._justDown = true; input.keys.chargeKi.isDown = true;
    expect(input.readIntent()).toMatchObject({ attack: true, teleport: true, dash: true, block: true, dodge: true, specialAttack: true, levitate: true, chargeKi: true });
  });
  it('no repite teclas', () => { const keys = Object.values(KEYMAPS.PLAYER_1); expect(new Set(keys).size).toBe(keys.length); });
});
