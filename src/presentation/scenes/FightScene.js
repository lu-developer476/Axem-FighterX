import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/gameConfig.js';
import { ARENA } from '../../domain/arena/arena.js';
import { createDefaultMatch } from '../../application/useCases/CreateMatch.js';
import { UpdateMatch } from '../../application/useCases/UpdateMatch.js';
import { KEYMAPS, PhaserKeyboardInput } from '../../infrastructure/input/PhaserKeyboardInput.js';
import { FighterView } from '../views/FighterView.js';
import { FxDirector } from '../views/FxDirector.js';
import { HudView } from '../views/HudView.js';
import { PickupView } from '../views/PickupView.js';
import { StageView } from '../views/StageView.js';

const CAMERA_FOLLOW_SPEED = 8;

export class FightScene extends Phaser.Scene {
  constructor() {
    super('FightScene');
  }

  create() {
    this.match = createDefaultMatch();
    this.updateMatch = new UpdateMatch({
      match: this.match,
      inputs: [
        new PhaserKeyboardInput(this, KEYMAPS.PLAYER_1),
        new PhaserKeyboardInput(this, KEYMAPS.PLAYER_2),
      ],
    });

    this.stage = new StageView(this);
    this.pickupView = new PickupView(this);
    this.views = this.match.fighters.map((fighter) => new FighterView(this, fighter));
    this.fx = new FxDirector(this);
    this.hud = new HudView(this, this.match.fighters);
    this.restartKey = this.input.keyboard.addKey('R');
    this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.cameras.main.setBounds(0, 0, ARENA.width, this.scale.height);
    this.hitStopMs = 0;
    this.#snapCamera();
  }

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
      this.scene.start('MenuScene');
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) this.#restart();

    let events = [];
    if (this.hitStopMs > 0) this.hitStopMs -= delta;
    else events = this.updateMatch.execute(delta);

    const { hitStopMs } = this.fx.handle(events);
    this.hitStopMs = Math.max(this.hitStopMs, hitStopMs);
    for (const event of events) {
      if (event.type === 'match-over') this.#showResult(event.winnerId);
    }

    this.fx.update(this.match.fighters, delta);
    this.views.forEach((view) => view.sync());
    this.pickupView.sync(this.match.pickup, time);
    this.#followFighters(delta);
    this.stage.update(time, this.cameras.main.scrollX);
    this.hud.update(delta);
  }

  #targetScrollX() {
    const [a, b] = this.match.fighters;
    const middle = (a.position.x + b.position.x) / 2;
    return Phaser.Math.Clamp(middle - GAME_WIDTH / 2, 0, ARENA.width - GAME_WIDTH);
  }

  #followFighters(delta) {
    const camera = this.cameras.main;
    const k = Math.min(1, (delta / 1000) * CAMERA_FOLLOW_SPEED);
    camera.scrollX = Math.round(camera.scrollX + (this.#targetScrollX() - camera.scrollX) * k);
  }

  #snapCamera() {
    this.cameras.main.scrollX = Math.round(this.#targetScrollX());
  }

  #showResult(winnerId) {
    const winner = this.match.fighters.find((fighter) => fighter.id === winnerId);
    this.hud.showResult(winner ? winner.name : null);
  }

  #restart() {
    this.match.restart();
    this.hud.hideResult();
    this.hitStopMs = 0;
    this.#snapCamera();
  }
}
