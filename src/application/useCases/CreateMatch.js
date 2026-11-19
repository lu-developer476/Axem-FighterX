import { ARENA } from '../../domain/arena/arena.js';
import { Match } from '../../domain/entities/Match.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { createFighter } from '../../domain/rangers/createFighter.js';

/** Caso de uso: arma el combate con los dos personajes elegidos en el menú. */
export function createDefaultMatch(
  rng = Math.random,
  characterIds = [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE],
) {
  const [leftId = RANGER_IDS.VIOLET, rightId = RANGER_IDS.ORANGE] = characterIds ?? [];
  const left = createFighter(leftId, { x: ARENA.spawnLeftX, y: ARENA.groundY }, 1);
  const right = createFighter(rightId, { x: ARENA.spawnRightX, y: ARENA.groundY }, -1);
  return new Match({ fighters: [left, right], rng });
}
