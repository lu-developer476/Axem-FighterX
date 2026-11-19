import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';
import { FX, fxAnimKey, fxFrameKey } from '../../infrastructure/graphics/FxTextureFactory.js';
import { FLAME_FRAMES, STAGE_TEXTURES } from '../../infrastructure/graphics/StageTextureFactory.js';
import { getStageTextures } from '../../infrastructure/graphics/StageThemeFactory.js';

export const FLAME_ANIMATION = 'stage-flame';
export const flameAnimationKey = (stageId) =>
  stageId === STAGE_IDS.RUINS ? FLAME_ANIMATION : `stage-flame-${stageId}`;

const ADDITIONAL_STAGE_IDS = [STAGE_IDS.VOLCANO, STAGE_IDS.FOREST, STAGE_IDS.SANCTUARY];

/** Crea una animación por efecto y una secuencia de llamas para cada escenario. */
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

  registerFlameAnimation(scene, FLAME_ANIMATION, STAGE_TEXTURES);
  for (const stageId of ADDITIONAL_STAGE_IDS) {
    registerFlameAnimation(scene, flameAnimationKey(stageId), getStageTextures(stageId));
  }
}

function registerFlameAnimation(scene, key, textures) {
  if (scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames: Array.from({ length: FLAME_FRAMES }, (_, i) => ({ key: textures.flame(i) })),
    frameRate: 10,
    repeat: -1,
  });
}
