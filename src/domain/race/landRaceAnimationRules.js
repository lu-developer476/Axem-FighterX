/**
 * Asociación de secuencias GIF para los corredores de la carrera terrestre.
 * Axem Red no tiene un GIF de rodada independiente: walk.gif cubre ese estado
 * sin sustituir idle, run, dash o jump por una animación incorrecta.
 */
const LAND_RACE_ANIMATION_PROFILES = Object.freeze({
  orange: Object.freeze({
    idle: 'idle',
    walk: 'pose',
    run: 'run',
    dash: 'dash',
    jump: 'jump',
    roll: 'roll',
  }),
  red: Object.freeze({
    idle: 'idle',
    walk: 'walk',
    run: 'run',
    dash: 'dash',
    jump: 'jump',
    roll: 'walk',
  }),
});

export function resolveLandRaceAnimationSources(variant, assets) {
  const profile = LAND_RACE_ANIMATION_PROFILES[variant];
  if (!profile) throw new RangeError('Variante de carrera terrestre desconocida: ' + variant);
  return Object.freeze(Object.fromEntries(
    Object.entries(profile).map(([mode, assetName]) => [mode, assets?.[assetName]]),
  ));
}
