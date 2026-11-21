import { ARENA, FLIGHT, PICKUP } from '../arena/arena.js';
import { overlapCenter, rectsOverlap } from '../geometry/rect.js';
import { FighterState } from './FighterState.js';
import { PICKUP_TYPES, PICKUP_TYPE_LIST, PowerUpPickup } from './PowerUpPickup.js';

const NEUTRAL = Object.freeze({ x: 0, y: 0, z: 0, attack: false, teleport: false, dash: false });
const MAX_STEP_MS = 50;

/**
 * Un combate 1 contra 1. Orquesta las reglas entre luchadores: choque de
 * cuerpos, golpes, objetos y fin de partida. Devuelve eventos de dominio
 * en cada paso para que la presentación los convierta en efectos.
 */
export class Match {
  /**
   * @param {object} props
   * @param {[import('./Fighter.js').Fighter, import('./Fighter.js').Fighter]} props.fighters
   * @param {typeof ARENA} [props.arena]
   * @param {() => number} [props.rng]
   */
  constructor({ fighters, arena = ARENA, rng = Math.random, hazards = null }) {
    this.fighters = fighters;
    this.arena = arena;
    this.rng = rng;
    this.hazards = hazards?.type === 'lava-vents' ? hazards : null;
    this.restart();
  }

  get isOver() {
    return this.status === 'over';
  }

  restart() {
    this.fighters.forEach((fighter) => fighter.reset());
    this.status = 'fighting';
    this.winnerId = null;
    this.pickup = null;
    this.pickupTimerMs = PICKUP.firstSpawnMs;
    this.hazardPhase = this.hazards ? 'warning' : null;
    this.hazardTimerMs = this.hazards?.warningMs ?? 0;
    this.hazardVentIndex = this.hazards?.initialVentIndex ?? 0;
    this.hazardWarningSent = false;
    this.hazardHitIds = new Set();
  }

  /**
   * @param {import('./Fighter.js').Intent[]} intents una por luchador, en orden
   * @param {number} deltaMs
   */
  step(intents, deltaMs) {
    const dt = Math.min(deltaMs, MAX_STEP_MS);
    const events = [];
    const active = this.isOver ? [NEUTRAL, NEUTRAL] : intents;
    const previousX = this.fighters.map((fighter) => fighter.position.x);

    this.fighters.forEach((fighter, i) => {
      if (active[i]?.teleport && fighter.canTeleport) this.#beginTeleport(fighter, this.#opponentOf(fighter));
    });
    this.fighters.forEach((fighter, i) => fighter.update(active[i] ?? NEUTRAL, dt));

    this.#enforceSpacing(previousX);
    this.fighters.forEach((fighter) => fighter.clampTo(this.arena));

    for (const fighter of this.fighters) events.push(...fighter.drainEvents());
    this.#resolveAttacks(events);
    this.#updateHazards(dt, events);
    this.#updatePickup(dt, events);
    this.#checkWinner(events);
    return events;
  }

  // ── Reglas ───────────────────────────────────────────────────────────────

  #opponentOf(fighter) {
    return this.fighters[0] === fighter ? this.fighters[1] : this.fighters[0];
  }

  /**
   * Con el rival cerca, el teletransporte lleva detrás de él; si no, salta
   * hacia adelante. Siempre queda dentro del escenario y de la cámara.
   */
  #beginTeleport(fighter, opponent) {
    const { minX, maxX, minGap, teleportDistance, teleportRange, maxSeparation } = this.arena;
    const toward = Math.sign(opponent.position.x - fighter.position.x) || fighter.facing;
    const distance = Math.abs(opponent.position.x - fighter.position.x);
    let target;
    let facing = fighter.facing;

    if (distance <= teleportRange) {
      const behind = opponent.position.x + toward * (minGap + 6);
      if (behind >= minX && behind <= maxX) {
        target = behind;
        facing = -toward;
      } else {
        target = opponent.position.x - toward * (minGap + 6);
        facing = toward;
      }
    } else {
      target = fighter.position.x + fighter.facing * teleportDistance;
    }

    target = Math.min(maxX, Math.max(minX, target));
    const limit = opponent.position.x + maxSeparation * Math.sign(target - opponent.position.x || 1);
    if (Math.abs(target - opponent.position.x) > maxSeparation) target = limit;
    fighter.startTeleport(target, facing);
  }

  #enforceSpacing(previousX) {
    const [a, b] = this.fighters;
    if (a.state === FighterState.TELEPORT || b.state === FighterState.TELEPORT) return;
    const { minGap, maxSeparation } = this.arena;
    const gap = () => Math.abs(b.position.x - a.position.x);

    if (gap() < minGap) {
      this.fighters.forEach((fighter, i) => {
        const other = this.#opponentOf(fighter);
        const closer =
          Math.abs(fighter.position.x - other.position.x) <
          Math.abs(previousX[i] - other.position.x) - 0.001;
        if (closer && gap() < minGap) fighter.position.x = previousX[i];
      });
      if (gap() < minGap) {
        const direction = Math.sign(b.position.x - a.position.x) || 1;
        const push = (minGap - gap()) / 2;
        a.position.x -= direction * push;
        b.position.x += direction * push;
      }
    } else if (gap() > maxSeparation) {
      this.fighters.forEach((fighter, i) => {
        const other = this.#opponentOf(fighter);
        const farther =
          Math.abs(fighter.position.x - other.position.x) >
          Math.abs(previousX[i] - other.position.x);
        if (farther) fighter.position.x = previousX[i];
      });
    }
  }

  #resolveAttacks(events) {
    // Se calculan ambas cajas antes de aplicar daño: un intercambio simultáneo es posible.
    const strikes = this.fighters.map((attacker) => ({
      attacker,
      target: this.#opponentOf(attacker),
      box: attacker.hasHitThisAttack ? null : attacker.attackHitbox,
    }));

    for (const { attacker, target, box } of strikes) {
      const sameDepthLane = Math.abs(attacker.position.y - target.position.y) <= FLIGHT.attackDepthTolerance;
      if (!box || !sameDepthLane || !rectsOverlap(box, target.hurtbox)) continue;
      const point = overlapCenter(box, target.hurtbox);
      const landed = target.takeHit({
        damage: attacker.rollAttackDamage(this.rng(), attacker.state === 'special-attack'),
        fromDirection: attacker.facing,
      });
      if (!landed) continue;
      attacker.hasHitThisAttack = true;
      events.push({
        type: 'hit',
        attackerId: attacker.id,
        targetId: target.id,
        damage: target.lastDamageTaken,
        blocked: target.lastHitBlocked,
        x: point.x,
        y: point.y,
        facing: attacker.facing,
        ko: !target.isAlive,
      });
    }
    for (const fighter of this.fighters) events.push(...fighter.drainEvents());
  }

  #updateHazards(dt, events) {
    if (!this.hazards || this.isOver) return;

    const ventX = this.hazards.positions[this.hazardVentIndex];
    if (this.hazardPhase === 'warning') {
      if (!this.hazardWarningSent) {
        events.push({
          type: 'hazard-warning',
          x: ventX,
          radiusX: this.hazards.radiusX,
          ventIndex: this.hazardVentIndex,
        });
        this.hazardWarningSent = true;
      }
      this.hazardTimerMs -= dt;
      if (this.hazardTimerMs <= 0) {
        this.hazardPhase = 'eruption';
        this.hazardTimerMs = this.hazards.activeMs;
        this.hazardHitIds.clear();
        events.push({
          type: 'hazard-erupt',
          x: ventX,
          radiusX: this.hazards.radiusX,
          ventIndex: this.hazardVentIndex,
        });
      }
      return;
    }

    if (this.hazardPhase === 'eruption') {
      for (const fighter of this.fighters) {
        if (!fighter.isAlive || this.hazardHitIds.has(fighter.id)) continue;
        const insideVent = Math.abs(fighter.position.x - ventX) <= this.hazards.radiusX
          && Math.abs(fighter.position.y - this.arena.groundY) <= this.hazards.depthTolerance;
        const aboveEruption = (fighter.position.z ?? 0) >= this.hazards.safeAltitude;
        if (!insideVent || aboveEruption) continue;

        this.hazardHitIds.add(fighter.id);
        const landed = fighter.takeHit({
          damage: this.hazards.damage,
          fromDirection: Math.sign(fighter.position.x - ventX) || 1,
        });
        if (!landed) continue;

        events.push({
          type: 'hit',
          attackerId: null,
          targetId: fighter.id,
          source: 'lava-vent',
          damage: fighter.lastDamageTaken,
          x: fighter.position.x,
          y: fighter.position.y - fighter.position.z - 42,
          facing: Math.sign(fighter.position.x - ventX) || 1,
          ko: !fighter.isAlive,
        });
        events.push(...fighter.drainEvents());
      }

      this.hazardTimerMs -= dt;
      if (this.hazardTimerMs <= 0) {
        this.hazardPhase = 'cooldown';
        this.hazardTimerMs = this.hazards.cooldownMs;
        events.push({ type: 'hazard-end', x: ventX, ventIndex: this.hazardVentIndex });
      }
      return;
    }

    this.hazardTimerMs -= dt;
    if (this.hazardTimerMs <= 0) {
      this.hazardVentIndex = (this.hazardVentIndex + 1) % this.hazards.positions.length;
      this.hazardPhase = 'warning';
      this.hazardTimerMs = this.hazards.warningMs;
      this.hazardWarningSent = false;
    }
  }

  #updatePickup(dt, events) {
    if (this.pickup) {
      this.pickup.ageMs += dt;
      if (this.pickup.remainingMs <= 0) {
        events.push({ type: 'pickup-expired', x: this.pickup.x, powerUpType: this.pickup.type });
        this.pickup = null;
        return;
      }
      for (const fighter of this.fighters) {
        if (!fighter.isAlive || !rectsOverlap(fighter.hurtbox, this.pickup.box)) continue;
        if (this.pickup.type === PICKUP_TYPES.HEALTH) {
          const healed = fighter.heal(this.pickup.amount);
          if (healed <= 0) continue;
          events.push({
            type: 'heal',
            id: fighter.id,
            amount: healed,
            x: fighter.position.x,
            y: fighter.position.y - 42,
          });
        } else {
          const durationMs = fighter.applyPowerUp(this.pickup.type);
          if (durationMs <= 0) continue;
          events.push({
            type: 'powerup',
            id: fighter.id,
            powerUpType: this.pickup.type,
            durationMs,
            x: fighter.position.x,
            y: fighter.position.y - 42,
          });
        }
        this.pickup = null;
        break;
      }
      return;
    }

    if (this.isOver) return;
    this.pickupTimerMs -= dt;
    if (this.pickupTimerMs > 0) return;
    const { minX, maxX } = this.arena;
    const randomPosition = Math.min(0.999999, Math.max(0, this.rng()));
    const x = minX + 40 + randomPosition * (maxX - minX - 80);
    const randomType = Math.min(0.999999, Math.max(0, this.rng()));
    const type = PICKUP_TYPE_LIST[Math.floor(randomType * PICKUP_TYPE_LIST.length)];
    this.pickup = new PowerUpPickup(x, type);
    this.pickupTimerMs = PICKUP.intervalMs;
    events.push({ type: 'pickup-spawn', x, powerUpType: type });
  }

  #checkWinner(events) {
    if (this.isOver) return;
    const [a, b] = this.fighters;
    if (a.isAlive && b.isAlive) return;
    this.status = 'over';
    this.winnerId = a.isAlive ? a.id : b.isAlive ? b.id : null;
    events.push({ type: 'match-over', winnerId: this.winnerId });
  }
}
