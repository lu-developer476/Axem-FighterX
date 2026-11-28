import { FX, fxAnimKey, fxFrameKey } from '../../infrastructure/graphics/FxTextureFactory.js';

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

}
