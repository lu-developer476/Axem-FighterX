import { describe, expect, it } from 'vitest';
import { resolveLandRaceAnimationSources } from './landRaceAnimationRules.js';

describe('Secuencias de carrera terrestre', () => {
  it('asigna a Axem Naranja sus GIF de reposo, caminata y carrera', () => {
    expect(resolveLandRaceAnimationSources('orange', {
      idle: 'orange/idle.gif',
      pose: 'orange/pose.gif',
      run: 'orange/run.gif',
      dash: 'orange/dash.gif',
    })).toEqual({
      idle: 'orange/idle.gif',
      walk: 'orange/pose.gif',
      run: 'orange/run.gif',
      dash: 'orange/dash.gif',
    });
  });

  it('usa idle.gif de Red y secuencias diferenciadas en los demás estados disponibles', () => {
    expect(resolveLandRaceAnimationSources('red', {
      idle: 'red/idle.gif',
      walk: 'red/walk.gif',
      run: 'red/run.gif',
      dash: 'red/dash.gif',
    })).toEqual({
      idle: 'red/idle.gif',
      walk: 'red/walk.gif',
      run: 'red/run.gif',
      dash: 'red/dash.gif',
    });
  });

  it('rechaza perfiles desconocidos', () => {
    expect(() => resolveLandRaceAnimationSources('violet', {}))
      .toThrow('Variante de carrera terrestre desconocida: violet');
  });
});
