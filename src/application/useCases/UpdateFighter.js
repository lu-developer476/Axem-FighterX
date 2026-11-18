/**
 * Caso de uso: avanzar un luchador un frame según la entrada del jugador,
 * respetando los límites del escenario.
 */
export class UpdateFighter {
  /**
   * @param {{ minX: number, maxX: number, minY: number, maxY: number }} bounds
   */
  constructor(bounds) {
    this.bounds = bounds;
  }

  /**
   * @param {import('../../domain/entities/Fighter.js').Fighter} fighter
   * @param {import('../ports/InputPort.js').InputPort} input
   * @param {number} deltaMs
   */
  execute(fighter, input, deltaMs) {
    fighter.move(input.readMoveIntent(), deltaMs);
    fighter.clampTo(this.bounds);
  }
}
