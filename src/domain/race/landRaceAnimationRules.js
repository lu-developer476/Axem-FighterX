/**
 * Animaciones opcionales de los corredores de la carrera terrestre.
 * walk usa run como alternativa mientras la variante no tenga un GIF propio.
 */
const LAND_RACE_ANIMATION_MODES = Object.freeze([
  'idle',
  'walk',
  'run',
  'dash',
  'jump',
  'roll',
]);

const LAND_RACE_VARIANTS = Object.freeze(['orange', 'red']);

export function resolveLandRaceAnimationSources(variant, assets) {
  if (!LAND_RACE_VARIANTS.includes(variant)) {
    throw new RangeError('Variante de carrera terrestre desconocida: ' + variant);
  }

  const result = Object.fromEntries(
    LAND_RACE_ANIMATION_MODES.map((mode) => [mode, assets?.[mode]]),
  );
  if (!result.walk) result.walk = result.run;
  return Object.freeze(result);
}
