import { describe, expect, it } from 'vitest';
import { RoundSeries } from './RoundSeries.js';

describe('RoundSeries: cantidad literal de rondas', () => {
  it('no termina una serie de dos rondas después del primer KO', () => {
    const series = new RoundSeries(2);
    const first = series.completeRound(0);
    expect(first.isComplete).toBe(false);
    expect(first.completedRounds).toBe(1);
    expect(first.wins).toEqual([1, 0]);

    const second = series.completeRound(1);
    expect(second.isComplete).toBe(true);
    expect(second.completedRounds).toBe(2);
    expect(second.wins).toEqual([1, 1]);
    expect(second.winnerIndex).toBeNull();
  });

  it('disputa exactamente cinco rondas y define el ganador por el marcador', () => {
    const series = new RoundSeries(5);
    [0, 1, 0, null, 0].forEach((winner) => series.completeRound(winner));

    expect(series.isComplete).toBe(true);
    expect(series.completedRounds).toBe(5);
    expect(series.wins).toEqual([3, 1]);
    expect(() => series.completeRound()).toThrow('La serie ya terminó.');
  });

  it('reinicia rondas y marcador', () => {
    const series = new RoundSeries(2);
    series.completeRound(1);
    series.reset();
    expect(series.completedRounds).toBe(0);
    expect(series.wins).toEqual([0, 0]);
    expect(series.isComplete).toBe(false);
  });

  it('rechaza configuraciones inválidas', () => {
    expect(() => new RoundSeries(0)).toThrow(RangeError);
    expect(() => new RoundSeries(2.5)).toThrow(RangeError);
    expect(() => new RoundSeries(2).completeRound(3)).toThrow(RangeError);
  });
});
