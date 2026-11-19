import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig.js';
import { PreloadScene } from './presentation/scenes/PreloadScene.js';
import { MenuScene } from './presentation/scenes/MenuScene.js';
import { FightScene } from './presentation/scenes/FightScene.js';

new Phaser.Game(createGameConfig([PreloadScene, MenuScene, FightScene]));
