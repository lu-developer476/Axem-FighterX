import { ARENA, FLIGHT } from '../../domain/arena/arena.js';
import { FighterState, TIMINGS } from '../../domain/entities/FighterState.js';
import { BODY } from '../../domain/entities/Fighter.js';
import { PICKUP_TYPES } from '../../domain/entities/PowerUpPickup.js';
import { rectsOverlap } from '../../domain/geometry/rect.js';

const PROFILES = Object.freeze([
  Object.freeze({
    attackCooldownMs: 650,
    targetAltitude: 28,
    altitudeWave: 7,
    predictionLeadMs: 25,
    teleportDistance: 300,
    teleportCooldownMs: 2100,
    pickupRadius: 160,
    laneDeadZone: 10,
    dodgeCooldownMs: 1200,
    teleportDodgeRange: 88,
    punishWindowMs: 200,
  }),
  Object.freeze({
    attackCooldownMs: 590,
    targetAltitude: 32,
    altitudeWave: 8,
    predictionLeadMs: 50,
    teleportDistance: 260,
    teleportCooldownMs: 1900,
    pickupRadius: 190,
    laneDeadZone: 8,
    dodgeCooldownMs: 950,
    teleportDodgeRange: 100,
    punishWindowMs: 250,
  }),
  Object.freeze({
    attackCooldownMs: 530,
    targetAltitude: 36,
    altitudeWave: 9,
    predictionLeadMs: 80,
    teleportDistance: 230,
    teleportCooldownMs: 1750,
    pickupRadius: 220,
    laneDeadZone: 7,
    dodgeCooldownMs: 780,
    teleportDodgeRange: 120,
    punishWindowMs: 290,
  }),
  Object.freeze({
    attackCooldownMs: 470,
    targetAltitude: 40,
    altitudeWave: 10,
    predictionLeadMs: 110,
    teleportDistance: 205,
    teleportCooldownMs: 1600,
    pickupRadius: 240,
    laneDeadZone: 6,
    dodgeCooldownMs: 650,
    teleportDodgeRange: 140,
    punishWindowMs: 330,
  }),
  Object.freeze({
    attackCooldownMs: 420,
    targetAltitude: 44,
    altitudeWave: 11,
    predictionLeadMs: 140,
    teleportDistance: 180,
    teleportCooldownMs: 1450,
    pickupRadius: 260,
    laneDeadZone: 5,
    dodgeCooldownMs: 500,
    teleportDodgeRange: 165,
    punishWindowMs: 380,
  }),
]);

const NEUTRAL = Object.freeze({ x: 0, y: 0, z: 0, attack: false, teleport: false });
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const sign = (value) => Math.sign(value) || 0;

/**
 * IA táctica: mide al rival, anticipa su desplazamiento, respeta las hitboxes,
 * esquiva ataques, recoge objetos útiles y aumenta su nivel entre rondas.
 */
export class AIInput {
  constructor(fighter, opponent, {
    now = () => 0,
    phase = 0,
    arena = ARENA,
    getPickup = () => null,
    difficulty = 1,
  } = {}) {
    this.fighter = fighter;
    this.opponent = opponent;
    this.now = now;
    this.phase = phase;
    this.arena = arena;
    this.getPickup = getPickup;
    this.nextAttackAt = 0;
    this.nextTeleportAt = 0;
    this.nextDodgeAt = 0;
    this.lastOpponentState = null;
    this.lastOpponentAttackStartedAt = null;
    this.lastOpponentAttackEndedAt = Number.NEGATIVE_INFINITY;
    this.opponentAttackIntervalMs = null;
    this.lastOpponentSampleAt = null;
    this.lastOpponentPosition = null;
    this.opponentVelocity = { x: 0, y: 0 };
    this.setDifficulty(difficulty);
  }

  get difficulty() {
    return this.level;
  }

  /** La serie eleva el nivel de la IA sin reiniciar su memoria del rival. */
  setDifficulty(level) {
    this.level = clamp(Math.floor(Number(level) || 1), 1, PROFILES.length);
    this.profile = PROFILES[this.level - 1];
    return this.level;
  }

  readIntent() {
    const fighter = this.fighter;
    const opponent = this.opponent;
    if (!fighter.isAlive || !opponent.isAlive) return { ...NEUTRAL };

    const suppliedNow = this.now();
    const now = Number.isFinite(suppliedNow) ? suppliedNow : 0;
    this.#observeOpponent(now);

    const dx = opponent.position.x - fighter.position.x;
    const distanceX = Math.abs(dx);
    const dy = opponent.position.y - fighter.position.y;

    if (now >= this.nextDodgeAt && this.#isAttackThreatening()) {
      const evasive = this.#dodge(now, dx, dy);
      if (evasive) return evasive;
    }

    const pickupIntent = this.#pickupIntent();
    if (pickupIntent) return pickupIntent;

    const predicted = this.#predictOpponent();
    const predictedDx = predicted.x - fighter.position.x;
    const predictedDy = predicted.y - fighter.position.y;
    const reach = fighter.stats.attackReach;
    const laneAligned = Math.abs(dy) <= FLIGHT.attackDepthTolerance;
    const facingOpponent = fighter.facing === sign(dx);
    const attackProbe = this.#attackBox(fighter, opponent);
    const canConnect = laneAligned
      && facingOpponent
      && rectsOverlap(attackProbe, opponent.hurtbox)
      && !opponent.isInvulnerable;
    const punishWindow = now - this.lastOpponentAttackEndedAt <= this.profile.punishWindowMs;
    const learnedAggression = this.opponentAttackIntervalMs === null
      ? 0
      : clamp((1000 - this.opponentAttackIntervalMs) / 1000, 0, 0.15);
    const adaptiveBaseCooldown = this.profile.attackCooldownMs * (1 - learnedAggression);
    const attackCooldown = punishWindow
      ? Math.max(280, adaptiveBaseCooldown * 0.62)
      : adaptiveBaseCooldown;
    const attack = canConnect && fighter.canAct && now >= this.nextAttackAt;

    if (attack) this.nextAttackAt = now + attackCooldown;

    let x = Math.abs(predictedDx) > reach + 18 ? sign(predictedDx) : 0;
    if (Math.abs(dx) <= reach + 18 && !facingOpponent) x = sign(dx);

    const y = Math.abs(predictedDy) > this.profile.laneDeadZone ? sign(predictedDy) : 0;
    const maxAltitude = Number.isFinite(fighter.maxAltitude) ? fighter.maxAltitude : FLIGHT.maxAltitude;
    const oscillation = Math.sin(now / 1750 + this.phase) * this.profile.altitudeWave;
    const targetAltitude = clamp(
      Math.max(opponent.position.z ?? 0, this.profile.targetAltitude + oscillation),
      0,
      maxAltitude,
    );
    const altitudeDelta = targetAltitude - (fighter.position.z ?? 0);
    const z = Math.abs(altitudeDelta) > 7 ? sign(altitudeDelta) : 0;

    const teleport = distanceX > this.profile.teleportDistance
      && fighter.canTeleport
      && now >= this.nextTeleportAt;
    if (teleport) this.nextTeleportAt = now + this.profile.teleportCooldownMs;

    return { x, y, z, attack, teleport };
  }

  #observeOpponent(now) {
    const opponent = this.opponent;
    const position = opponent.position;
    if (this.lastOpponentPosition && this.lastOpponentSampleAt !== null) {
      const elapsed = now - this.lastOpponentSampleAt;
      if (elapsed > 0 && elapsed <= 500) {
        const seconds = elapsed / 1000;
        this.opponentVelocity = {
          x: clamp((position.x - this.lastOpponentPosition.x) / seconds, -280, 280),
          y: clamp((position.y - this.lastOpponentPosition.y) / seconds, -180, 180),
        };
      } else {
        this.opponentVelocity = { x: 0, y: 0 };
      }
    }

    const state = opponent.state ?? null;
    if (state === FighterState.ATTACK && this.lastOpponentState !== FighterState.ATTACK) {
      if (this.lastOpponentAttackStartedAt !== null) {
        const interval = now - this.lastOpponentAttackStartedAt;
        if (interval >= 180 && interval <= 5000) {
          this.opponentAttackIntervalMs = this.opponentAttackIntervalMs === null
            ? interval
            : this.opponentAttackIntervalMs * 0.65 + interval * 0.35;
        }
      }
      this.lastOpponentAttackStartedAt = now;
    }
    if (this.lastOpponentState === FighterState.ATTACK && state !== FighterState.ATTACK) {
      this.lastOpponentAttackEndedAt = now;
    }

    this.lastOpponentState = state;
    this.lastOpponentPosition = { x: position.x, y: position.y };
    this.lastOpponentSampleAt = now;
  }

  #predictOpponent() {
    const lead = this.profile.predictionLeadMs / 1000;
    return {
      x: this.opponent.position.x + this.opponentVelocity.x * lead,
      y: clamp(
        this.opponent.position.y + this.opponentVelocity.y * lead,
        this.arena.minY,
        this.arena.maxY,
      ),
    };
  }

  #attackBox(attacker, target) {
    const direction = attacker.facing || sign(target.position.x - attacker.position.x) || 1;
    const reach = attacker.stats.attackReach;
    return {
      x: direction === 1
        ? attacker.position.x + BODY.width / 2 - 6
        : attacker.position.x - BODY.width / 2 + 6 - reach,
      y: attacker.position.y - BODY.height + 6 - (attacker.position.z ?? 0),
      w: reach,
      h: 56,
    };
  }

  #isAttackThreatening() {
    const opponent = this.opponent;
    if (opponent.state !== FighterState.ATTACK) return false;
    const attackEnd = TIMINGS.attack.windupMs + TIMINGS.attack.activeMs + 24;
    if ((opponent.stateTimeMs ?? Number.POSITIVE_INFINITY) > attackEnd) return false;
    if (Math.abs(opponent.position.y - this.fighter.position.y) > FLIGHT.attackDepthTolerance + 3) return false;

    const facing = opponent.facing || sign(this.fighter.position.x - opponent.position.x);
    if (facing !== sign(this.fighter.position.x - opponent.position.x)) return false;
    return rectsOverlap(this.#attackBox(opponent, this.fighter), this.fighter.hurtbox);
  }

  #dodge(now, dx, dy) {
    const fighter = this.fighter;
    const distanceX = Math.abs(dx);
    if (
      this.level >= 3
      && distanceX <= this.profile.teleportDodgeRange
      && fighter.canTeleport
      && now >= this.nextTeleportAt
    ) {
      this.nextTeleportAt = now + this.profile.teleportCooldownMs;
      this.nextDodgeAt = now + this.profile.dodgeCooldownMs;
      return { x: 0, y: 0, z: 0, attack: false, teleport: true };
    }

    this.nextDodgeAt = now + this.profile.dodgeCooldownMs;
    const depthRange = this.arena.maxY - this.arena.minY;
    if (depthRange >= FLIGHT.attackDepthTolerance * 2 + 6) {
      let direction = sign(-dy) || (this.phase >= Math.PI ? 1 : -1);
      const nextLane = fighter.position.y + direction * (FLIGHT.attackDepthTolerance + 8);
      if (nextLane < this.arena.minY || nextLane > this.arena.maxY) direction *= -1;
      return { x: 0, y: direction, z: 0, attack: false, teleport: false };
    }

    const maxAltitude = Number.isFinite(fighter.maxAltitude) ? fighter.maxAltitude : FLIGHT.maxAltitude;
    if (fighter.position.z < maxAltitude - 10) {
      return { x: 0, y: 0, z: 1, attack: false, teleport: false };
    }
    return {
      x: sign(-dx),
      y: 0,
      z: fighter.position.z > this.opponent.position.z + 18 ? -1 : 0,
      attack: false,
      teleport: false,
    };
  }

  #pickupIntent() {
    const pickup = this.getPickup?.();
    const fighter = this.fighter;
    if (!pickup || pickup.remainingMs <= 0 || !this.#pickupIsUseful(pickup)) return null;

    const dx = pickup.x - fighter.position.x;
    if (Math.abs(dx) > this.profile.pickupRadius) return null;

    const targetLane = clamp(
      fighter.spawn?.y ?? this.arena.groundY ?? ARENA.groundY,
      this.arena.minY,
      this.arena.maxY,
    );
    const dy = targetLane - fighter.position.y;
    return {
      x: Math.abs(dx) > 10 ? sign(dx) : 0,
      y: Math.abs(dy) > 4 ? sign(dy) : 0,
      z: fighter.position.z > 8 ? -1 : 0,
      attack: false,
      teleport: false,
    };
  }

  #pickupIsUseful(pickup) {
    const fighter = this.fighter;
    if (pickup.type === PICKUP_TYPES.HEALTH) {
      return fighter.health <= fighter.maxHealth - Math.max(8, pickup.amount * 0.5);
    }
    const remaining = fighter.powerUps?.[pickup.type] ?? 0;
    return remaining < 1800;
  }
}
