import { describe, it, expect } from 'vitest';
import { createFighter } from '../rangers/createFighter.js';
import { ARENA, FLIGHT } from '../arena/arena.js';
import { BODY } from './Fighter.js';
import { FighterState, TIMINGS } from './FighterState.js';

const make = (id = 'orange', x = 100) => createFighter(id, { x, y: ARENA.groundY }, 1, 'male');
const idle = { x: 0, y: 0, z: 0, attack: false, teleport: false };
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

  it('se desplaza hacia arriba y abajo sin alterar la orientación', () => {
    const fighter = make();
    fighter.position.y = ARENA.groundY + 30;
    fighter.update({ ...idle, y: -1 }, 1000);
    fighter.clampTo(ARENA);
    expect(fighter.position.y).toBeCloseTo(ARENA.minY);
    expect(fighter.facing).toBe(1);
    fighter.update({ ...idle, y: 1 }, 1000);
    fighter.clampTo(ARENA);
    expect(fighter.position.y).toBeCloseTo(ARENA.maxY);
  });

  it('caminar por el terreno y volar son movimientos independientes', () => {
    const fighter = make();
    const speed = fighter.currentMoveSpeed;
    fighter.update({ ...idle, x: 1, z: 1 }, 500);
    expect(fighter.position.x).toBeCloseTo(100 + speed * 0.5);
    expect(fighter.position.z).toBeCloseTo(speed * 0.5);
    expect(fighter.state).toBe(FighterState.WALK);
    fighter.update({ ...idle, z: 1 }, 500);
    expect(fighter.position.x).toBeCloseTo(100 + speed * 0.5);
    expect(fighter.position.z).toBeCloseTo(speed);
    expect(fighter.state).toBe(FighterState.IDLE);
  });
  it('asciende por encima del suelo y desciende hasta aterrizar sin atravesarlo', () => {
    const fighter = make();
    fighter.update({ ...idle, z: 1 }, 500);
    expect(fighter.position.z).toBeGreaterThan(0);
    expect(fighter.position.z).toBeCloseTo(fighter.stats.moveSpeed * 0.5);

    fighter.update({ ...idle, z: -1 }, 500);
    expect(fighter.position.z).toBeCloseTo(0);
    fighter.update({ ...idle, z: -1 }, 1000);
    expect(fighter.position.z).toBe(0);
  });

  it('limita el vuelo al cielo visible sin cortar la cabeza del personaje', () => {
    const fighter = make();
    fighter.update({ ...idle, z: 1 }, 5000);
    expect(fighter.position.z).toBe(fighter.maxAltitude);
    expect(fighter.position.z).toBeLessThanOrEqual(ARENA.groundY - BODY.height - FLIGHT.skyMargin - fighter.stats.hoverAmplitude);

    fighter.position.y = ARENA.minY;
    fighter.clampTo({ minX: ARENA.minX, maxX: ARENA.maxX, minY: ARENA.minY, maxY: ARENA.groundY });
    expect(fighter.position.z).toBeLessThanOrEqual(ARENA.minY - BODY.height - FLIGHT.skyMargin - fighter.stats.hoverAmplitude);
  });

  it('la levitación puede tocar el suelo y elevarse dentro de su amplitud', () => {
    const fighter = make();
    expect(fighter.hoverOffset).toBeCloseTo(0);

    fighter.elapsedMs = (Math.PI / fighter.stats.hoverSpeed) * 1000;
    expect(fighter.hoverOffset).toBeCloseTo(fighter.stats.hoverAmplitude);

    for (let i = 0; i < 300; i++) {
      fighter.update(idle, 16);
      expect(fighter.hoverOffset).toBeGreaterThanOrEqual(-1e-9);
      expect(fighter.hoverOffset).toBeLessThanOrEqual(fighter.stats.hoverAmplitude + 1e-9);
    }
  });

  it('el daño de cada golpe varía entre 1 y 5 y Furia no supera el máximo', () => {
    const fighter = make();
    expect(fighter.rollAttackDamage(0)).toBe(1);
    expect(fighter.rollAttackDamage(0.4)).toBe(3);
    expect(fighter.rollAttackDamage(0.999)).toBe(5);

    fighter.applyPowerUp('fury');
    expect(fighter.rollAttackDamage(0)).toBe(2);
    expect(fighter.rollAttackDamage(0.4)).toBe(5);
    expect(fighter.rollAttackDamage(0.999)).toBe(5);
  });

  it('createFighter rechaza rangers desconocidos', () => {
    expect(() => createFighter('nope', { x: 0, y: 0 })).toThrow();
  });
});

describe('Fighter: dash', () => {
  it('ejecuta el impulso, emite su evento y respeta el enfriamiento', () => {
    const fighter = make();
    const initialX = fighter.position.x;
    const speed = fighter.currentMoveSpeed;
    fighter.update({ ...idle, x: 1, dash: true }, 50);
    expect(fighter.state).toBe(FighterState.DASH);
    expect(fighter.position.x).toBeCloseTo(initialX + speed * 3.1 * 0.05);
    expect(fighter.drainEvents().some((event) => event.type === 'dash-start')).toBe(true);
    run(fighter, idle, 180);
    expect(fighter.state).toBe(FighterState.IDLE);
    const afterDash = fighter.position.x;
    fighter.update({ ...idle, x: 1, dash: true }, 50);
    expect(fighter.state).toBe(FighterState.WALK);
    expect(fighter.position.x).toBeCloseTo(afterDash + speed * 0.05);
  });
  it('usa la orientación actual si se activa sin dirección', () => {
    const fighter = make();
    fighter.facing = -1;
    const initialX = fighter.position.x;
    fighter.update({ ...idle, dash: true }, 50);
    expect(fighter.position.x).toBeLessThan(initialX);
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
    const right = make('orange', 200);
    right.startAttack();
    run(right, idle, TIMINGS.attack.windupMs + 10);
    expect(right.attackHitbox.x).toBeGreaterThan(200);

    const left = make('orange', 200);
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
    const fighter = make('orange', 100);
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


describe('Fighter: defensa, esquiva y ataque especial', () => {
  it('mantiene el bloqueo y reduce el daño al recibir un golpe de frente', () => {
    const fighter = make('orange', 300);
    fighter.facing = -1;
    fighter.update({ ...idle, block: true }, 16);
    expect(fighter.state).toBe(FighterState.BLOCK);
    expect(fighter.takeHit({ damage: 20, fromDirection: 1 })).toBe(true);
    expect(fighter.lastHitBlocked).toBe(true);
    expect(fighter.lastDamageTaken).toBe(4);
    expect(fighter.health).toBe(96);
    expect(fighter.state).toBe(FighterState.BLOCK_HIT);
    run(fighter, { ...idle, block: true }, TIMINGS.blockHitMs + 16);
    expect(fighter.state).toBe(FighterState.BLOCK);
  });

  it('no bloquea un golpe que llega desde atrás', () => {
    const fighter = make('orange', 300);
    fighter.facing = 1;
    fighter.update({ ...idle, block: true }, 16);
    expect(fighter.takeHit({ damage: 20, fromDirection: 1 })).toBe(true);
    expect(fighter.lastHitBlocked).toBe(false);
    expect(fighter.health).toBe(80);
    expect(fighter.state).toBe(FighterState.HURT);
  });

  it('la esquiva tiene desplazamiento propio, invulnerabilidad breve y enfriamiento', () => {
    const fighter = make('orange', 300);
    const initialX = fighter.position.x;
    fighter.update({ ...idle, dodge: true }, 80);
    expect(fighter.state).toBe(FighterState.DODGE);
    expect(fighter.position.x).toBeLessThan(initialX);
    expect(fighter.isInvulnerable).toBe(true);
    expect(fighter.takeHit({ damage: 10, fromDirection: 1 })).toBe(false);
    run(fighter, idle, 400);
    expect(fighter.state).toBe(FighterState.IDLE);
    fighter.update({ ...idle, dodge: true }, 32);
    expect(fighter.state).toBe(FighterState.IDLE);
  });

  it('el ataque especial tiene anticipación, hitbox y daño superior con enfriamiento', () => {
    const fighter = make('orange', 300);
    expect(fighter.startSpecialAttack()).toBe(true);
    expect(fighter.state).toBe(FighterState.SPECIAL_ATTACK);
    expect(fighter.attackHitbox).toBeNull();
    expect(fighter.rollAttackDamage(0.999, true)).toBe(7);
    run(fighter, idle, TIMINGS.specialAttack.windupMs + 16);
    expect(fighter.attackHitbox).not.toBeNull();
    expect(fighter.startSpecialAttack()).toBe(false);
    run(fighter, idle, TIMINGS.specialAttack.activeMs + TIMINGS.specialAttack.recoveryMs + 32);
    expect(fighter.state).toBe(FighterState.IDLE);
    expect(fighter.startSpecialAttack()).toBe(false);
  });

  it('reproduce el estado de aterrizaje al tocar el suelo', () => {
    const fighter = make('orange', 300);
    fighter.position.z = 30;
    fighter.update({ ...idle, z: -1 }, 2000);
    expect(fighter.position.z).toBe(0);
    expect(fighter.state).toBe(FighterState.LAND);
    run(fighter, idle, TIMINGS.landMs + 32);
    expect(fighter.state).toBe(FighterState.IDLE);
  });
});
