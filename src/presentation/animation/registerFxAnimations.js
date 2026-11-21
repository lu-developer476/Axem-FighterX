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

  if (scene.textures.exists('kenney-white-puff') && !scene.anims.exists('kenney-white-puff-animation')) {
    scene.anims.create({
      key: 'kenney-white-puff-animation',
      frames: scene.anims.generateFrameNumbers('kenney-white-puff', { start: 0, end: 24 }),
      frameRate: 24,
      repeat: 0,
    });
  }
}
