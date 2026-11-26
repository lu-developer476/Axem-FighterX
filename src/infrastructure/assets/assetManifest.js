import { genderForRanger } from '../../domain/rangers/rangerVariants.js';
import rangerArtworkUrl from '../../../art/source/sprites/results/male/orange/super-orange/super-axem-ranger-orange.png?url';
import runAnimationUrl from '../../../art/source/sprites/results/male/orange/axem-orange-run.png?url';
import bikeAnimationUrl from '../../../art/source/sprites/results/male/orange/axem-orange-bike.png?url';

export const DEFAULT_RANGER_GENDER = 'male';

export const spriteKeyFor = (rangerId, gender = genderForRanger(rangerId) ?? DEFAULT_RANGER_GENDER) =>
  'ranger-' + gender + '-' + rangerId;

// Phaser usa directamente el artwork fuente versionado.
export const spriteUrlFor = () => rangerArtworkUrl;

export const menuSpriteKeyFor = (rangerId, gender = 'male') =>
  'menu-ranger-' + gender + '-' + rangerId;

// El retrato usa el mismo master; su escala se ajusta en la escena.
export const menuSpriteUrlFor = () => rangerArtworkUrl;

export const maleAnimationKey = (rangerId, action) =>
  'axem-' + rangerId + '-' + action;

// Solo se conservan las tiras PNG versionadas de run y bike.
export const maleAnimationUrl = (_rangerId, action) => ({
  run: runAnimationUrl,
  bike: bikeAnimationUrl,
}[action] ?? null);
