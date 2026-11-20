import { describe, expect, it } from 'vitest';
import { ARENA } from '../../domain/arena/arena.js';
import { FighterState } from '../../domain/entities/FighterState.js';
import { PICKUP_TYPES } from '../../domain/entities/PowerUpPickup.js';
import { AIInput } from './AIInput.js';

function makeFighter(x, y = 220, z = 0, facing = null) {
  return {
    id: x < 200 ? 'violet' : 'orange',
    position: { x, y, z },
    spawn: { x, y },
    stats: { attackReach: 48, moveSpeed: 95 },
    state: FighterState.IDLE,
    stateTimeMs: 0,
    facing: facing ?? (x < 200 ? 1 : -1),
    isAlive: true,
    isInvulnerable: false,
    canAct: true,
    canTeleport: true,
    health: 100,
    maxHealth: 100,
    maxAltitude: 110,
    powerUps: { fury: 0, haste: 0, shield: 0 },
    get hurtbox() {
      return {
        x: this.position.x - 18,
        y: this.position.y - 84 - this.position.z,
        w: 36,
        h: 84,
      };
    },
  };
}

describe('AIInput: táctica y progresión', () => {
  it('se acerca por el plano correcto y prepara altura de combate', () => {
    const fighter = makeFighter(100, 220, 0);
    const opponent = makeFighter(260, 200, 0);
    const input = new AIInput(fighter, opponent, { now: () => 0, phase: 0 });

    const intent = input.readIntent();

    expect(intent.x).toBe(1);
    expect(intent.y).toBe(-1);
    expect(intent.z).toBe(1);
    expect(intent.attack).toBe(false);
  });

  it('ataca solo cuando su hitbox alcanza al rival y respeta el ritmo de golpes', () => {
    let now = 1000;
    const fighter = makeFighter(200, 220, 32, 1);
    const opponent = makeFighter(245, 220, 32);
    const input = new AIInput(fighter, opponent, { now: () => now });

    expect(input.readIntent().attack).toBe(true);
    expect(input.readIntent().attack).toBe(false);
    now += 700;
    expect(input.readIntent().attack).toBe(true);
  });

  it('no ataca a través de carriles de profundidad distintos', () => {
    let now = 1000;
    const fighter = makeFighter(200, 190, 32);
    const opponent = makeFighter(245, 220, 32);
    const input = new AIInput(fighter, opponent, { now: () => now });

    expect(input.readIntent().attack).toBe(false);
    expect(input.readIntent().y).toBe(1);
  });

  it('anticipa un cambio de carril en lugar de perseguir la posición atrasada', () => {
    let now = 0;
    const fighter = makeFighter(200, ARENA.groundY, 32, 1);
    const opponent = makeFighter(245, ARENA.groundY, 32);
    const input = new AIInput(fighter, opponent, {
      now: () => now,
      difficulty: 5,
      arena: ARENA,
    });

    input.readIntent();
    now = 100;
    opponent.position.y -= 4;

    expect(input.readIntent().y).toBe(-1);
  });


  it('aprovecha un objeto de vida cuando está herida y puede alcanzarlo', () => {
    const fighter = makeFighter(100, ARENA.minY, 0);
    fighter.spawn.y = ARENA.groundY;
    fighter.health = 45;
    const opponent = makeFighter(420, ARENA.groundY, 0);
    const pickup = {
      x: 150,
      type: PICKUP_TYPES.HEALTH,
      amount: 25,
      remainingMs: 4000,
    };
    const input = new AIInput(fighter, opponent, {
      now: () => 500,
      arena: ARENA,
      getPickup: () => pickup,
    });

    const intent = input.readIntent();

    expect(intent.x).toBe(1);
    expect(intent.y).toBe(1);
    expect(intent.attack).toBe(false);
  });

  it('esquiva una hitbox inminente con teletransporte cuando alcanza el nivel táctico', () => {
    const fighter = makeFighter(260, 220, 0);
    const opponent = makeFighter(220, 220, 0);
    opponent.facing = 1;
    opponent.state = FighterState.ATTACK;
    opponent.stateTimeMs = 40;
    const input = new AIInput(fighter, opponent, {
      now: () => 100,
      difficulty: 5,
    });

    expect(input.readIntent().teleport).toBe(true);
  });

  it('mejora la frecuencia de castigo al subir de nivel', () => {
    const makeInput = (difficulty) => {
      let now = 0;
      const fighter = makeFighter(200, 220, 32, 1);
      const opponent = makeFighter(245, 220, 32);
      const input = new AIInput(fighter, opponent, { now: () => now, difficulty });
      expect(input.readIntent().attack).toBe(true);
      now = 500;
      return input.readIntent();
    };

    expect(makeInput(1).attack).toBe(false);
    expect(makeInput(5).attack).toBe(true);
  });

  it('registra la cadencia de los ataques rivales para ajustar su respuesta', () => {
    let now = 0;
    const fighter = makeFighter(200, 220, 32, 1);
    const opponent = makeFighter(245, 220, 32);
    const input = new AIInput(fighter, opponent, { now: () => now });

    opponent.state = FighterState.ATTACK;
    opponent.stateTimeMs = 100;
    input.readIntent();

    opponent.state = FighterState.IDLE;
    now = 400;
    input.readIntent();

    opponent.state = FighterState.ATTACK;
    opponent.stateTimeMs = 100;
    now = 900;
    input.readIntent();

    expect(input.opponentAttackIntervalMs).toBe(900);
  });

  it('adapta su ventana de castigo cuando el rival termina de atacar', () => {
    let now = 100;
    const fighter = makeFighter(200, 220, 32);
    const opponent = makeFighter(245, 220, 32);
    const input = new AIInput(fighter, opponent, { now: () => now, difficulty: 3 });

    opponent.state = FighterState.ATTACK;
    opponent.stateTimeMs = 100;
    input.readIntent();
    opponent.state = FighterState.IDLE;
    now = 600;
    input.readIntent();
    expect(input.lastOpponentAttackEndedAt).toBe(600);
  });

  it('activa el teletransporte cuando el rival se aleja demasiado y respeta su enfriamiento', () => {
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
