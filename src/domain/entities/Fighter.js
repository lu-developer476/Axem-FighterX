/**
 * Entidad de dominio. No conoce Phaser, el DOM ni el framework de render.
 */
export class Fighter {
  /**
   * @param {object} props
   * @param {string} props.id
   * @param {string} props.name
   * @param {{ moveSpeed: number, hoverAmplitude: number, hoverSpeed: number }} props.stats
   * @param {{ x: number, y: number }} props.position
   */
  constructor({ id, name, stats, position }) {
    this.id = id;
    this.name = name;
    this.stats = Object.freeze({ ...stats });
    this.position = { ...position };
    this.facing = 1; // 1 = derecha, -1 = izquierda
    this.elapsedMs = 0;
  }

  /**
   * Mueve al luchador según una intención de dirección (-1, 0, 1 por eje).
   * @param {{ x: number, y: number }} intent
   * @param {number} deltaMs
   */
  move(intent, deltaMs) {
    const seconds = deltaMs / 1000;
    this.position.x += intent.x * this.stats.moveSpeed * seconds;
    this.position.y += intent.y * this.stats.moveSpeed * seconds;
    if (intent.x !== 0) this.facing = Math.sign(intent.x);
    this.elapsedMs += deltaMs;
  }

  /** Desplazamiento vertical de levitación, en píxeles. */
  get hoverOffset() {
    const { hoverAmplitude, hoverSpeed } = this.stats;
    return Math.sin((this.elapsedMs / 1000) * hoverSpeed) * hoverAmplitude;
  }

  /** Mantiene al luchador dentro de un rectángulo. */
  clampTo({ minX, maxX, minY, maxY }) {
    this.position.x = Math.min(maxX, Math.max(minX, this.position.x));
    this.position.y = Math.min(maxY, Math.max(minY, this.position.y));
  }
}
