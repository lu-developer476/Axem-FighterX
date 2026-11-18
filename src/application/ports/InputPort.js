/**
 * Puerto de entrada: la aplicación pide la intención del jugador sin saber
 * si viene de teclado, gamepad o pantalla táctil.
 *
 * @typedef {{ x: -1 | 0 | 1, y: -1 | 0 | 1 }} MoveIntent
 *
 * @typedef {object} InputPort
 * @property {() => MoveIntent} readMoveIntent
 */
export {};
