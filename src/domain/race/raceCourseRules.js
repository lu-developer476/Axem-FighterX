export const RACE_DISTANCE_OPTIONS = Object.freeze([
  Object.freeze({ label: '1 KM', value: 1000 }),
  Object.freeze({ label: '2 KM', value: 2000 }),
  Object.freeze({ label: '5 KM', value: 5000 }),
  Object.freeze({ label: '10 KM', value: 10000 }),
]);

/**
 * Repite un patrón de obstáculos/objetos durante toda la distancia elegida.
 * Las plantillas mantienen su separación y vuelven a aparecer en cada vuelta.
 */
export function repeatCoursePattern(pattern, totalDistance, {
  cycleDistance,
  finishPadding = 100,
} = {}) {
  if (!Array.isArray(pattern) || !pattern.length) return [];
  if (!Number.isFinite(totalDistance) || totalDistance <= 0) return [];
  if (!Number.isFinite(cycleDistance) || cycleDistance <= 0) {
    throw new RangeError('cycleDistance debe ser un número positivo.');
  }

  const repeated = [];
  const cycles = Math.ceil(totalDistance / cycleDistance);
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const cycleOffset = cycle * cycleDistance;
    for (let index = 0; index < pattern.length; index += 1) {
      const distance = cycleOffset + pattern[index].distance;
      if (distance >= totalDistance - finishPadding) continue;
      repeated.push({ ...pattern[index], distance, cycle, patternIndex: index });
    }
  }
  return repeated.sort((left, right) => left.distance - right.distance);
}
