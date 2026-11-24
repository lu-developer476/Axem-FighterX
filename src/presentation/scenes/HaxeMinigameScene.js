import Phaser from 'phaser';

const BASE_URL = import.meta.env.BASE_URL;

/** Monta el minijuego HTML5 de HaxeFlixel sin compartir objetos de escena con Phaser. */
export class HaxeMinigameScene extends Phaser.Scene {
  constructor() {
    super('HaxeMinigameScene');
    this.host = null;
    this.frame = null;
    this.handleMessage = null;
  }

  init(data = {}) {
    this.mode = data.mode === 'land' ? 'land' : 'axem';
  }

  create() {
    const gameRoot = document.getElementById('game');
    if (!gameRoot) throw new Error('No existe el contenedor #game para el minijuego.');

    this.host = document.createElement('div');
    Object.assign(this.host.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '1000',
      overflow: 'hidden',
      background: '#000',
    });

    this.frame = document.createElement('iframe');
    this.frame.title = this.mode === 'land' ? 'Carrera terrestre' : 'Carrera Axem';
    this.frame.src = BASE_URL + 'minigames/index.html?mode=' + this.mode;
    this.frame.allow = 'autoplay; fullscreen';
    this.frame.setAttribute('allowfullscreen', '');
    Object.assign(this.frame.style, {
      display: 'block',
      width: '100%',
      height: '100%',
      border: '0',
      background: '#000',
    });
    this.host.appendChild(this.frame);
    gameRoot.appendChild(this.host);

    this.handleMessage = (event) => {
      if (event.source === this.frame?.contentWindow && event.data?.type === 'axem-minigame-exit') {
        this.scene.start('MenuScene');
      }
    };
    window.addEventListener('message', this.handleMessage);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.#cleanup());
  }

  #cleanup() {
    if (this.handleMessage) window.removeEventListener('message', this.handleMessage);
    this.handleMessage = null;
    this.frame = null;
    this.host?.remove();
    this.host = null;
  }
}
