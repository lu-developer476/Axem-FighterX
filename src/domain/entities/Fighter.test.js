import { describe, it, expect } from 'vitest';
import { createFighter } from '../rangers/createFighter.js';
import { FighterState, TIMINGS } from './FighterState.js';

const make = (id = 'violet', x = 100) => createFighter(id, { x, y: 232 });
const idle = { x: 0, attack: false, teleport: false };
const run = (fighter, intent, totalMs, step = 16) => {
  for (let t = 0; t < totalMs; t += step) fighter.update(intent, step);
};

describe('Fighter: movimiento y orientación', () => {
  it('camina según la velocidad del ranger y pasa a WALK', () => {
    const fighter = make();
    fighter.update({ ...idle, x: 1 }, 1000);
    expect(fighter.position.x).toBeCloseTo(100 + fighter.stats.moveSpeed);
    expect(fighter.state).toBe(FighterState.WALK);
  });

  it('apunta hacia donde el jugador elige moverse', () => {
    const fighter = make();
    fighter.update({ ...idle, x: -1 }, 16);
    expect(fighter.facing).toBe(-1);
    fighter.update({ ...idle, x: 1 }, 16);
    expect(fighter.facing).toBe(1);
  });

  it('conserva la orientación al detenerse', () => {
    const fighter = make();
    fighter.update({ ...idle, x: -1 }, 16);
    fighter.update(idle, 16);
    expect(fighter.facing).toBe(-1);
    expect(fighter.state).toBe(FighterState.IDLE);
  });

  it('la levitación oscila dentro de su amplitud', () => {
    const fighter = make();
    for (let i = 0; i < 300; i++) {
      fighter.update(idle, 16);
      expect(Math.abs(fighter.hoverOffset)).toBeLessThanOrEqual(fighter.stats.hoverAmplitude + 1e-9);
    }
  });

  it('createFighter rechaza rangers desconocidos', () => {
    expect(() => createFighter('nope', { x: 0, y: 0 })).toThrow();
  });
});

describe('Fighter: ataque', () => {
  it('la caja de ataque solo existe en la fase activa', () => {
    const fighter = make();
    fighter.update({ ...idle, attack: true }, 16);
    expect(fighter.state).toBe(FighterState.ATTACK);
    expect(fighter.attackHitbox).toBeNull();
    run(fighter, idle, TIMINGS.attack.windupMs);
    expect(fighter.attackHitbox).not.toBeNull();
    run(fighter, idle, TIMINGS.attack.activeMs + 32);
    expect(fighter.attackHitbox).toBeNull();
  });

  it('la caja de ataque se ubica delante según la orientación', () => {
    const right = make('violet', 200);
    right.startAttack();
    run(right, idle, TIMINGS.attack.windupMs + 10);
    expect(right.attackHitbox.x).toBeGreaterThan(200);

    const left = make('violet', 200);
    left.facing = -1;
    left.startAttack();
    run(left, idle, TIMINGS.attack.windupMs + 10);
    expect(left.attackHitbox.x + left.attackHitbox.w).toBeLessThan(200 + 18);
  });

  it('vuelve a IDLE al terminar y no se puede reiniciar a mitad', () => {
    const fighter = make();
    fighter.startAttack();
    expect(fighter.startAttack()).toBe(false);
    run(fighter, idle, 700);
    expect(fighter.state).toBe(FighterState.IDLE);
  });
});

describe('Fighter: daño, retroceso y KO', () => {
  it('recibe daño, entra en HURT y retrocede', () => {
    const fighter = make('orange', 300);
    expect(fighter.takeHit({ damage: 12, fromDirection: 1 })).toBe(true);
    expect(fighter.health).toBe(88);
    expect(fighter.state).toBe(FighterState.HURT);
    fighter.update(idle, 100);
    expect(fighter.position.x).toBeGreaterThan(300);
  });

  it('es invulnerable justo después de un golpe', () => {
    const fighter = make();
    fighter.takeHit({ damage: 10, fromDirection: 1 });
    expect(fighter.takeHit({ damage: 10, fromDirection: 1 })).toBe(false);
    expect(fighter.health).toBe(90);
  });

  it('se recupera del aturdimiento', () => {
    const fighter = make();
    fighter.takeHit({ damage: 10, fromDirection: 1 });
    run(fighter, idle, TIMINGS.hurtMs + 50);
    expect(fighter.state).toBe(FighterState.IDLE);
    expect(fighter.velocityX).toBe(0);
  });

  it('queda en KO al llegar a 0 y emite el evento', () => {
    const fighter = make();
    fighter.takeHit({ damage: 500, fromDirection: -1 });
    expect(fighter.health).toBe(0);
    expect(fighter.state).toBe(FighterState.KO);
    expect(fighter.isAlive).toBe(false);
    expect(fighter.drainEvents().some((e) => e.type === 'ko')).toBe(true);
    run(fighter, { ...idle, x: 1, attack: true }, 2000);
    expect(fighter.state).toBe(FighterState.KO);
  });

  it('la curación no supera la vida máxima ni revive', () => {
    const fighter = make();
    fighter.takeHit({ damage: 10, fromDirection: 1 });
    expect(fighter.heal(50)).toBe(10);
    expect(fighter.health).toBe(fighter.maxHealth);
    fighter.takeHit({ damage: 999, fromDirection: 1 });
    expect(fighter.heal(50)).toBe(0);
  });
});

describe('Fighter: teletransporte', () => {
  it('desaparece, reaparece en destino y es invulnerable en el proceso', () => {
    const fighter = make('violet', 100);
    expect(fighter.startTeleport(300, -1)).toBe(true);
    expect(fighter.isInvulnerable).toBe(true);
    run(fighter, idle, TIMINGS.teleportOutMs + 20);
    expect(fighter.position.x).toBe(300);
    expect(fighter.facing).toBe(-1);
    run(fighter, idle, TIMINGS.teleportInMs + 20);
    expect(fighter.state).toBe(FighterState.IDLE);
    const types = fighter.drainEvents().map((e) => e.type);
    expect(types).toEqual(['teleport-out', 'teleport-in']);
  });

  it('respeta el enfriamiento', () => {
    const fighter = make();
    fighter.startTeleport(200, 1);
    run(fighter, idle, TIMINGS.teleportOutMs + TIMINGS.teleportInMs + 50);
    expect(fighter.canTeleport).toBe(false);
    run(fighter, idle, TIMINGS.teleportCooldownMs);
    expect(fighter.canTeleport).toBe(true);
  });
});
