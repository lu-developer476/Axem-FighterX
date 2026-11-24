import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'public', 'generated', 'haxeflixel');
const FRAME_WIDTH = 150;
const FRAME_HEIGHT = 100;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const SOURCES = Object.freeze({
  'axem-orange-bike': 'art/source/sprites/results/male/orange/bike.gif',
  'axem-red-bike': 'art/source/sprites/references/axem-red/axem-ranger-bike.gif',
  'axem-orange-run': 'art/source/sprites/results/male/orange/run.gif',
  'axem-orange-idle': 'art/source/sprites/results/male/orange/idle.gif',
  'axem-orange-dash': 'art/source/sprites/results/male/orange/dash.gif',
  'axem-red-run': 'art/source/sprites/references/axem-red/run.gif',
  'axem-red-idle': 'art/source/sprites/references/axem-red/idle.gif',
  'axem-red-walk': 'art/source/sprites/references/axem-red/walk.gif',
  'axem-red-dash': 'art/source/sprites/references/axem-red/dash.gif',
});

async function convertGifToSpritesheet(sourcePath, targetPath) {
  const metadata = await sharp(sourcePath, { animated: true }).metadata();
  const pages = Math.max(1, metadata.pages || 1);
  if (pages < 2) throw new Error('La referencia animada no contiene suficientes cuadros: ' + sourcePath);

  const frames = [];
  for (let page = 0; page < pages; page += 1) {
    frames.push(await sharp(sourcePath, { page, pages: 1 })
      .ensureAlpha()
      .resize(FRAME_WIDTH, FRAME_HEIGHT, {
        fit: 'contain',
        position: 'centre',
        kernel: 'nearest',
        background: TRANSPARENT,
      })
      .png()
      .toBuffer());
  }

  const sheet = await sharp({
    create: {
      width: FRAME_WIDTH * pages,
      height: FRAME_HEIGHT,
      channels: 4,
      background: TRANSPARENT,
    },
  }).composite(frames.map((input, index) => ({
    input,
    left: index * FRAME_WIDTH,
    top: 0,
  }))).png().toBuffer();

  await fs.writeFile(targetPath, sheet);
  console.log('Hoja HaxeFlixel: ' + path.relative(ROOT, targetPath) + ' (' + pages + ' cuadros)');
}

async function main() {
  await fs.mkdir(OUTPUT, { recursive: true });
  for (const [name, relativeSource] of Object.entries(SOURCES)) {
    const source = path.join(ROOT, relativeSource);
    const target = path.join(OUTPUT, name + '.png');
    await convertGifToSpritesheet(source, target);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
