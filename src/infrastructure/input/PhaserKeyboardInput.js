import Phaser from 'phaser';

/**
 * Adaptador de teclado de Phaser que implementa InputPort.
 */
export class PhaserKeyboardInput {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ left: string, right: string, up: string, down: string, attack: string, teleport: string }} keyNames
   */
  constructor(scene, keyNames) {
    this.keys = scene.input.keyboard.addKeys({
      left: keyNames.left,
      right: keyNames.right,
      up: keyNames.up,
      down: keyNames.down,
      attack: keyNames.attack,
      teleport: keyNames.teleport,
    });
  }

  /** @returns {import('../../application/ports/InputPort.js').PlayerIntent} */
  readIntent() {
    const { left, right, up, down, attack, teleport } = this.keys;
    return {
      x: Number(right.isDown) - Number(left.isDown),
      y: Number(down.isDown) - Number(up.isDown),
      attack: Phaser.Input.Keyboard.JustDown(attack),
      teleport: Phaser.Input.Keyboard.JustDown(teleport),
    };
  }
}

export const KEYMAPS = Object.freeze({
  PLAYER_1: { left: 'A', right: 'D', up: 'W', down: 'S', attack: 'F', teleport: 'G' },
  PLAYER_2: { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', attack: 'L', teleport: 'K' },
});
