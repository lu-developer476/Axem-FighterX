import { describe, expect, it } from 'vitest';
import { MINIGAME_MAP_ASSETS } from './stageAssetManifest.js';
import { RACE_COURSE_ASSETS, resolveRaceCourseAssets } from './raceCourseAssets.js';

describe('Mapas de carreras', () => {
  it('descubre lost-town.png dentro de minigames/terrestrial', () => {
    expect(MINIGAME_MAP_ASSETS.terrestrial.map(({ filename }) => filename))
      .toContain('lost-town.png');
    expect(resolveRaceCourseAssets('terrestrial', MINIGAME_MAP_ASSETS.terrestrial).maps.map(({ id }) => id))
      .toEqual(RACE_COURSE_ASSETS.terrestrial.mapIds);
  });

  it('descubre castle.png dentro de minigames/racing', () => {
    expect(MINIGAME_MAP_ASSETS.racing.map(({ filename }) => filename))
      .toContain('castle.png');
    expect(RACE_COURSE_ASSETS.racing.mapIds).toContain('castle');
  });
});
