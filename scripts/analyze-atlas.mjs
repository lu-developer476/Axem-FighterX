/**
 * Regenera src/infrastructure/assets/axemAtlasFrames.json a partir del atlas
 * original. No escribe nada en art/source: el PNG solo se lee.
 *
 *   node scripts/analyze-atlas.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { detectAtlasFrames } from '../src/infrastructure/assets/atlasFrameDetection.js';
import {
  ATLAS_BACKGROUND,
  ATLAS_EXCLUDED_REGIONS,
} from '../src/infrastructure/assets/atlasLayoutRules.js';

const atlasPath = fileURLToPath(
  new URL('../art/source/sprites/axem-rangers-moves-sprites.png', import.meta.url),
);
const outputPath = fileURLToPath(
  new URL('../src/infrastructure/assets/axemAtlasFrames.json', import.meta.url),
);

const { data, info } = await sharp(atlasPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const groups = detectAtlasFrames(
  { data, width: info.width, height: info.height },
  {
    background: ATLAS_BACKGROUND,
    excluded: ATLAS_EXCLUDED_REGIONS.map((region) => region.bounds),
  },
);

const manifest = {
  source: 'art/source/sprites/axem-rangers-moves-sprites.png',
  width: info.width,
  height: info.height,
  groups,
};

await mkdir(new URL('../src/infrastructure/assets/', import.meta.url), { recursive: true });
await writeFile(outputPath, JSON.stringify(manifest, null, 1) + '\n');

const total = groups.reduce((sum, group) => sum + group.frames.length, 0);
console.log(`${groups.length} grupos, ${total} cuadros → ${outputPath}`);
