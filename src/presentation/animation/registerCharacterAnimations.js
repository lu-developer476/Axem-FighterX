import { TIMINGS, attackTotalMs } from '../../domain/entities/FighterState.js';
import { animationKey } from '../../infrastructure/assets/characterAnimationData.js';
import { listAvailableSheets } from '../../infrastructure/assets/sheetCatalog.js';

const LOOPING_STATES = new Set(['idle', 'walk']);

/** Duración total de los estados que no se repiten: calza con la lógica de combate. */
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
 * Corta cada tira horizontal en cuadros iguales y crea las animaciones
 * `<ranger>:<estado>` para las hojas que existan.
 */
export function registerCharacterAnimations(scene) {
  for (const sheet of listAvailableSheets()) {
    const key = animationKey(sheet.rangerId, sheet.state);
    if (scene.anims.exists(key) || !scene.textures.exists(sheet.key)) continue;

    const texture = scene.textures.get(sheet.key);
    const source = texture.getSourceImage();
    const frameWidth = Math.floor(source.width / sheet.frames);
    if (source.width % sheet.frames !== 0) {
      console.warn(
        `[animaciones] ${sheet.rangerId}/${sheet.state}.png mide ${source.width}px y declara ${sheet.frames} frames: revisá "frames" en characterAnimationData.js`,
      );
    }

    const names = [];
    for (let i = 0; i < sheet.frames; i++) {
      const name = `f${i}`;
      if (!texture.has(name)) texture.add(name, 0, i * frameWidth, 0, frameWidth, source.height);
      names.push({ key: sheet.key, frame: name });
    }

    const timing = LOOPING_STATES.has(sheet.state)
      ? { frameRate: sheet.frameRate ?? 8, repeat: -1 }
      : { duration: oneShotDurationMs(sheet.state), repeat: 0 };
    scene.anims.create({ key, frames: names, ...timing });
  }
}
