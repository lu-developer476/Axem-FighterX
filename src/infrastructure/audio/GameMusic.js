import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';

import cathedralMusicUrl from '../../../art/source/effects/music/cathedral.wav';
import darkMusicUrl from '../../../art/source/effects/music/dark-music-final.wav';
import mechaMusicUrl from '../../../art/source/effects/music/mecha-collection.wav';
import slowDarkMusicUrl from '../../../art/source/effects/music/slow-dark-music.wav';

const MUSIC_URLS = Object.freeze({
  cathedral: cathedralMusicUrl,
  'dark-music-final': darkMusicUrl,
  'mecha-collection': mechaMusicUrl,
  'slow-dark-music': slowDarkMusicUrl,
});

const STAGE_MUSIC = Object.freeze({
  [STAGE_IDS.RUINS]: 'cathedral',
  [STAGE_IDS.VOLCANO]: 'slow-dark-music',
  [STAGE_IDS.FOREST]: 'dark-music-final',
  [STAGE_IDS.SANCTUARY]: 'cathedral',
  [STAGE_IDS.DOWNTOWN]: 'mecha-collection',
  [STAGE_IDS.MEADOW]: 'dark-music-final',
  [STAGE_IDS.VOLCANO_MOUTH]: 'slow-dark-music',
  [STAGE_IDS.YOSHI_ISLAND]: 'mecha-collection',
});

let activeSound = null;
let activeKey = null;
let requestId = 0;

/** Returns the soundtrack selected for an arena. */
export function getStageMusicTrack(stageId) {
  return STAGE_MUSIC[stageId] ?? 'dark-music-final';
}

/**
 * Loads only the requested WAV track and keeps it playing across scene changes.
 * Playback waits for the browser's first user interaction when audio is locked.
 */
export function playMusic(scene, trackKey) {
  if (!MUSIC_URLS[trackKey] || !scene?.sound || !scene?.load) return;
  if (activeKey === trackKey && activeSound?.isPlaying) return;

  activeSound?.stop();
  activeSound?.destroy();
  activeSound = null;
  activeKey = trackKey;
  const currentRequest = ++requestId;

  const startPlayback = () => {
    if (currentRequest !== requestId || !scene.sys.isActive()) return;
    if (!scene.cache.audio.exists(trackKey)) {
      if (currentRequest === requestId) activeKey = null;
      return;
    }

    const sound = scene.sound.add(trackKey, { loop: true, volume: 0.18 });
    activeSound = sound;
    const playWhenUnlocked = () => {
      if (currentRequest !== requestId || !scene.sys.isActive()) {
        sound.stop();
        sound.destroy();
        return;
      }
      sound.play();
    };

    if (scene.sound.locked) scene.sound.once('unlocked', playWhenUnlocked);
    else playWhenUnlocked();
  };

  if (scene.cache.audio.exists(trackKey)) {
    startPlayback();
    return;
  }

  scene.load.once('complete', startPlayback);
  scene.load.once('loaderror', (file) => {
    if (file?.key === trackKey && currentRequest === requestId) activeKey = null;
  });
  scene.load.audio(trackKey, MUSIC_URLS[trackKey]);
  scene.load.start();
}

export function playMenuMusic(scene) {
  playMusic(scene, 'mecha-collection');
}

export function playStageMusic(scene, stageId) {
  playMusic(scene, getStageMusicTrack(stageId));
}
