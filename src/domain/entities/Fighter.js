import { FLIGHT } from '../arena/arena.js';
import { DASH, DODGE, FighterState, TIMINGS, attackTotalMs, specialAttackTotalMs } from './FighterState.js';
import { PICKUP_TYPES, POWER_UPS } from './PowerUpPickup.js';

/** Caja del cuerpo. La posición del luchador son sus pies, centrados. */
export const BODY = Object.freeze({ width: 36, height: 84 });

const KNOCKBACK_FRICTION = 700; // px/s²
const ATTACK_LUNGE = 0.9; // fracción de moveSpeed durante la fase activa
const MAX_ATTACK_DAMAGE = 5;
const MAX_SPECIAL_DAMAGE = 7;
const BLOCK_DAMAGE_MULTIPLIER = 0.2;
const BLOCK_KNOCKBACK_MULTIPLIER = 0.18;

/**
 * @typedef {{ x: number, y?: number, z?: number, attack?: boolean, specialAttack?: boolean,
 *   block?: boolean, dodge?: boolean, teleport?: boolean, dash?: boolean }} Intent
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
  constructor({ id, name, stats, position, facing = 1, gender = 'male', combatantId = id }) {
    this.id = id;
    this.combatantId = combatantId;
    this.name = name;
    this.gender = gender;
    this.stats = Object.freeze({ ...stats });
    this.spawn = { ...position };
    this.spawnFacing = facing;
    this.events = [];
    this.reset();
  }

  reset() {
    this.position = { ...this.spawn, z: this.spawn.z ?? 0 };
    this.#clampAltitude();
    this.facing = this.spawnFacing;
    this.health = this.stats.maxHealth;
    this.state = FighterState.IDLE;
    this.stateTimeMs = 0;
    this.elapsedMs = 0;
    this.velocityX = 0;
    this.hasHitThisAttack = false;
    this.invulnerableMs = 0;
    this.teleportCooldownMs = 0;
    this.dashCooldownMs = 0;
    this.dashVector = { x: 0, y: 0 };
    this.dodgeCooldownMs = 0;
    this.dodgeVector = { x: 0, y: 0 };
    this.specialAttackCooldownMs = 0;
    this.lastHitBlocked = false;
    this.teleportTarget = null;
    this.teleportMoved = false;
    this.powerUps = {
      [PICKUP_TYPES.FURY]: 0,
      [PICKUP_TYPES.HASTE]: 0,
      [PICKUP_TYPES.SHIELD]: 0,
    };
    this.lastDamageTaken = 0;
    this.events.length = 0;
  }

  // ── Consultas ────────────────────────────────────────────────────────────

  get maxHealth() {
    return this.stats.maxHealth;
  }

  get currentMoveSpeed() {
    return this.stats.moveSpeed * (this.powerUps[PICKUP_TYPES.HASTE] > 0 ? POWER_UPS[PICKUP_TYPES.HASTE].speedMultiplier : 1);
  }

  /** Altura máxima que conserva el cuerpo completo dentro del cielo visible. */
  get maxAltitude() {
    return Math.min(
      FLIGHT.maxAltitude,
      Math.max(0, this.position.y - BODY.height - FLIGHT.skyMargin - this.stats.hoverAmplitude),
    );
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

  get canDash() {
    return this.canAct && this.dashCooldownMs <= 0;
  }

  get canDodge() {
    return this.canAct && this.dodgeCooldownMs <= 0;
  }

  get isInvulnerable() {
    return (
      this.state === FighterState.KO ||
      this.state === FighterState.TELEPORT ||
      (this.state === FighterState.DODGE && this.stateTimeMs < DODGE.invulnerabilityMs) ||
      this.invulnerableMs > 0
    );
  }

  get hurtbox() {
    return {
      x: this.position.x - BODY.width / 2,
      y: this.position.y - BODY.height - this.position.z,
      w: BODY.width,
      h: BODY.height,
    };
  }

  /** Caja de ataque: solo existe durante la fase activa del hachazo. */
  get attackHitbox() {
    const isSpecial = this.state === FighterState.SPECIAL_ATTACK;
    if (this.state !== FighterState.ATTACK && !isSpecial) return null;
    const { windupMs, activeMs } = isSpecial ? TIMINGS.specialAttack : TIMINGS.attack;
    if (this.stateTimeMs < windupMs || this.stateTimeMs >= windupMs + activeMs) return null;
    const reach = this.stats.attackReach;
    const x =
      this.facing === 1
        ? this.position.x + BODY.width / 2 - 6
        : this.position.x - BODY.width / 2 + 6 - reach;
    return { x, y: this.position.y - BODY.height + 6 - this.position.z, w: reach, h: 56 };
  }

  /** Levitación pasiva en reposo; la altura de vuelo se controla por separado. */
  get hoverOffset() {
    const { hoverAmplitude, hoverSpeed } = this.stats;
    const phase = (this.elapsedMs / 1000) * hoverSpeed - Math.PI / 2;
    return ((Math.sin(phase) + 1) / 2) * hoverAmplitude;
  }

  /** Calcula el daño de un impacto con un valor aleatorio entre 1 y 5. */
  rollAttackDamage(randomValue = 0, special = false) {
    const normalized = Number.isFinite(randomValue)
      ? Math.min(0.999999, Math.max(0, randomValue))
      : 0;
    const baseDamage = 1 + Math.floor(normalized * this.stats.attackDamage);
    const furyActive = this.powerUps[PICKUP_TYPES.FURY] > 0;
    const furyMultiplier = furyActive ? POWER_UPS[PICKUP_TYPES.FURY].damageMultiplier : 1;
    const specialMultiplier = special ? 1.5 : 1;
    const maximum = special ? MAX_SPECIAL_DAMAGE : MAX_ATTACK_DAMAGE;
    return Math.min(maximum, Math.max(1, Math.round(baseDamage * furyMultiplier * specialMultiplier)));
  }

  // ── Comandos ─────────────────────────────────────────────────────────────

  startAttack() {
    if (!this.canAct) return false;
    this.hasHitThisAttack = false;
    this.#setState(FighterState.ATTACK);
    this.#emit('attack');
    return true;
  }

  startSpecialAttack() {
    if (!this.canAct || this.specialAttackCooldownMs > 0) return false;
    this.hasHitThisAttack = false;
    this.specialAttackCooldownMs = TIMINGS.specialAttack.cooldownMs;
    this.#setState(FighterState.SPECIAL_ATTACK);
    this.#emit('special-attack');
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

  /** Activa o renueva un potenciador y devuelve su duración. */
  applyPowerUp(type) {
    const definition = POWER_UPS[type];
    if (!definition || !this.isAlive) return 0;
    this.powerUps[type] = definition.durationMs;
    return definition.durationMs;
  }

  /**
   * @param {{ damage: number, fromDirection: 1 | -1 }} hit
   * @returns {boolean} true si el golpe entró
   */
  takeHit({ damage, fromDirection }) {
    if (this.isInvulnerable) return false;
    const shieldActive = this.powerUps[PICKUP_TYPES.SHIELD] > 0;
    const guarding = this.state === FighterState.BLOCK
      && this.position.z === 0
      && this.facing === -fromDirection;
    const shieldDamage = shieldActive
      ? Math.max(1, Math.round(damage * POWER_UPS[PICKUP_TYPES.SHIELD].damageMultiplier))
      : damage;

    this.lastHitBlocked = guarding;
    this.lastDamageTaken = guarding
      ? Math.max(1, Math.round(shieldDamage * BLOCK_DAMAGE_MULTIPLIER))
      : shieldDamage;
    if (guarding) {
      this.#emit('block', { blocked: Math.max(0, damage - this.lastDamageTaken) });
    } else if (shieldActive) {
      this.#emit('shield-block', { blocked: damage - this.lastDamageTaken });
    }

    this.health = Math.max(0, this.health - this.lastDamageTaken);
    this.velocityX = fromDirection * this.stats.knockback * (guarding ? BLOCK_KNOCKBACK_MULTIPLIER : 1);
    this.invulnerableMs = TIMINGS.hitInvulnerabilityMs;
    if (this.health === 0) {
      this.velocityX *= 1.5;
      this.#setState(FighterState.KO);
      this.#emit('ko');
    } else if (guarding) {
      this.#setState(FighterState.BLOCK_HIT);
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
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - deltaMs);
    this.dodgeCooldownMs = Math.max(0, this.dodgeCooldownMs - deltaMs);
    this.specialAttackCooldownMs = Math.max(0, this.specialAttackCooldownMs - deltaMs);
    this.#updatePowerUps(deltaMs);

    if ((this.state === FighterState.IDLE || this.state === FighterState.WALK)
      && intent.dodge && this.canDodge && !intent.attack && !intent.specialAttack && !intent.block) {
      this.#beginDodge(intent.x, intent.y);
    } else if ((this.state === FighterState.IDLE || this.state === FighterState.WALK)
      && intent.dash && this.canDash && !intent.attack && !intent.specialAttack && !intent.block) {
      this.#beginDash(intent.x, intent.y);
    }

    switch (this.state) {
      case FighterState.IDLE:
      case FighterState.WALK:
        this.#updateFree(intent, seconds);
        break;
      case FighterState.DASH:
        this.#updateDash(seconds);
        break;
      case FighterState.DODGE:
        this.#updateDodge(seconds);
        break;
      case FighterState.BLOCK:
        if (!intent.block) {
          this.#setState(FighterState.IDLE);
          this.#updateFree(intent, seconds);
        }
        break;
      case FighterState.BLOCK_HIT:
        this.#applyKnockback(seconds);
        if (this.stateTimeMs >= TIMINGS.blockHitMs) {
          this.#setState(intent.block && this.position.z === 0 ? FighterState.BLOCK : FighterState.IDLE);
        }
        break;
      case FighterState.ATTACK:
        this.#updateAttack(seconds);
        break;
      case FighterState.SPECIAL_ATTACK:
        this.#updateSpecialAttack(seconds);
        break;
      case FighterState.LAND:
        if (this.stateTimeMs >= TIMINGS.landMs) this.#setState(FighterState.IDLE);
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

  /** Mantiene al luchador dentro de los límites horizontales y de profundidad. */
  clampTo({ minX, maxX, minY = this.spawn.y, maxY = this.spawn.y }) {
    this.position.x = Math.min(maxX, Math.max(minX, this.position.x));
    // position.y es el carril apoyado en el suelo: jamás puede sobrepasar maxY.
    this.position.y = Math.min(maxY, Math.max(minY, this.position.y));
    this.#clampAltitude();
  }

  /** Entrega y vacía los eventos pendientes (para efectos visuales y sonido). */
  drainEvents() {
    const pending = this.events;
    this.events = [];
    return pending;
  }

  // ── Internos ─────────────────────────────────────────────────────────────

  #clampAltitude() {
    // z=0 es el suelo. El techo se adapta a la profundidad para que la cabeza
    // del sprite permanezca dentro del lienzo incluso en el carril más lejano.
    this.position.z = Math.max(0, Math.min(this.maxAltitude, this.position.z ?? 0));
  }

  #updatePowerUps(deltaMs) {
    for (const [type, remainingMs] of Object.entries(this.powerUps)) {
      if (remainingMs <= 0) continue;
      this.powerUps[type] = Math.max(0, remainingMs - deltaMs);
      if (this.powerUps[type] === 0) this.#emit('powerup-expired', { powerUpType: type });
    }
  }

  #updateFree(intent, seconds) {
    if (intent.block && this.position.z === 0) {
      this.velocityX = 0;
      this.#setState(FighterState.BLOCK);
      return;
    }
    if (intent.specialAttack && this.startSpecialAttack()) return;
    if (intent.attack && this.startAttack()) return;

    const moveX = Number.isFinite(intent.x) ? intent.x : 0;
    const moveY = Number.isFinite(intent.y) ? intent.y : 0;
    const moveZ = Number.isFinite(intent.z) ? intent.z : 0;
    const groundMagnitude = Math.hypot(moveX, moveY) || 1;
    const movingOnGround = moveX !== 0 || moveY !== 0;
    // X/Y pertenecen al plano transitable del escenario; Z solo modifica la altura.
    if (moveX !== 0) this.facing = Math.sign(moveX);
    if (movingOnGround) {
      this.position.x += (moveX / groundMagnitude) * this.currentMoveSpeed * seconds;
      this.position.y += (moveY / groundMagnitude) * this.currentMoveSpeed * seconds;
    }
    const previousAltitude = this.position.z;
    if (moveZ !== 0) {
      this.position.z += moveZ * this.currentMoveSpeed * seconds;
      this.#clampAltitude();
    }
    if (previousAltitude > 0 && this.position.z === 0) {
      this.#emit('land', { groundY: this.position.y, impact: previousAltitude });
      this.#setState(FighterState.LAND);
      return;
    }
    this.#setState(movingOnGround ? FighterState.WALK : FighterState.IDLE);
  }

  #beginDodge(moveX = 0, moveY = 0) {
    const magnitude = Math.hypot(moveX, moveY);
    const direction = magnitude > 0
      ? { x: moveX / magnitude, y: moveY / magnitude }
      : { x: -this.facing, y: 0 };
    this.dodgeVector = direction;
    this.dodgeCooldownMs = DODGE.cooldownMs;
    if (direction.x !== 0) this.facing = Math.sign(direction.x);
    this.#setState(FighterState.DODGE);
    this.#emit('dodge-start', { directionX: direction.x, directionY: direction.y });
  }

  #updateDodge(seconds) {
    const remainingMs = Math.max(0, DODGE.durationMs - this.stateTimeMs);
    const activeSeconds = Math.min(seconds, remainingMs / 1000);
    const speed = this.currentMoveSpeed * DODGE.speedMultiplier;
    this.position.x += this.dodgeVector.x * speed * activeSeconds;
    this.position.y += this.dodgeVector.y * speed * activeSeconds;
    if (this.stateTimeMs >= DODGE.durationMs) this.#setState(FighterState.IDLE);
  }

  #beginDash(moveX = 0, moveY = 0) {
    const magnitude = Math.hypot(moveX, moveY);
    const direction = magnitude > 0 ? { x: moveX / magnitude, y: moveY / magnitude } : { x: this.facing, y: 0 };
    this.dashVector = direction;
    this.dashCooldownMs = DASH.cooldownMs;
    if (direction.x !== 0) this.facing = Math.sign(direction.x);
    this.#setState(FighterState.DASH);
    this.#emit('dash-start', { directionX: direction.x, directionY: direction.y, groundY: this.position.y });
  }

  #updateDash(seconds) {
    const remainingMs = Math.max(0, DASH.durationMs - this.stateTimeMs);
    const activeSeconds = Math.min(seconds, remainingMs / 1000);
    const speed = this.currentMoveSpeed * DASH.speedMultiplier;
    this.position.x += this.dashVector.x * speed * activeSeconds;
    this.position.y += this.dashVector.y * speed * activeSeconds;
    if (this.stateTimeMs >= DASH.durationMs) this.#setState(FighterState.IDLE);
  }

  #updateAttack(seconds) {
    const { windupMs, activeMs } = TIMINGS.attack;
    if (this.stateTimeMs >= attackTotalMs()) {
      this.#setState(FighterState.IDLE);
      return;
    }
    const inActive = this.stateTimeMs >= windupMs && this.stateTimeMs < windupMs + activeMs;
    if (inActive) this.position.x += this.facing * this.currentMoveSpeed * ATTACK_LUNGE * seconds;
  }

  #updateSpecialAttack(seconds) {
    const { windupMs, activeMs } = TIMINGS.specialAttack;
    if (this.stateTimeMs >= specialAttackTotalMs()) {
      this.#setState(FighterState.IDLE);
      return;
    }
    const inActive = this.stateTimeMs >= windupMs && this.stateTimeMs < windupMs + activeMs;
    if (inActive) this.position.x += this.facing * this.currentMoveSpeed * 1.25 * seconds;
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
    if (next !== FighterState.DASH) this.dashVector = { x: 0, y: 0 };
    if (next !== FighterState.DODGE) this.dodgeVector = { x: 0, y: 0 };
  }

  #emit(type, extra = {}) {
    this.events.push({
      type,
      id: this.combatantId,
      characterId: this.id,
      x: this.position.x,
      y: this.position.y - BODY.height / 2 - this.position.z,
      groundY: this.position.y,
      facing: this.facing,
      ...extra,
    });
  }
}
