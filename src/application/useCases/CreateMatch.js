import { ARENA } from '../../domain/arena/arena.js';
import { Match } from '../../domain/entities/Match.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { createFighter } from '../../domain/rangers/createFighter.js';

const DEFAULT_GENDER = 'male';

function normalizeSelection(selection, fallbackId) {
  if (typeof selection === 'string') {
    return { id: selection, gender: DEFAULT_GENDER };
  }

  if (selection && typeof selection === 'object') {
    return {
      id: selection.id ?? fallbackId,
      gender: selection.gender ?? DEFAULT_GENDER,
    };
  }

  return { id: fallbackId, gender: DEFAULT_GENDER };
}

/** Caso de uso: arma el combate con los dos personajes elegidos en el menú. */
export function createDefaultMatch(
  rng = Math.random,
  characterSelections = [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE],
  arena = ARENA,
  hazards = null,
) {
  const [leftSelection, rightSelection] = characterSelections ?? [];
  const leftConfig = normalizeSelection(leftSelection, RANGER_IDS.VIOLET);
  const rightConfig = normalizeSelection(rightSelection, RANGER_IDS.ORANGE);
  const left = createFighter(
    leftConfig.id,
    { x: ARENA.spawnLeftX, y: ARENA.groundY },
    1,
    leftConfig.gender,
  );
  const right = createFighter(
    rightConfig.id,
    { x: ARENA.spawnRightX, y: ARENA.groundY },
    -1,
    rightConfig.gender,
  );
  return new Match({ fighters: [left, right], rng, arena, hazards });
}
