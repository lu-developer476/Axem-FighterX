/**
 * Puerto de entrada: la aplicación pide la intención del jugador sin saber
 * si viene de teclado, gamepad o pantalla táctil.
 *
 * `x`/`y` recorren el terreno y `z` controla únicamente la altura; `attack`, `teleport` y `dash` son pulsaciones (true solo en el frame en que se presionan).
 *
 * @typedef {{ x: -1 | 0 | 1, y: -1 | 0 | 1, z: -1 | 0 | 1, attack: boolean, teleport: boolean, dash?: boolean }} PlayerIntent
 *
 * @typedef {object} InputPort
 * @property {() => PlayerIntent} readIntent
 */
export {};
