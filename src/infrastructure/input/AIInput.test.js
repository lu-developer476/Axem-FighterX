import { describe, expect, it } from 'vitest';
import { AIInput } from './AIInput.js';

function makeFighter(x, y = 220, z = 0) {
  return {
    position: { x, y, z },
    stats: { attackReach: 48 },
    isAlive: true,
    canAct: true,
    canTeleport: true,
  };
}

describe('AIInput: combate', () => {
  it('se acerca en el plano terrestre y gana altura para mantener el combate aéreo', () => {
    let now = 0;
    const fighter = makeFighter(100, 220, 0);
    const opponent = makeFighter(260, 200, 0);
    const input = new AIInput(fighter, opponent, { now: () => now, phase: 0 });

    const intent = input.readIntent();

    expect(intent.x).toBe(1);
    expect(intent.y).toBe(-1);
    expect(intent.z).toBe(1);
    expect(intent.attack).toBe(false);
  });

  it('ataca dentro del alcance y aplica un intervalo entre golpes', () => {
    let now = 1000;
    const fighter = makeFighter(200, 220, 32);
    const opponent = makeFighter(245, 220, 32);
    const input = new AIInput(fighter, opponent, { now: () => now });

    expect(input.readIntent().attack).toBe(true);
    expect(input.readIntent().attack).toBe(false);
    now += 700;
    expect(input.readIntent().attack).toBe(true);
  });

  it('activa el teletransporte cuando el rival está demasiado lejos', () => {
    const fighter = makeFighter(80);
    const opponent = makeFighter(420);
    const input = new AIInput(fighter, opponent, { now: () => 3000 });

    expect(input.readIntent().teleport).toBe(true);
    expect(input.readIntent().teleport).toBe(false);
  });

  it('no emite acciones cuando alguno de los luchadores está fuera de combate', () => {
    const fighter = makeFighter(100);
    const opponent = makeFighter(200);
    opponent.isAlive = false;
    const input = new AIInput(fighter, opponent);

    expect(input.readIntent()).toEqual({
      x: 0, y: 0, z: 0, attack: false, teleport: false,
    });
  });
});
