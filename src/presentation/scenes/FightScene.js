import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/gameConfig.js';
import { ARENA } from '../../domain/arena/arena.js';
import { getStage, STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import { getCombatMode } from '../../domain/match/matchModes.js';
import { createDefaultMatch } from '../../application/useCases/CreateMatch.js';
import { UpdateMatch } from '../../application/useCases/UpdateMatch.js';
import { KEYMAPS, PhaserKeyboardInput } from '../../infrastructure/input/PhaserKeyboardInput.js';
import { FighterView } from '../views/FighterView.js';
import { FxDirector } from '../views/FxDirector.js';
import { HudView } from '../views/HudView.js';
import { PickupView } from '../views/PickupView.js';
import { StageView } from '../views/StageView.js';
import { PauseMenuView } from '../views/PauseMenuView.js';

const CAMERA_FOLLOW_SPEED = 8;

export class FightScene extends Phaser.Scene {
  constructor() {
    super('FightScene');
  }

  init(data = {}) {
    this.stageDefinition = getStage(data.stageId ?? STAGE_IDS.RUINS);
    this.matchSetup = {
      ...(data.matchSetup ?? {}),
      characters: [...(data.matchSetup?.characters ?? [])],
    };
  }

  create() {
    this.match = createDefaultMatch(Math.random, this.matchSetup.characters);
    this.updateMatch = new UpdateMatch({
      match: this.match,
      inputs: [
        new PhaserKeyboardInput(this, KEYMAPS.PLAYER_1),
        new PhaserKeyboardInput(this, KEYMAPS.PLAYER_2),
      ],
    });

    this.stage = new StageView(this, this.stageDefinition.id);
    this.pickupView = new PickupView(this);
    this.views = this.match.fighters.map((fighter) => new FighterView(this, fighter));
    this.fx = new FxDirector(this);
    this.paused = false;
    this.pauseKey = this.input.keyboard.addKey('P');
    this.restartKey = this.input.keyboard.addKey('R');
    this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pauseNavigationKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });
    this.hud = new HudView(this, this.match.fighters);
    this.pauseMenu = new PauseMenuView(this, {
      onResume: () => this.#resume(),
      onReturnToMenu: () => this.scene.start('MenuScene'),
    });

    const combat = getCombatMode(this.matchSetup.combatMode);
    this.stageLabel = this.add.text(GAME_WIDTH / 2, 43, this.stageDefinition.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '6px',
      fontStyle: 'bold',
      color: '#fff0c9',
      stroke: '#0d0b16',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10003);
    this.modeLabel = this.add.text(GAME_WIDTH / 2, 52, combat.label, {
      fontFamily: 'monospace',
      fontSize: '5px',
      color: '#d0c4dc',
      stroke: '#0d0b16',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10003);

    this.cameras.main.setBounds(0, 0, ARENA.width, this.scale.height);
    this.hitStopMs = 0;
    this.#snapCamera();
    this.cameras.main.flash(160, 255, 255, 255);
    this.time.delayedCall(2600, () => {
      this.tweens.add({ targets: [this.stageLabel, this.modeLabel], alpha: 0, duration: 380 });
    });
  }

  update(time, delta) {
    if (this.paused) {
      if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
        this.#resume();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        if (this.pauseMenu.showingControls) this.pauseMenu.showMenu();
        else this.#resume();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.pauseNavigationKeys.up)) this.pauseMenu.moveSelection(-1);
      if (Phaser.Input.Keyboard.JustDown(this.pauseNavigationKeys.down)) this.pauseMenu.moveSelection(1);
      if (Phaser.Input.Keyboard.JustDown(this.pauseNavigationKeys.enter)) this.pauseMenu.activateSelection();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
      this.scene.start('MenuScene');
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.#openPause();
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

  #openPause() {
    if (this.paused) return;
    this.paused = true;
    this.tweens.pauseAll();
    this.anims.pauseAll();
    this.pauseMenu.showMenu();
  }

  #resume() {
    if (!this.paused) return;
    this.paused = false;
    this.pauseMenu.hide();
    this.tweens.resumeAll();
    this.anims.resumeAll();
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
