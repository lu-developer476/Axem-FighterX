import { describe, expect, it } from 'vitest';
import {
  getRaceCameraDistance,
  getRaceRunnerX,
} from './raceLanePresentation.js';

describe('Movimiento de los corredores y seguimiento de cámara', () => {
  it('deja avanzar al corredor dentro de la zona visible antes de seguirlo', () => {
    const camera = getRaceCameraDistance(100, 76, 126, 0.19);
    expect(camera).toBe(0);
    expect(getRaceRunnerX(76, 100, camera, 0.19)).toBeCloseTo(95);
  });

  it('sigue al corredor al alcanzar el límite derecho sin fijarlo en el centro', () => {
    const camera = getRaceCameraDistance(600, 76, 126, 0.19);
    expect(getRaceRunnerX(76, 600, camera, 0.19)).toBeCloseTo(126);
    expect(getRaceRunnerX(76, 500, camera, 0.19)).toBeCloseTo(107);
  });

  it('mantiene al rival detrás o delante según su distancia real', () => {
    const camera = getRaceCameraDistance(800, 76, 126, 0.19);
    expect(getRaceRunnerX(76, 700, camera, 0.19))
      .toBeLessThan(getRaceRunnerX(76, 800, camera, 0.19));
    expect(getRaceRunnerX(76, 900, camera, 0.19))
      .toBeGreaterThan(getRaceRunnerX(76, 800, camera, 0.19));
  });

  it('maneja entradas no válidas sin propagar NaN', () => {
    expect(getRaceCameraDistance(Number.NaN, 76, 126, 0.19)).toBe(0);
    expect(getRaceRunnerX(76, Number.NaN, 0, 0.19)).toBe(76);
  });
});
