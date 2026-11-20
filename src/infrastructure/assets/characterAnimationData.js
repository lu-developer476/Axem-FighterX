import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { SHARED_ANIMATION_SEQUENCES } from './sharedAxemAtlas.js';

/** Estados reconocidos por la vista de combate. */
export const ANIMATION_STATES = Object.freeze([
  'idle', 'walk', 'attack', 'hurt', 'teleport', 'ko',
]);

/**
 * Los dos personajes apuntan al mismo objeto de datos: no hay hojas ni
 * secuencias mantenidas por separado. Hurt, teleport y KO usan las mismas
 * poses procedurales sobre la textura base común.
 */
const SHARED_CHARACTER_DATA = Object.freeze({
  spriteFacing: -1,
  displayHeight: 83,
  sheets: SHARED_ANIMATION_SEQUENCES,
});

export const characterAnimationData = Object.freeze({
  [RANGER_IDS.VIOLET]: SHARED_CHARACTER_DATA,
  [RANGER_IDS.ORANGE]: SHARED_CHARACTER_DATA,
});

export const animationKey = (rangerId, state) => rangerId + ':' + state;
