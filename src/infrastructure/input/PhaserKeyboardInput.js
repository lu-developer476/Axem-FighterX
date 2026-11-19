import Phaser from 'phaser';
import { KEYMAPS } from './keyMaps.js';

/**
 * Adaptador de teclado de Phaser que implementa InputPort.
 * Cada luchador se mueve horizontalmente y vuela en el eje vertical.
 */
export class PhaserKeyboardInput {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ left: string, right: string, ascend: string, descend: string, attack: string, teleport: string }} keyNames
   */
  constructor(scene, keyNames) {
    this.keys = scene.input.keyboard.addKeys({
      left: keyNames.left,
      right: keyNames.right,
      ascend: keyNames.ascend,
      descend: keyNames.descend,
      attack: keyNames.attack,
      teleport: keyNames.teleport,
    });
  }

  /** @returns {import('../../application/ports/InputPort.js').PlayerIntent} */
  readIntent() {
    const { left, right, attack, teleport, ascend, descend } = this.keys;
    return {
      x: Number(right.isDown) - Number(left.isDown),
      y: 0,
      z: Number(ascend.isDown) - Number(descend.isDown),
      attack: Phaser.Input.Keyboard.JustDown(attack),
      teleport: Phaser.Input.Keyboard.JustDown(teleport),
    };
  }
}

export { KEYMAPS };
