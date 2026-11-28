import { MINIGAME_MAP_ASSETS } from './stageAssetManifest.js';

const mapIdsFor = (category) => Object.freeze(
  MINIGAME_MAP_ASSETS[category].map(({ id }) => id),
);

export const RACE_COURSE_ASSETS = Object.freeze({
  racing: Object.freeze({ mapIds: mapIdsFor('racing'), tilesetIds: Object.freeze([]) }),
  terrestrial: Object.freeze({ mapIds: mapIdsFor('terrestrial'), tilesetIds: Object.freeze([]) }),
});

export const RACE_COURSE_OBJECTS = Object.freeze({
  racing: Object.freeze([]),
  terrestrial: Object.freeze([]),
});

export function resolveRaceCourseAssets(courseId, mapAssets, _tilesetAssets = []) {
  const course = RACE_COURSE_ASSETS[courseId];
  if (!course) throw new RangeError('No existe el circuito "' + courseId + '".');
  const maps = course.mapIds.map((id) => {
    const asset = mapAssets.find((candidate) => candidate.id === id);
    if (!asset) throw new Error('Falta el recurso de mapa: ' + id);
    return asset;
  });
  return Object.freeze({ maps: Object.freeze(maps), tilesets: Object.freeze([]), backgroundKey: null });
}

export function resolveRaceCourseObjects(courseId) {
  const objects = RACE_COURSE_OBJECTS[courseId];
  if (!objects) throw new RangeError('No existen objetos para el circuito "' + courseId + '".');
  return objects;
}
