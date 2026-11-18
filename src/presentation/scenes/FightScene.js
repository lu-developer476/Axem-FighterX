import Phaser from 'phaser';
import { STAGE_BOUNDS, GAME_WIDTH } from '../../config/gameConfig.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { createFighter } from '../../domain/rangers/createFighter.js';
import { UpdateFighter } from '../../application/useCases/UpdateFighter.js';
import { PhaserKeyboardInput, KEYMAPS } from '../../infrastructure/input/PhaserKeyboardInput.js';
import { FighterView } from '../views/FighterView.js';

export class FightScene extends Phaser.Scene {
  constructor() {
    super('FightScene');
  }

  create() {
    this.updateFighter = new UpdateFighter(STAGE_BOUNDS);

    this.players = [
      {
        fighter: createFighter(RANGER_IDS.VIOLET, { x: GAME_WIDTH * 0.3, y: 220 }),
        input: new PhaserKeyboardInput(this, KEYMAPS.PLAYER_1),
      },
      {
        fighter: createFighter(RANGER_IDS.ORANGE, { x: GAME_WIDTH * 0.7, y: 220 }),
        input: new PhaserKeyboardInput(this, KEYMAPS.PLAYER_2),
      },
    ];
    this.players[1].fighter.facing = -1;

    this.views = this.players.map(({ fighter }) => new FighterView(this, fighter));

    this.add
      .text(8, 8, 'J1: WASD   J2: Flechas', { fontFamily: 'monospace', fontSize: '10px', color: '#c8bfe7' })
      .setDepth(10_000);
  }

  update(_time, delta) {
    for (const { fighter, input } of this.players) {
      this.updateFighter.execute(fighter, input, delta);
    }
    for (const view of this.views) view.sync();
  }
}
