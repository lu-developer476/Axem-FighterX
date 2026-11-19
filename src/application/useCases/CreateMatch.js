import { ARENA } from '../../domain/arena/arena.js';
import { Match } from '../../domain/entities/Match.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { createFighter } from '../../domain/rangers/createFighter.js';

/** Caso de uso: arma el combate inicial Violet (izquierda) vs Orange (derecha). */
export function createDefaultMatch(rng = Math.random) {
  const violet = createFighter(RANGER_IDS.VIOLET, { x: ARENA.spawnLeftX, y: ARENA.groundY }, 1);
  const orange = createFighter(RANGER_IDS.ORANGE, { x: ARENA.spawnRightX, y: ARENA.groundY }, -1);
  return new Match({ fighters: [violet, orange], rng });
}
