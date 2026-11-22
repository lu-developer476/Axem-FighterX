import { describe, it, expect } from 'vitest';
import { Match } from './Match.js';
import { FighterState, TIMINGS } from './FighterState.js';
import { createFighter } from '../rangers/createFighter.js';
import { ARENA, PICKUP, getArenaForGroundDepthMode } from '../arena/arena.js';
import { PICKUP_TYPES } from './PowerUpPickup.js';

const idle = { x: 0, y: 0, z: 0, attack: false, teleport: false };
const make = ({ ax = 300, bx = 340, rng = () => 0, arena = ARENA, hazards = null } = {}) => {
  const a = createFighter('violet', { x: ax, y: ARENA.groundY }, 1);
  const b = createFighter('orange', { x: bx, y: ARENA.groundY }, -1);
  return new Match({ fighters: [a, b], rng, arena, hazards });
};
const advance = (match, intents, ms, step = 16) => {
  const events = [];
  for (let t = 0; t < ms; t += step) events.push(...match.step(intents, step));
  return events;
};

describe('Match: golpes', () => {
  it('un ataque a distancia conecta una sola vez y emite el evento', () => {
    const match = make();
    const [a, b] = match.fighters;
    const events = advance(match, [{ ...idle, attack: true }, idle], 100);
    const hits = events.filter((e) => e.type === 'hit');
    expect(hits).toHaveLength(0);
    const later = advance(match, [idle, idle], 400);
    const all = [...events, ...later].filter((e) => e.type === 'hit');
    expect(all).toHaveLength(1);
    expect(all[0].damage).toBeGreaterThanOrEqual(1);
    expect(all[0].damage).toBeLessThanOrEqual(5);
    expect(b.health).toBe(b.maxHealth - all[0].damage);
    expect(b.state === FighterState.HURT || b.state === FighterState.IDLE).toBe(true);
  });

  it('el golpe falla si el rival está fuera de alcance', () => {
    const match = make({ ax: 100, bx: 400 });
    const events = advance(match, [{ ...idle, attack: true }, idle], 600);
    expect(events.some((e) => e.type === 'hit')).toBe(false);
    expect(match.fighters[1].health).toBe(match.fighters[1].maxHealth);
  });

  it('los ataques respetan la profundidad aunque la altura haga coincidir los rectángulos en pantalla', () => {
    const match = make({ ax: 300, bx: 340 });
    const [attacker, target] = match.fighters;
    attacker.position.y = 180;
    target.position.y = 210;
    target.position.z = 30;

    const events = advance(match, [{ ...idle, attack: true }, idle], 600);

    expect(events.some((event) => event.type === 'hit')).toBe(false);
    expect(target.health).toBe(target.maxHealth);
  });

  it('los ataques respetan la altura: un rival muy por encima no recibe el golpe', () => {
    const match = make({ ax: 300, bx: 340 });
    const [attacker, target] = match.fighters;
    target.position.z = 110;
    const events = advance(match, [{ ...idle, attack: true }, idle], 600);
    expect(events.some((event) => event.type === 'hit')).toBe(false);
    expect(target.health).toBe(target.maxHealth);
  });

  it('el golpe no entra mientras el rival se teletransporta', () => {
    const match = make();
    const [a, b] = match.fighters;
    advance(match, [{ ...idle, attack: true }, { ...idle, teleport: true }], 600);
    expect(a.health).toBe(a.maxHealth);
    expect(b.health).toBe(b.maxHealth);
  });

  it('un intercambio simultáneo golpea a ambos', () => {
    const match = make();
    advance(match, [{ ...idle, attack: true }, { ...idle, attack: true }], 400);
    const [a, b] = match.fighters;
    expect(a.health).toBeLessThan(a.maxHealth);
    expect(b.health).toBeLessThan(b.maxHealth);
  });
});

describe('Match: KO', () => {
  it('mantiene ganadores inequívocos cuando se construye con dos instancias del mismo Axem', () => {
    const fighters = [
      createFighter('violet', { x: 300, y: ARENA.groundY }, 1, 'female'),
      createFighter('violet', { x: 340, y: ARENA.groundY }, -1, 'female'),
    ];
    const match = new Match({ fighters, rng: () => 0.999 });

    expect(fighters[0].id).toBe(fighters[1].id);
    expect(fighters[0].combatantId).not.toBe(fighters[1].combatantId);

    fighters[1].health = 1;
    fighters[1].takeHit({ damage: 1, fromDirection: 1 });
    const events = match.step([idle, idle], 16);

    expect(match.winnerId).toBe(fighters[0].combatantId);
    expect(events.find((event) => event.type === 'match-over')?.winnerId)
      .toBe(fighters[0].combatantId);
  });

  it('termina la partida con ganador y congela las entradas', () => {
    const match = make({ rng: () => 0.999 });
    const [a, b] = match.fighters;
    b.health = 5;
    const events = advance(match, [{ ...idle, attack: true }, idle], 500);
    expect(events.some((e) => e.type === 'ko')).toBe(true);
    expect(events.find((e) => e.type === 'match-over').winnerId).toBe(a.id);
    expect(match.isOver).toBe(true);
    const x = a.position.x;
    advance(match, [{ ...idle, x: 1 }, idle], 300);
    expect(a.position.x).toBe(x);
  });

  it('reiniciar devuelve todo al estado inicial, incluidos los potenciadores', () => {
    const match = make();
    const [a] = match.fighters;
    a.applyPowerUp(PICKUP_TYPES.FURY);
    advance(match, [idle, idle], 50);
    match.restart();
    expect(match.isOver).toBe(false);
    expect(match.fighters.every((f) => f.health === f.maxHealth && f.state === FighterState.IDLE)).toBe(true);
    expect(a.powerUps[PICKUP_TYPES.FURY]).toBe(0);
  });
});

describe('Match: cuerpos y escenario', () => {
  it('bloquea el eje de profundidad en escenarios lineales', () => {
    const match = make({ arena: getArenaForGroundDepthMode('restricted') });
    const [fighter] = match.fighters;

    advance(match, [{ ...idle, y: -1 }, idle], 1000);

    expect(fighter.position.y).toBe(ARENA.groundY);
  });

  it('permite elevarse y combatir en el aire aunque el escenario tenga carril lineal', () => {
    const match = make({ arena: getArenaForGroundDepthMode('restricted') });
    const [attacker, target] = match.fighters;

    advance(match, [{ ...idle, z: 1 }, { ...idle, z: 1 }], 650);

    expect(attacker.position.y).toBe(ARENA.groundY);
    expect(target.position.y).toBe(ARENA.groundY);
    expect(attacker.position.z).toBeGreaterThan(0);
    expect(target.position.z).toBeGreaterThan(0);

    const events = advance(match, [{ ...idle, attack: true }, idle], 600);
    expect(events.some((event) => event.type === 'hit')).toBe(true);
    expect(target.health).toBeLessThan(target.maxHealth);
  });

  it('conserva el desplazamiento de profundidad en escenarios abiertos', () => {
    const match = make({ arena: getArenaForGroundDepthMode('free') });
    const [fighter] = match.fighters;

    advance(match, [{ ...idle, y: -1 }, idle], 500);

    expect(fighter.position.y).toBeLessThan(ARENA.groundY);
    expect(fighter.position.y).toBeGreaterThanOrEqual(ARENA.minY);
  });

  it('los luchadores no se atraviesan al caminar', () => {
    const match = make({ ax: 300, bx: 360 });
    advance(match, [{ ...idle, x: 1 }, idle], 1500);
    const [a, b] = match.fighters;
    expect(b.position.x - a.position.x).toBeGreaterThanOrEqual(ARENA.minGap - 0.5);
  });

  it('no pueden alejarse más de la separación máxima', () => {
    const match = make({ ax: 200, bx: 560 });
    advance(match, [{ ...idle, x: -1 }, { ...idle, x: 1 }], 3000);
    const [a, b] = match.fighters;
    expect(Math.abs(b.position.x - a.position.x)).toBeLessThanOrEqual(ARENA.maxSeparation + 0.5);
  });

  it('respetan los límites horizontales del escenario', () => {
    const match = make({ ax: 100, bx: 140 });
    advance(match, [{ ...idle, x: -1 }, idle], 4000);
    expect(match.fighters[0].position.x).toBe(ARENA.minX);
  });

  it('permite volar sobre el suelo sin que el descenso atraviese el piso', () => {
    const match = make({ ax: 300, bx: 420 });
    const [fighter] = match.fighters;

    advance(match, [{ ...idle, z: 1 }, idle], 2200);
    expect(fighter.position.z).toBeGreaterThan(0);

    advance(match, [{ ...idle, z: -1 }, idle], 3000);
    expect(fighter.position.z).toBe(0);

    advance(match, [{ ...idle, y: 1 }, idle], 1800);
    expect(fighter.position.y).toBe(ARENA.groundY);
  });
});

describe('Match: teletransporte', () => {
  it('con el rival cerca, reaparece detrás de él mirándolo', () => {
    const match = make({ ax: 300, bx: 380 });
    const [a, b] = match.fighters;
    advance(match, [{ ...idle, teleport: true }, idle], 400);
    expect(a.position.x).toBeGreaterThan(b.position.x);
    expect(a.facing).toBe(-1);
  });

  it('con el rival lejos, salta hacia adelante', () => {
    const match = make({ ax: 100, bx: 450 });
    const [a] = match.fighters;
    advance(match, [{ ...idle, teleport: true }, idle], 400);
    expect(a.position.x).toBeCloseTo(100 + ARENA.teleportDistance, 0);
  });
});

describe('Match: respiraderos volcánicos', () => {
  const hazards = {
    type: 'lava-vents',
    positions: [300],
    initialVentIndex: 0,
    warningMs: 80,
    activeMs: 160,
    cooldownMs: 500,
    damage: 14,
    radiusX: 34,
    depthTolerance: 16,
    safeAltitude: 58,
  };

  it('avisa antes de entrar en erupción y daña a quien permanece sobre el respiradero', () => {
    const match = make({ ax: 300, bx: 520, hazards });
    const fighter = match.fighters[0];
    const health = fighter.health;

    const warning = advance(match, [idle, idle], 64);
    expect(warning.some((event) => event.type === 'hazard-warning')).toBe(true);
    expect(fighter.health).toBe(health);

    const eruption = advance(match, [idle, idle], 64);
    expect(eruption.some((event) => event.type === 'hazard-erupt')).toBe(true);
    expect(eruption.some((event) => event.type === 'hit' && event.source === 'lava-vent')).toBe(true);
    expect(fighter.health).toBeLessThan(health);
  });

  it('permite evitar la columna saltando por encima de la altura segura', () => {
    const match = make({ ax: 300, bx: 520, hazards });
    const fighter = match.fighters[0];
    fighter.position.z = hazards.safeAltitude + 1;

    advance(match, [idle, idle], hazards.warningMs + 120);

    expect(fighter.health).toBe(fighter.maxHealth);
  });

  it('permite evitar la zona de impacto cambiando de carril', () => {
    const match = make({ ax: 300, bx: 520, hazards });
    const fighter = match.fighters[0];
    fighter.position.y = ARENA.groundY - hazards.depthTolerance - 2;

    advance(match, [idle, idle], hazards.warningMs + 120);

    expect(fighter.health).toBe(fighter.maxHealth);
  });

  it('rota al siguiente respiradero después de la pausa', () => {
    const sequence = { ...hazards, positions: [300, 420] };
    const match = make({ ax: 300, bx: 520, hazards: sequence });

    const events = advance(match, [idle, idle], sequence.warningMs + sequence.activeMs + sequence.cooldownMs + 32);

    expect(events.some((event) => event.type === 'hazard-warning' && event.x === 420)).toBe(true);
  });
});

describe('Match: objetos', () => {
  it('aparece un corazón y cura a quien lo toma', () => {
    const match = make({ ax: 150, bx: 500, rng: () => 0 });
    const [a] = match.fighters;
    a.health = 40;
    const events = advance(match, [idle, idle], PICKUP.firstSpawnMs + 100);
    expect(events.some((e) => e.type === 'pickup-spawn')).toBe(true);
    expect(match.pickup).not.toBeNull();
    expect(match.pickup.type).toBe(PICKUP_TYPES.HEALTH);
    a.position.x = match.pickup.x;
    const after = advance(match, [idle, idle], 50);
    expect(after.some((e) => e.type === 'heal')).toBe(true);
    expect(a.health).toBe(40 + PICKUP.healAmount);
    expect(match.pickup).toBeNull();
  });

  it('la furia aumenta el daño durante un tiempo y luego expira', () => {
    const match = make({
      ax: 150,
      bx: 500,
      rng: (() => { let calls = 0; return () => (calls++ % 2 === 0 ? 0.5 : 0.3); })(),
    });
    const [a] = match.fighters;
    const normalDamage = a.rollAttackDamage(0.4);
    advance(match, [idle, idle], PICKUP.firstSpawnMs + 100);
    expect(match.pickup.type).toBe(PICKUP_TYPES.FURY);
    a.position.x = match.pickup.x;
    const collected = advance(match, [idle, idle], 50);
    expect(collected.some((event) => event.type === 'powerup' && event.powerUpType === PICKUP_TYPES.FURY)).toBe(true);
    expect(a.rollAttackDamage(0.4)).toBeGreaterThan(normalDamage);
    expect(a.rollAttackDamage(0.999)).toBe(5);
    advance(match, [idle, idle], 6600);
    expect(a.powerUps[PICKUP_TYPES.FURY]).toBe(0);
    expect(a.rollAttackDamage(0.4)).toBe(normalDamage);
  });

  it('la rapidez aumenta el desplazamiento y el escudo reduce el daño recibido', () => {
    const match = make({ ax: 150, bx: 500 });
    const [a, b] = match.fighters;
    a.applyPowerUp(PICKUP_TYPES.HASTE);
    const before = a.position.x;
    a.update({ ...idle, x: 1 }, 100);
    expect(a.position.x - before).toBeCloseTo(a.stats.moveSpeed * 1.4 * 0.1);
    b.applyPowerUp(PICKUP_TYPES.SHIELD);
    expect(b.takeHit({ damage: 20, fromDirection: 1 })).toBe(true);
    expect(b.health).toBe(b.maxHealth - 10);
  });

  it('un corazón no desaparece si el luchador ya tiene la vida completa', () => {
    const match = make({ ax: 150, bx: 500, rng: () => 0 });
    advance(match, [idle, idle], PICKUP.firstSpawnMs + 100);
    const [a] = match.fighters;
    a.position.x = match.pickup.x;
    advance(match, [idle, idle], 50);
    expect(match.pickup).not.toBeNull();
    expect(a.health).toBe(a.maxHealth);
  });

  it('un objeto desaparece si nadie lo recoge', () => {
    const match = make({ ax: 60, bx: 100, rng: () => 0 });
    const events = advance(match, [idle, idle], PICKUP.firstSpawnMs + PICKUP.lifetimeMs + 200);
    expect(events.some((e) => e.type === 'pickup-expired')).toBe(true);
  });
});
