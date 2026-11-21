import { describe, expect, it } from 'vitest';
import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import { getStageMusicTrack } from './GameMusic.js';

describe('Música por contexto', () => {
  it('asigna pistas a familias de escenarios', () => {
    expect(getStageMusicTrack(STAGE_IDS.RUINS)).toBe('cathedral');
    expect(getStageMusicTrack(STAGE_IDS.VOLCANO)).toBe('slow-dark-music');
    expect(getStageMusicTrack(STAGE_IDS.FOREST)).toBe('dark-music-final');
    expect(getStageMusicTrack(STAGE_IDS.DOWNTOWN)).toBe('mecha-collection');
  });

  it('usa una pista de respaldo ante un escenario desconocido', () => {
    expect(getStageMusicTrack('missing-stage')).toBe('dark-music-final');
  });
});
