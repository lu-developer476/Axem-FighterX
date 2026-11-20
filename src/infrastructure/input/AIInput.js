/**
 * Entrada controlada por IA. Persigue al rival horizontalmente, cambia de
 * altura para mantener el combate aéreo y ataca cuando las cajas pueden cruzarse.
 */
export class AIInput {
  constructor(fighter, opponent, { now = () => 0, phase = 0 } = {}) {
    this.fighter = fighter;
    this.opponent = opponent;
    this.now = now;
    this.phase = phase;
    this.nextAttackAt = 0;
    this.nextTeleportAt = 0;
  }

  readIntent() {
    const fighter = this.fighter;
    const opponent = this.opponent;
    if (!fighter.isAlive || !opponent.isAlive) {
      return { x: 0, y: 0, z: 0, attack: false, teleport: false };
    }

    const now = this.now();
    const dx = opponent.position.x - fighter.position.x;
    const distanceX = Math.abs(dx);
    const targetAltitude = opponent.position.z > 18
      ? opponent.position.z
      : 36 + Math.sin(now / 1750 + this.phase) * 18;
    const dz = targetAltitude - (fighter.position.z ?? 0);

    const x = distanceX > fighter.stats.attackReach + 12 ? Math.sign(dx) : 0;
    const dy = opponent.position.y - fighter.position.y;
    const y = Math.abs(dy) > 8 ? Math.sign(dy) : 0;
    const z = Math.abs(dz) > 9 ? Math.sign(dz) : 0;
    const aligned = distanceX <= fighter.stats.attackReach + 8
      && Math.abs(opponent.position.z - fighter.position.z) <= 42;
    const attack = aligned && fighter.canAct && now >= this.nextAttackAt;
    if (attack) this.nextAttackAt = now + 640 + Math.abs(this.phase) * 35;

    const teleport = distanceX > 220
      && fighter.canTeleport
      && now >= this.nextTeleportAt;
    if (teleport) this.nextTeleportAt = now + 1800;

    return { x, y, z, attack, teleport };
  }
}
