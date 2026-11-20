import { TIMINGS, attackTotalMs } from '../../domain/entities/FighterState.js';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import {
  animationKey,
  characterAnimationData,
} from '../../infrastructure/assets/characterAnimationData.js';
import { sheetTextureKey, maleAnimationKey } from '../../infrastructure/assets/assetManifest.js';

const RANGER_ORDER = [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE];
const LOOPING_STATES = new Set(['idle', 'walk']);

const oneShotDurationMs = (state) => {
  switch (state) {
    case 'attack':
      return attackTotalMs();
    case 'hurt':
      return TIMINGS.hurtMs;
    case 'teleport':
      return TIMINGS.teleportOutMs + TIMINGS.teleportInMs;
    case 'ko':
      return TIMINGS.koAnimationMs;
    default:
      return 400;
  }
};

/**
 * Registra las mismas coordenadas y el mismo orden de cuadros para ambos
 * personajes. Solo cambia la textura ya recoloreada automáticamente.
 */
export function registerCharacterAnimations(scene) {
  for (const rangerId of RANGER_ORDER) {
    for (const [action, frameRate] of [['run', 10], ['bike', 9], ['double-axe', 12]]) {
      const key = maleAnimationKey(rangerId, action);
      const texture = scene.textures.get(key);
      if (!scene.anims.exists(key) && texture) {
        const frames = scene.anims.generateFrameNumbers(key, { start: 0, end: texture.frameTotal - 2 });
        if (frames.length) scene.anims.create({
          key,
          frames,
          frameRate,
          repeat: action === 'double-axe' ? 0 : -1,
        });
      }
    }
  }
  for (const rangerId of RANGER_ORDER) {
    const { sheets } = characterAnimationData[rangerId];

    for (const [state, sequence] of Object.entries(sheets)) {
      const key = animationKey(rangerId, state);
      const textureKey = sheetTextureKey(rangerId, state);
      if (scene.anims.exists(key) || !scene.textures.exists(textureKey)) continue;

      const frames = Array.from({ length: sequence.frameCount }, (_, index) => ({
        key: textureKey,
        frame: 'f' + index,
      }));

      const timing = LOOPING_STATES.has(state)
        ? { frameRate: sequence.frameRate, repeat: -1 }
        : { duration: oneShotDurationMs(state), repeat: 0 };

      scene.anims.create({ key, frames, ...timing });
    }
  }
}
