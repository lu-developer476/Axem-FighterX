import Phaser from 'phaser';
import { KEYMAPS } from './keyMaps.js';

/**
 * Adaptador de teclado de Phaser que implementa InputPort.
 * X/Y recorren el terreno; Z es exclusivamente la altura de vuelo.
 */
export class PhaserKeyboardInput {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ left: string, right: string, up: string, down: string, ascend: string, descend: string, attack: string, teleport: string }} keyNames
   */
  constructor(scene, keyNames) {
    this.keys = scene.input.keyboard.addKeys({
      left: keyNames.left,
      right: keyNames.right,
      up: keyNames.up,
      down: keyNames.down,
      ascend: keyNames.ascend,
      descend: keyNames.descend,
      attack: keyNames.attack,
      teleport: keyNames.teleport,
      dash: keyNames.dash,
      block: keyNames.block,
      dodge: keyNames.dodge,
      specialAttack: keyNames.specialAttack,
      levitate: keyNames.levitate,
      chargeKi: keyNames.chargeKi,
    });
  }

  /** @returns {import('../../application/ports/InputPort.js').PlayerIntent} */
  readIntent() {
    const { left, right, up, down, attack, teleport, dash, block, dodge, specialAttack, ascend, descend, levitate, chargeKi } = this.keys;
    return {
      x: Number(right.isDown) - Number(left.isDown),
      y: Number(down.isDown) - Number(up.isDown),
      z: Number(ascend.isDown) - Number(descend.isDown),
      attack: Phaser.Input.Keyboard.JustDown(attack),
      specialAttack: Phaser.Input.Keyboard.JustDown(specialAttack),
      block: block.isDown,
      dodge: Phaser.Input.Keyboard.JustDown(dodge),
      teleport: Phaser.Input.Keyboard.JustDown(teleport),
      dash: Phaser.Input.Keyboard.JustDown(dash),
      levitate: Phaser.Input.Keyboard.JustDown(levitate),
      chargeKi: chargeKi.isDown,
    };
  }
}

export { KEYMAPS };
