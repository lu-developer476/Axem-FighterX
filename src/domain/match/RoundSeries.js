/**
 * Marcador de una serie con una cantidad literal de rondas.
 * Gana quien acumule más victorias al finalizar todas las rondas.
 */
export class RoundSeries {
  constructor(totalRounds) {
    if (!Number.isInteger(totalRounds) || totalRounds < 1) {
      throw new RangeError('La serie debe tener al menos una ronda entera.');
    }
    this.totalRounds = totalRounds;
    this.reset();
  }

  get isComplete() {
    return this.completedRounds >= this.totalRounds;
  }

  reset() {
    this.completedRounds = 0;
    this.wins = [0, 0];
  }

  completeRound(winnerIndex = null) {
    if (this.isComplete) throw new Error('La serie ya terminó.');
    if (winnerIndex !== null && winnerIndex !== 0 && winnerIndex !== 1) {
      throw new RangeError('El ganador debe ser J1, J2 o null si hubo empate.');
    }

    if (winnerIndex !== null) this.wins[winnerIndex] += 1;
    this.completedRounds += 1;

    const finalWinnerIndex = !this.isComplete
      ? null
      : this.wins[0] === this.wins[1]
        ? null
        : this.wins[0] > this.wins[1] ? 0 : 1;

    return Object.freeze({
      completedRounds: this.completedRounds,
      totalRounds: this.totalRounds,
      wins: Object.freeze([...this.wins]),
      roundWinnerIndex: winnerIndex,
      isComplete: this.isComplete,
      winnerIndex: finalWinnerIndex,
    });
  }
}
