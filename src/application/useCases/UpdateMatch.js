/**
 * Caso de uso: avanza el combate un frame leyendo la entrada de cada jugador.
 * Devuelve los eventos de dominio generados (golpes, KO, curaciones...).
 */
export class UpdateMatch {
  /**
   * @param {object} deps
   * @param {import('../../domain/entities/Match.js').Match} deps.match
   * @param {import('../ports/InputPort.js').InputPort[]} deps.inputs una por luchador
   */
  constructor({ match, inputs }) {
    this.match = match;
    this.inputs = inputs;
  }

  execute(deltaMs) {
    const intents = this.inputs.map((input) => input.readIntent());
    return this.match.step(intents, deltaMs);
  }
}
