export const RACE_COURSE_ASSETS = Object.freeze({
  axem: Object.freeze({
    mapIds: Object.freeze(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']),
    tilesetIds: Object.freeze(['sidescroll-tileset']),
  }),
  terrestrial: Object.freeze({
    mapIds: Object.freeze(['sidescroll-1', 'sidescroll-2', 'sidescroll-3', 'sidescroll-4']),
    tilesetIds: Object.freeze(['sidescroll-tileset']),
  }),
});

/**
 * Recortes explícitos de objetos con sentido jugable extraídos de cada tileset.
 * La decoración ambiental no se recicla como obstáculo ni como consumible.
 */
export const RACE_COURSE_OBJECTS = Object.freeze({
  axem: Object.freeze([
    Object.freeze({ id: 'hurdle', role: 'obstacle', action: 'dodge', instruction: 'ESQUIVAR', assetId: 'sidescroll-tileset', x: 960, y: 160, width: 64, height: 64 }),
    Object.freeze({ id: 'roll-gate', role: 'obstacle', action: 'dodge', instruction: 'ESQUIVAR', assetId: 'sidescroll-tileset', x: 1088, y: 160, width: 32, height: 96 }),
  ]),
  terrestrial: Object.freeze([]),
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

export function resolveRaceCourseObjects(courseId, tilesetAssets) {
  const regions = RACE_COURSE_OBJECTS[courseId];
  if (!regions) throw new RangeError('No existen objetos para el circuito "' + courseId + '".');
  const assetsById = new Map((tilesetAssets ?? []).map((asset) => [asset.id, asset]));
  return Object.freeze(regions.map((region) => {
    const asset = assetsById.get(region.assetId);
    if (!asset) throw new Error('Falta el tileset "' + region.assetId + '" para el objeto "' + region.id + '".');
    if (![region.x, region.y, region.width, region.height].every(Number.isInteger) ||
        region.x < 0 || region.y < 0 || region.width < 1 || region.height < 1) {
      throw new RangeError('Región inválida para el objeto "' + region.id + '".');
    }
    return Object.freeze({ ...region, asset });
  }));
}
