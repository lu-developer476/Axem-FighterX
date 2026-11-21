import Phaser from 'phaser';
import { KEYMAPS } from './keyMaps.js';

/**
 * Adaptador de teclado de Phaser que implementa InputPort.
 * X/Y recorren el terreno; Z es exclusivamente la altura de vuelo.
 */
export class PhaserKeyboardInput {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ left: string, right: string, forward: string, backward: string, ascend: string, descend: string, attack: string, teleport: string }} keyNames
   */
  constructor(scene, keyNames) {
    this.keys = scene.input.keyboard.addKeys({
      left: keyNames.left,
      right: keyNames.right,
      forward: keyNames.forward,
      backward: keyNames.backward,
      ascend: keyNames.ascend,
      descend: keyNames.descend,
      attack: keyNames.attack,
      teleport: keyNames.teleport,
      dash: keyNames.dash,
      block: keyNames.block,
      dodge: keyNames.dodge,
      specialAttack: keyNames.specialAttack,
    });
  }

  /** @returns {import('../../application/ports/InputPort.js').PlayerIntent} */
  readIntent() {
    const { left, right, forward, backward, attack, teleport, dash, block, dodge, specialAttack, ascend, descend } = this.keys;
    return {
      x: Number(right.isDown) - Number(left.isDown),
      y: Number(backward.isDown) - Number(forward.isDown),
      z: Number(ascend.isDown) - Number(descend.isDown),
      attack: Phaser.Input.Keyboard.JustDown(attack),
      specialAttack: Phaser.Input.Keyboard.JustDown(specialAttack),
      block: block.isDown,
      dodge: Phaser.Input.Keyboard.JustDown(dodge),
      teleport: Phaser.Input.Keyboard.JustDown(teleport),
      dash: Phaser.Input.Keyboard.JustDown(dash),
    };
  }
}

export { KEYMAPS };
