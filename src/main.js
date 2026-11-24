import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig.js';
import { PreloadScene } from './presentation/scenes/PreloadScene.js';
import { MenuScene } from './presentation/scenes/MenuScene.js';
import { CinematicScene } from './presentation/scenes/CinematicScene.js';
import { FightScene } from './presentation/scenes/FightScene.js';
import { HaxeMinigameScene } from './presentation/scenes/HaxeMinigameScene.js';
import { startFaviconAnimation } from './infrastructure/browser/faviconAnimator.js';

startFaviconAnimation();

new Phaser.Game(createGameConfig([PreloadScene, MenuScene, CinematicScene, FightScene, HaxeMinigameScene]));
