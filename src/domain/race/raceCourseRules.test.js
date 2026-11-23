import { describe, expect, it } from 'vitest';
import { RACE_DISTANCE_OPTIONS, repeatCoursePattern } from './raceCourseRules.js';

describe('Configuración de distancias de los minijuegos', () => {
  it('ofrece únicamente recorridos de 5 y 10 kilómetros', () => {
    expect(RACE_DISTANCE_OPTIONS).toEqual([
      { label: '5 KM', value: 5000 },
      { label: '10 KM', value: 10000 },
    ]);
  });

  it('repite el mismo patrón a lo largo de todo el recorrido elegido', () => {
    const pattern = [
      { distance: 100, type: 'jump' },
      { distance: 400, type: 'roll' },
      { distance: 800, type: 'jump' },
    ];
    const result = repeatCoursePattern(pattern, 2100, {
      cycleDistance: 1000,
      finishPadding: 100,
    });

    expect(result.map(({ distance }) => distance)).toEqual([100, 400, 800, 1100, 1400, 1800]);
    expect(result[3]).toMatchObject({ type: 'jump', cycle: 1, patternIndex: 0 });
  });

  it('no añade objetos más allá de la distancia o dentro de la zona de meta', () => {
    const result = repeatCoursePattern([{ distance: 900, type: 'jump' }], 1000, {
      cycleDistance: 1000,
      finishPadding: 150,
    });
    expect(result).toEqual([]);
  });

  it('rechaza ciclos no válidos', () => {
    expect(() => repeatCoursePattern([{ distance: 10 }], 100, { cycleDistance: 0 }))
      .toThrow(/cycleDistance/);
  });
});
