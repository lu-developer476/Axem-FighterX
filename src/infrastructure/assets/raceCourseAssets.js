export const RACE_COURSE_ASSETS = Object.freeze({
  axem: Object.freeze({
    mapIds: Object.freeze(['cave-1', 'cave-2']),
    tilesetIds: Object.freeze(['cave1-tileset', 'cave2-tileset']),
  }),
  terrestrial: Object.freeze({
    mapIds: Object.freeze(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']),
    tilesetIds: Object.freeze(['sidescroll-tileset']),
  }),
});

export function resolveRaceCourseAssets(courseId, mapAssets, tilesetAssets) {
  const course = RACE_COURSE_ASSETS[courseId];
  if (!course) throw new RangeError('No existe el circuito "' + courseId + '".');
  const resolve = (ids, assets, type) => ids.map((id) => {
    const asset = assets.find((candidate) => candidate.id === id);
    if (!asset) throw new Error('Falta el recurso de ' + type + ': ' + id);
    return asset;
  });
  return Object.freeze({
    maps: Object.freeze(resolve(course.mapIds, mapAssets, 'mapa')),
    tilesets: Object.freeze(resolve(course.tilesetIds, tilesetAssets, 'tileset')),
  });
}
