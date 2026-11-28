/**
 * Regla única para los PNG de pickups.
 * El lienzo reserva un margen transparente; el arte visible conserva su proporción.
 */
export const PICKUP_ASSET_STANDARD = Object.freeze({
  canvas: Object.freeze({
    width: 128,
    height: 128,
    format: 'png',
    channels: 4,
  }),
  artwork: Object.freeze({
    maxWidth: 112,
    maxHeight: 112,
    minTransparentPadding: 8,
    visibleAlphaThreshold: 16,
    centeringTolerance: 1,
    resampling: 'nearest',
  }),
  display: Object.freeze({
    maxVisibleSize: 32,
  }),
});
