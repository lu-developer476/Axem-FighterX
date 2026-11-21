import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/gameConfig.js';
import { ARENA, getArenaForGroundDepthMode } from '../../domain/arena/arena.js';
import { getStage, STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import { getCombatMode, getVersusMode } from '../../domain/match/matchModes.js';
import { RoundSeries } from '../../domain/match/RoundSeries.js';
import { createDefaultMatch } from '../../application/useCases/CreateMatch.js';
import { UpdateMatch } from '../../application/useCases/UpdateMatch.js';
import { AIInput } from '../../infrastructure/input/AIInput.js';
import { PhaserKeyboardInput } from '../../infrastructure/input/PhaserKeyboardInput.js';
import { KEYMAPS } from '../../infrastructure/input/keyMaps.js';
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
    const matchArena = this.matchSetup.trainingBackgroundColor
      ? ARENA
      : getArenaForGroundDepthMode(this.stageDefinition.groundDepthMode);
    this.match = createDefaultMatch(
      Math.random,
      this.matchSetup.characters,
      matchArena,
      this.stageDefinition.hazards ?? null,
    );
    const [leftFighter, rightFighter] = this.match.fighters;
    const versus = getVersusMode(this.matchSetup.versusMode);
    const combat = getCombatMode(this.matchSetup.combatMode);
    this.roundSeries = combat.rounds > 1 ? new RoundSeries(combat.rounds) : null;
    this.pendingNextRound = false;

    const playerOne = () => new PhaserKeyboardInput(this, KEYMAPS.PLAYER_1);
    const playerTwo = () => new PhaserKeyboardInput(this, KEYMAPS.PLAYER_2);
    this.aiInputs = [];
    const createAI = (fighter, opponent, phase) => {
      const controller = new AIInput(fighter, opponent, {
        now: () => this.time.now,
        phase,
        arena: matchArena,
        getPickup: () => this.match.pickup,
      });
      this.aiInputs.push(controller);
      return controller;
    };
    const aiOne = () => createAI(leftFighter, rightFighter, 0);
    const aiTwo = () => createAI(rightFighter, leftFighter, Math.PI);

    let inputs;
    switch (versus.id) {
      case 'player-vs-ai':
        inputs = this.matchSetup.playerSide === 'J2'
          ? [aiOne(), playerTwo()]
          : [playerOne(), aiTwo()];
        break;
      case 'ai-vs-ai':
        inputs = [aiOne(), aiTwo()];
        break;
      case 'player-vs-player':
      default:
        inputs = [playerOne(), playerTwo()];
        break;
    }

    this.updateMatch = new UpdateMatch({ match: this.match, inputs });

    this.stage = new StageView(this, this.stageDefinition.id, {
      backgroundColor: this.matchSetup.trainingBackgroundColor ?? null,
    });
    this.pickupView = new PickupView(this);
    this.views = this.match.fighters.map((fighter) => new FighterView(this, fighter));
    this.fx = new FxDirector(this, this.stageDefinition.id);
    this.paused = false;
    this.pauseKey = this.input.keyboard.addKey('P');
    this.restartKey = this.input.keyboard.addKey('R');
    this.menuKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.resultKeys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    this.pauseNavigationKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });
    this.hud = new HudView(this, this.match.fighters);
    if (this.roundSeries) this.hud.setRoundScore(0, this.roundSeries.totalRounds, [0, 0]);
    this.pauseMenu = new PauseMenuView(this, {
      onResume: () => this.#resume(),
      onReturnToMenu: () => this.scene.start('MenuScene'),
    });

    const stageTitle = this.matchSetup.trainingBackgroundColor
      ? 'ENTRENAMIENTO'
      : this.stageDefinition.name.toUpperCase();
    this.stageLabel = this.add.text(GAME_WIDTH / 2, 43, stageTitle, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#fff0c9',
      stroke: '#0d0b16',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10003);
    this.modeLabel = this.add.text(GAME_WIDTH / 2, 52, versus.label + ' · ' + combat.label, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#d0c4dc',
      stroke: '#0d0b16',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10003);
    this.aiLevelLabel = this.aiInputs.length
      ? this.add.text(GAME_WIDTH / 2, 62, 'IA · NIVEL 1', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#c9b7dc',
        stroke: '#0d0b16',
        strokeThickness: 2,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10003)
      : null;

    this.cameras.main.setBounds(0, 0, ARENA.width, this.scale.height);
    this.hitStopMs = 0;
    this.#snapCamera();
    this.cameras.main.flash(160, 255, 255, 255);
    this.time.delayedCall(2600, () => {
      this.tweens.add({ targets: [this.stageLabel, this.modeLabel, this.aiLevelLabel].filter(Boolean), alpha: 0, duration: 380 });
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
    if (this.match.isOver) {
      if (
        Phaser.Input.Keyboard.JustDown(this.resultKeys.enter) ||
        Phaser.Input.Keyboard.JustDown(this.resultKeys.space)
      ) {
        if (this.pendingNextRound) this.#startNextRound();
        else this.hud.advanceResultDialogue();
      }
      return;
    }

    let events = [];
    if (this.hitStopMs > 0) this.hitStopMs -= delta;
    else events = this.updateMatch.execute(delta);

    this.stage.handleEvents(events);
    const { hitStopMs } = this.fx.handle(events);
    this.hitStopMs = Math.max(this.hitStopMs, hitStopMs);
    for (const event of events) {
      if (event.type === 'match-over') this.#handleRoundOver(event.winnerId);
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

  #handleRoundOver(winnerId) {
    if (!this.roundSeries) {
      this.#showResult(winnerId);
      return;
    }

    const winnerIndex = this.match.fighters.findIndex((fighter) => fighter.id === winnerId);
    const result = this.roundSeries.completeRound(winnerIndex < 0 ? null : winnerIndex);
    this.hud.setRoundScore(result.completedRounds, result.totalRounds, result.wins);

    if (result.isComplete) {
      const championId = result.winnerIndex === null
        ? null
        : this.match.fighters[result.winnerIndex].id;
      this.#showResult(championId);
      return;
    }

    this.pendingNextRound = true;
    const roundWinner = winnerIndex < 0 ? null : this.match.fighters[winnerIndex].name;
    this.hud.showRoundResult(result.completedRounds, result.totalRounds, roundWinner, result.wins);
  }

  #startNextRound() {
    if (!this.pendingNextRound) return;
    this.pendingNextRound = false;
    this.views.forEach((view) => view.clearVictory());
    this.match.restart();
    const nextAiLevel = this.roundSeries.completedRounds + 1;
    this.aiInputs.forEach((controller) => controller.setDifficulty(nextAiLevel));
    this.aiLevelLabel?.setText('IA · NIVEL ' + nextAiLevel).setAlpha(1);
    this.hud.hideResult();
    this.hud.setRoundScore(
      this.roundSeries.completedRounds,
      this.roundSeries.totalRounds,
      this.roundSeries.wins,
    );
    this.#snapCamera();
  }

  #showResult(winnerId) {
    const winnerIndex = this.match.fighters.findIndex((fighter) => fighter.id === winnerId);
    const winner = winnerIndex >= 0 ? this.match.fighters[winnerIndex] : null;
    if (winner) this.views[winnerIndex]?.showVictory();
    const outcome = winnerId ? winnerId + 'Wins' : 'draw';
    const dialogue = this.stageDefinition.resultDialogue[outcome] ?? this.stageDefinition.resultDialogue.draw;
    this.hud.showResult(winner ? winner.name : null, dialogue);
  }

  #restart() {
    this.views.forEach((view) => view.clearVictory());
    this.match.restart();
    this.roundSeries?.reset();
    this.aiInputs.forEach((controller) => controller.setDifficulty(1));
    this.aiLevelLabel?.setText('IA · NIVEL 1').setAlpha(1);
    this.pendingNextRound = false;
    if (this.roundSeries) this.hud.setRoundScore(0, this.roundSeries.totalRounds, [0, 0]);
    this.hud.hideResult();
    this.hitStopMs = 0;
    this.#snapCamera();
  }
}
