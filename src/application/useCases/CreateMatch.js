import { ARENA } from '../../domain/arena/arena.js';
import { Match } from '../../domain/entities/Match.js';
import { createFighter } from '../../domain/rangers/createFighter.js';
import { isAllowedRangerVariant } from '../../domain/rangers/rangerCatalog.js';

function normalizeSelection(selection, index) {
  if (
    !selection ||
    typeof selection !== 'object' ||
    typeof selection.id !== 'string' ||
    !isAllowedRangerVariant(selection.id, selection.gender)
  ) {
    throw new Error(`El personaje ${index + 1} debe tener una variante disponible de Axem seleccionada.`);
  }

  return { id: selection.id, gender: selection.gender };
}

/** Caso de uso: arma el combate con las dos selecciones explícitas del menú. */
export function createDefaultMatch(
  rng = Math.random,
  characterSelections,
  arena = ARENA,
  hazards = null,
) {
  if (!Array.isArray(characterSelections) || characterSelections.length !== 2) {
    throw new Error('El combate requiere dos selecciones explícitas de personaje y género.');
  }

  const [leftConfig, rightConfig] = characterSelections.map(normalizeSelection);
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
