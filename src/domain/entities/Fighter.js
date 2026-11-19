import { FighterState, TIMINGS, attackTotalMs } from './FighterState.js';

/** Caja del cuerpo. La posición del luchador son sus pies, centrados. */
export const BODY = Object.freeze({ width: 36, height: 84 });

const KNOCKBACK_FRICTION = 700; // px/s²
const ATTACK_LUNGE = 0.9; // fracción de moveSpeed durante la fase activa

/**
 * @typedef {{ x: number, attack?: boolean, teleport?: boolean }} Intent
 */

/**
 * Entidad de dominio. No conoce Phaser ni el DOM: solo reglas y tiempo.
 * Los efectos visibles se comunican por eventos (ver drainEvents).
 */
export class Fighter {
  /**
   * @param {object} props
   * @param {string} props.id
   * @param {string} props.name
   * @param {{ maxHealth: number, moveSpeed: number, attackDamage: number, attackReach: number,
   *           knockback: number, hoverAmplitude: number, hoverSpeed: number }} props.stats
   * @param {{ x: number, y: number }} props.position
   * @param {1 | -1} [props.facing]
   */
  constructor({ id, name, stats, position, facing = 1 }) {
    this.id = id;
    this.name = name;
    this.stats = Object.freeze({ ...stats });
    this.spawn = { ...position };
    this.spawnFacing = facing;
    this.events = [];
    this.reset();
  }

  reset() {
    this.position = { ...this.spawn };
    this.facing = this.spawnFacing;
    this.health = this.stats.maxHealth;
    this.state = FighterState.IDLE;
    this.stateTimeMs = 0;
    this.elapsedMs = 0;
    this.velocityX = 0;
    this.hasHitThisAttack = false;
    this.invulnerableMs = 0;
    this.teleportCooldownMs = 0;
    this.teleportTarget = null;
    this.teleportMoved = false;
    this.events.length = 0;
  }

  // ── Consultas ────────────────────────────────────────────────────────────

  get maxHealth() {
    return this.stats.maxHealth;
  }

  get isAlive() {
    return this.state !== FighterState.KO;
  }

  get canAct() {
    return this.state === FighterState.IDLE || this.state === FighterState.WALK;
  }

  get canTeleport() {
    return this.canAct && this.teleportCooldownMs <= 0;
  }

  get isInvulnerable() {
    return (
      this.state === FighterState.KO ||
      this.state === FighterState.TELEPORT ||
      this.invulnerableMs > 0
    );
  }

  get hurtbox() {
    return {
      x: this.position.x - BODY.width / 2,
      y: this.position.y - BODY.height,
      w: BODY.width,
      h: BODY.height,
    };
  }

  /** Caja de ataque: solo existe durante la fase activa del hachazo. */
  get attackHitbox() {
    if (this.state !== FighterState.ATTACK) return null;
    const { windupMs, activeMs } = TIMINGS.attack;
    if (this.stateTimeMs < windupMs || this.stateTimeMs >= windupMs + activeMs) return null;
    const reach = this.stats.attackReach;
    const x =
      this.facing === 1
        ? this.position.x + BODY.width / 2 - 6
        : this.position.x - BODY.width / 2 + 6 - reach;
    return { x, y: this.position.y - BODY.height + 6, w: reach, h: 56 };
  }

  /** Desplazamiento vertical de levitación, en píxeles. */
  get hoverOffset() {
    const { hoverAmplitude, hoverSpeed } = this.stats;
    return Math.sin((this.elapsedMs / 1000) * hoverSpeed) * hoverAmplitude;
  }

  // ── Comandos ─────────────────────────────────────────────────────────────

  startAttack() {
    if (!this.canAct) return false;
    this.hasHitThisAttack = false;
    this.#setState(FighterState.ATTACK);
    this.#emit('attack');
    return true;
  }

  /**
   * @param {number} targetX posición de llegada
   * @param {1 | -1} finalFacing orientación al reaparecer
   */
  startTeleport(targetX, finalFacing) {
    if (!this.canTeleport) return false;
    this.teleportTarget = { x: targetX, facing: finalFacing };
    this.teleportMoved = false;
    this.teleportCooldownMs = TIMINGS.teleportCooldownMs;
    this.#setState(FighterState.TELEPORT);
    this.#emit('teleport-out');
    return true;
  }

  /**
   * @param {{ damage: number, fromDirection: 1 | -1 }} hit
   * @returns {boolean} true si el golpe entró
   */
  takeHit({ damage, fromDirection }) {
    if (this.isInvulnerable) return false;
    this.health = Math.max(0, this.health - damage);
    this.velocityX = fromDirection * this.stats.knockback;
    this.invulnerableMs = TIMINGS.hitInvulnerabilityMs;
    if (this.health === 0) {
      this.velocityX *= 1.5;
      this.#setState(FighterState.KO);
      this.#emit('ko');
    } else {
      this.#setState(FighterState.HURT);
    }
    return true;
  }

  /** @returns {number} vida realmente recuperada */
  heal(amount) {
    if (!this.isAlive) return 0;
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - before;
  }

  /** @param {Intent} intent */
  update(intent, deltaMs) {
    const seconds = deltaMs / 1000;
    this.elapsedMs += deltaMs;
    this.stateTimeMs += deltaMs;
    this.invulnerableMs = Math.max(0, this.invulnerableMs - deltaMs);
    this.teleportCooldownMs = Math.max(0, this.teleportCooldownMs - deltaMs);

    switch (this.state) {
      case FighterState.IDLE:
      case FighterState.WALK:
        this.#updateFree(intent, seconds);
        break;
      case FighterState.ATTACK:
        this.#updateAttack(seconds);
        break;
      case FighterState.HURT:
        this.#applyKnockback(seconds);
        if (this.stateTimeMs >= TIMINGS.hurtMs) {
          this.velocityX = 0;
          this.#setState(FighterState.IDLE);
        }
        break;
      case FighterState.TELEPORT:
        this.#updateTeleport();
        break;
      case FighterState.KO:
        this.#applyKnockback(seconds);
        break;
    }
  }

  /** Mantiene al luchador dentro del escenario. */
  clampTo({ minX, maxX }) {
    this.position.x = Math.min(maxX, Math.max(minX, this.position.x));
  }

  /** Entrega y vacía los eventos pendientes (para efectos visuales y sonido). */
  drainEvents() {
    const pending = this.events;
    this.events = [];
    return pending;
  }

  // ── Internos ─────────────────────────────────────────────────────────────

  #updateFree(intent, seconds) {
    if (intent.attack && this.startAttack()) return;
    if (intent.x !== 0) {
      this.facing = Math.sign(intent.x);
      this.position.x += intent.x * this.stats.moveSpeed * seconds;
      this.#setState(FighterState.WALK);
    } else {
      this.#setState(FighterState.IDLE);
    }
  }

  #updateAttack(seconds) {
    const { windupMs, activeMs } = TIMINGS.attack;
    if (this.stateTimeMs >= attackTotalMs()) {
      this.#setState(FighterState.IDLE);
      return;
    }
    const inActive = this.stateTimeMs >= windupMs && this.stateTimeMs < windupMs + activeMs;
    if (inActive) this.position.x += this.facing * this.stats.moveSpeed * ATTACK_LUNGE * seconds;
  }

  #updateTeleport() {
    const { teleportOutMs, teleportInMs } = TIMINGS;
    if (!this.teleportMoved && this.stateTimeMs >= teleportOutMs) {
      this.position.x = this.teleportTarget.x;
      this.facing = this.teleportTarget.facing;
      this.teleportMoved = true;
      this.#emit('teleport-in');
    }
    if (this.stateTimeMs >= teleportOutMs + teleportInMs) this.#setState(FighterState.IDLE);
  }

  #applyKnockback(seconds) {
    this.position.x += this.velocityX * seconds;
    const drag = KNOCKBACK_FRICTION * seconds;
    this.velocityX =
      Math.abs(this.velocityX) <= drag ? 0 : this.velocityX - Math.sign(this.velocityX) * drag;
  }

  #setState(next) {
    if (this.state === next) return;
    this.state = next;
    this.stateTimeMs = 0;
  }

  #emit(type, extra = {}) {
    this.events.push({
      type,
      id: this.id,
      x: this.position.x,
      y: this.position.y - BODY.height / 2,
      facing: this.facing,
      ...extra,
    });
  }
}
