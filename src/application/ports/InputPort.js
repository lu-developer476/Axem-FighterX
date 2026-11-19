/**
 * Puerto de entrada: la aplicación pide la intención del jugador sin saber
 * si viene de teclado, gamepad o pantalla táctil.
 *
 * `attack` y `teleport` son pulsaciones (true solo en el frame en que se presionan).
 *
 * @typedef {{ x: -1 | 0 | 1, y: -1 | 0 | 1, attack: boolean, teleport: boolean }} PlayerIntent
 *
 * @typedef {object} InputPort
 * @property {() => PlayerIntent} readIntent
 */
export {};
