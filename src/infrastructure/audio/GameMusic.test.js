import { describe, expect, it } from 'vitest';
import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import {
  getMenuMusicTrack,
  getStageMusicTrack,
  MUSIC_TRACKS,
  selectMenuMusicTrack,
  selectPreferredAudioSource,
  selectStageMusicTrack,
} from './GameMusic.js';

describe('Descubrimiento automático de música', () => {
  it('descubre las pistas existentes sin limitar el inventario a cuatro archivos', () => {
    expect(MUSIC_TRACKS.length).toBeGreaterThanOrEqual(1);
    expect(MUSIC_TRACKS.map(({ stem }) => stem)).toContain('cathedral');
    expect(MUSIC_TRACKS.every(({ url, id }) => typeof url === 'string' && id.startsWith('music-'))).toBe(true);
    expect(getMenuMusicTrack()).not.toBe(null);
    expect(getStageMusicTrack(STAGE_IDS.RUINS)).not.toBe(null);
  });

  it('prefiere OGG y conserva WAV como alternativa compatible', () => {
    const selected = selectPreferredAudioSource([
      { extension: 'wav', url: '/music/theme.wav' },
      { extension: 'ogg', url: '/music/theme.ogg' },
      { extension: 'mp3', url: '/music/theme.mp3' },
    ]);
    expect(selected.extension).toBe('ogg');

    const browserFallback = selectPreferredAudioSource([
      { extension: 'ogg', url: '/music/theme.ogg' },
      { extension: 'wav', url: '/music/theme.wav' },
    ], { canPlayType: (mime) => mime === 'audio/wav' ? 'probably' : '' });
    expect(browserFallback.extension).toBe('wav');
  });

  it('prioriza una pista etiquetada con el ID del escenario', () => {
    const tracks = [
      { id: 'music-global', stem: 'global' },
      { id: 'music-ruins-night', stem: 'ruins--night' },
    ];
    expect(selectStageMusicTrack(STAGE_IDS.RUINS, tracks).id).toBe('music-ruins-night');
  });

  it('rota las pistas genéricas de forma determinista', () => {
    const tracks = [
      { id: 'music-global-a', stem: 'global-a' },
      { id: 'music-global-b', stem: 'global-b' },
      { id: 'music-menu', stem: 'menu' },
    ];
    expect(selectStageMusicTrack(STAGE_IDS.RUINS, tracks).id).toBe('music-global-a');
    expect(selectStageMusicTrack(STAGE_IDS.VOLCANO, tracks).id).toBe('music-global-b');
  });

  it('permite reservar una pista para el menú con el nombre menu', () => {
    const tracks = [
      { id: 'music-battle', stem: 'battle' },
      { id: 'music-menu', stem: 'menu' },
    ];
    expect(selectMenuMusicTrack(tracks).id).toBe('music-menu');
  });
});
