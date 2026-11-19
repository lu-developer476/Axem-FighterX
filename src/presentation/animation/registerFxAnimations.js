import { FX, fxAnimKey, fxFrameKey } from '../../infrastructure/graphics/FxTextureFactory.js';
import { FLAME_FRAMES, STAGE_TEXTURES } from '../../infrastructure/graphics/StageTextureFactory.js';

export const FLAME_ANIMATION = 'stage-flame';

/** Crea una animación por efecto (`fx-<nombre>`) y la de las antorchas del escenario. */
export function registerFxAnimations(scene) {
  for (const [name, def] of Object.entries(FX)) {
    const key = fxAnimKey(name);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: Array.from({ length: def.frames }, (_, i) => ({ key: fxFrameKey(name, i) })),
      frameRate: def.frameRate,
      repeat: 0,
    });
  }

  if (!scene.anims.exists(FLAME_ANIMATION)) {
    scene.anims.create({
      key: FLAME_ANIMATION,
      frames: Array.from({ length: FLAME_FRAMES }, (_, i) => ({ key: STAGE_TEXTURES.flame(i) })),
      frameRate: 10,
      repeat: -1,
    });
  }
}
