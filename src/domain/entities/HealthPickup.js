import { PICKUP, ARENA } from '../arena/arena.js';

/** Corazón de curación que aparece en el escenario. */
export class HealthPickup {
  constructor(x) {
    this.x = x;
    this.ageMs = 0;
    this.amount = PICKUP.healAmount;
  }

  get remainingMs() {
    return PICKUP.lifetimeMs - this.ageMs;
  }

  get box() {
    return {
      x: this.x - PICKUP.width / 2,
      y: ARENA.groundY - PICKUP.height,
      w: PICKUP.width,
      h: PICKUP.height,
    };
  }
}
