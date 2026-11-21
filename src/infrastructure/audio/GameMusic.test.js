import { describe, expect, it } from 'vitest';
import { STAGES } from '../assets/stageAssetManifest.js';
import {
  getMenuMusicTrack,
  getStageMusicTrack,
  MUSIC_TRACKS,
  MUSIC_ROLES,
  selectMusicForMode,
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
    expect(getStageMusicTrack(STAGES[0].id)).not.toBe(null);
  });

  it('asigna una pista estable a menú, combates y cada carrera', () => {
    expect(MUSIC_ROLES).toEqual({
      menu: 'mecha-collection',
      combat: 'cathedral',
      motorcycleRace: 'dark-music-final',
      landRace: 'slow-dark-music',
    });
    for (const role of Object.keys(MUSIC_ROLES)) {
      expect(selectMusicForMode(role)?.stem).toBe(MUSIC_ROLES[role]);
    }
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
    const stageId = STAGES[0].id;
    const tracks = [
      { id: 'music-global', stem: 'global' },
      { id: 'music-stage-night', stem: stageId + '--night' },
    ];
    expect(selectStageMusicTrack(stageId, tracks).id).toBe('music-stage-night');
  });

  it('rota las pistas genéricas de forma determinista', () => {
    const tracks = [
      { id: 'music-global-a', stem: 'global-a' },
      { id: 'music-global-b', stem: 'global-b' },
      { id: 'music-menu', stem: 'menu' },
    ];
    expect(selectStageMusicTrack(STAGES[0].id, tracks).id).toBe('music-global-a');
    expect(selectStageMusicTrack(STAGES[1].id, tracks).id).toBe('music-global-b');
  });

  it('permite reservar una pista para el menú con el nombre menu', () => {
    const tracks = [
      { id: 'music-battle', stem: 'battle' },
      { id: 'music-menu', stem: 'menu' },
    ];
    expect(selectMenuMusicTrack(tracks).id).toBe('music-menu');
  });
});
