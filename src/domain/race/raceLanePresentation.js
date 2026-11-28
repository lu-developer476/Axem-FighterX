/**
 * Cámara con zona muerta para las carreras en carriles.
 * El corredor avanza en coordenadas de pista y el seguimiento de cámara
 * desplaza el mundo cuando alcanza el límite derecho de la zona visible.
 */
export function getRaceCameraDistance(playerDistance, baseX, rightLimit, worldToScreenScale) {
  if (![playerDistance, baseX, rightLimit, worldToScreenScale].every(Number.isFinite) ||
      worldToScreenScale <= 0) return 0;
  const visibleAdvance = Math.max(0, (rightLimit - baseX) / worldToScreenScale);
  return Math.max(0, playerDistance - visibleAdvance);
}

export function getRaceRunnerX(baseX, racerDistance, cameraDistance, worldToScreenScale) {
  if (![baseX, racerDistance, cameraDistance, worldToScreenScale].every(Number.isFinite) ||
      worldToScreenScale <= 0) return Number.isFinite(baseX) ? baseX : 0;
  return baseX + (racerDistance - cameraDistance) * worldToScreenScale;
}
