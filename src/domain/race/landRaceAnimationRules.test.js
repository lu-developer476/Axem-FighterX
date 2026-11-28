import { describe, expect, it } from 'vitest';
import { resolveLandRaceAnimationSources } from './landRaceAnimationRules.js';

describe('Secuencias de carrera terrestre', () => {
  it('incluye las animaciones existentes y usa run como alternativa a walk si falta', () => {
    expect(resolveLandRaceAnimationSources('orange', {
      idle: 'orange/idle.gif',
      run: 'orange/run.gif',
      dash: 'orange/dash.gif',
      jump: 'orange/jump.gif',
      roll: 'orange/roll.gif',
    })).toEqual({
      idle: 'orange/idle.gif',
      walk: 'orange/run.gif',
      run: 'orange/run.gif',
      dash: 'orange/dash.gif',
      jump: 'orange/jump.gif',
      roll: 'orange/roll.gif',
    });
  });

  it('prefiere walk cuando la variante tiene un GIF propio', () => {
    expect(resolveLandRaceAnimationSources('red', {
      idle: 'red/idle.gif',
      walk: 'red/walk.gif',
      run: 'red/run.gif',
      dash: 'red/dash.gif',
      jump: 'red/jump.gif',
      roll: 'red/roll.gif',
    })).toEqual({
      idle: 'red/idle.gif',
      walk: 'red/walk.gif',
      run: 'red/run.gif',
      dash: 'red/dash.gif',
      jump: 'red/jump.gif',
      roll: 'red/roll.gif',
    });
  });

  it('rechaza perfiles desconocidos', () => {
    expect(() => resolveLandRaceAnimationSources('violet', {}))
      .toThrow('Variante de carrera terrestre desconocida: violet');
  });
});
