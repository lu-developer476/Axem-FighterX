import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig.js';
import { PreloadScene } from './presentation/scenes/PreloadScene.js';
import { MenuScene } from './presentation/scenes/MenuScene.js';
import { CinematicScene } from './presentation/scenes/CinematicScene.js';
import { FightScene } from './presentation/scenes/FightScene.js';
import { HaxeMinigameScene } from './presentation/scenes/HaxeMinigameScene.js';
import faviconUrl from '../art/source/favicon.png?url';

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = faviconUrl;
document.head.appendChild(favicon);

new Phaser.Game(createGameConfig([PreloadScene, MenuScene, CinematicScene, FightScene, HaxeMinigameScene]));
