/**
 * Asociación de secuencias GIF para los corredores de la carrera terrestre.
 * Las secuencias se limitan a los estados básicos de carrera, sin acciones
 * vinculadas a obstáculos o huecos del recorrido.
 */
const LAND_RACE_ANIMATION_PROFILES = Object.freeze({
  orange: Object.freeze({
    idle: 'idle',
    walk: 'pose',
    run: 'run',
    dash: 'dash',
  }),
  red: Object.freeze({
    idle: 'idle',
    walk: 'walk',
    run: 'run',
    dash: 'dash',
  }),
});

export function resolveLandRaceAnimationSources(variant, assets) {
  const profile = LAND_RACE_ANIMATION_PROFILES[variant];
  if (!profile) throw new RangeError('Variante de carrera terrestre desconocida: ' + variant);
  return Object.freeze(Object.fromEntries(
    Object.entries(profile).map(([mode, assetName]) => [mode, assets?.[assetName]]),
  ));
}
