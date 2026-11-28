import { ARENA, PICKUP } from '../arena/arena.js';

export const PICKUP_TYPES = Object.freeze({
  HEALTH: 'health',
  FURY: 'fury',
  HASTE: 'haste',
  SHIELD: 'shield',
});

export const POWER_UPS = Object.freeze({
  [PICKUP_TYPES.FURY]: Object.freeze({
    label: 'FURIA',
    durationMs: 6500,
    damageMultiplier: 1.5,
    color: 0xffa64d,
  }),
  [PICKUP_TYPES.HASTE]: Object.freeze({
    label: 'RAPIDEZ',
    durationMs: 6500,
    speedMultiplier: 1.4,
    color: 0x70ddff,
  }),
  [PICKUP_TYPES.SHIELD]: Object.freeze({
    label: 'ESCUDO',
    durationMs: 6500,
    damageMultiplier: 0.5,
    color: 0x9da9ff,
  }),
});

export const PICKUP_TYPE_LIST = Object.freeze(Object.values(PICKUP_TYPES));

/** Objeto temporal del escenario: curación o potenciador de combate. */
export class PowerUpPickup {
  constructor(x, type = PICKUP_TYPES.HEALTH) {
    if (!PICKUP_TYPE_LIST.includes(type)) {
      throw new Error(`Tipo de objeto desconocido: ${type}`);
    }
    this.x = x;
    this.type = type;
    this.ageMs = 0;
    this.amount = type === PICKUP_TYPES.HEALTH ? PICKUP.healAmount : 0;
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
