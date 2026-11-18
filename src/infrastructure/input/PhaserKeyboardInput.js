/**
 * Adaptador de teclado de Phaser que implementa InputPort.
 */
export class PhaserKeyboardInput {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ left: string, right: string, up: string, down: string }} keyNames
   */
  constructor(scene, keyNames) {
    this.keys = scene.input.keyboard.addKeys({
      left: keyNames.left,
      right: keyNames.right,
      up: keyNames.up,
      down: keyNames.down,
    });
  }

  readMoveIntent() {
    const { left, right, up, down } = this.keys;
    return {
      x: Number(right.isDown) - Number(left.isDown),
      y: Number(down.isDown) - Number(up.isDown),
    };
  }
}

export const KEYMAPS = Object.freeze({
  PLAYER_1: { left: 'A', right: 'D', up: 'W', down: 'S' },
  PLAYER_2: { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN' },
});
