/**
 * Regenera src/infrastructure/assets/atlasFrames.json a partir de las hojas de
 * referencia de Axem Red (masculino) y Axem Pink (femenino). Los PNG solo se
 * leen: no se modifican.
 *
 *   node scripts/analyze-atlas.mjs
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  detectRegions,
  detectRowGroups,
  foregroundMask,
  isCharacterRegion,
  measureRegionColors,
} from '../src/infrastructure/assets/atlasFrameDetection.js';
import { ATLAS_SOURCES } from '../src/infrastructure/assets/atlasLayoutRules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_PATH = path.join(
  ROOT, 'src', 'infrastructure', 'assets', 'atlasFrames.json',
);

async function analyze(rules) {
  const { data, info } = await sharp(path.join(ROOT, rules.file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const image = { data, width: info.width, height: info.height };
  const mask = foregroundMask(image, {
    background: rules.background,
    tolerance: rules.tolerance,
    despeckle: Boolean(rules.despeckle),
    excluded: rules.excluded.map((region) => region.bounds),
  });

  const result = {
    id: rules.id,
    source: rules.file,
    width: info.width,
    height: info.height,
    strategy: rules.strategy,
    excluded: rules.excluded.map(({ id, bounds, reason }) => ({ id, bounds, reason })),
  };

  if (rules.strategy === 'rows') {
    result.groups = detectRowGroups(mask, info.width, info.height);
  } else {
    const regions = detectRegions(mask, info.width, info.height, rules).map((region, index) => {
      const { pixels, ...box } = region;
      const colors = measureRegionColors(image, box);
      return { index, ...box, kind: isCharacterRegion(box, colors) ? 'character' : 'other', body: colors.body };
    });

    // La clasificación es heurística: se marca lo que conviene revisar a mano.
    const characterWidths = regions.filter((region) => region.kind === 'character')
      .map((region) => region.w).sort((a, b) => a - b);
    const typicalWidth = characterWidths[Math.floor(characterWidths.length / 2)];
    result.regions = regions.map(({ body, ...region }) => {
      if (region.kind === 'character' && region.w > typicalWidth * 1.8) {
        return { ...region, review: 'varias-poses' };
      }
      if (region.kind === 'other' && region.h >= 40 && body >= 60) {
        return { ...region, review: 'posible-personaje' };
      }
      return region;
    });
  }
  return result;
}

const manifest = {};
for (const [gender, rules] of Object.entries(ATLAS_SOURCES)) {
  manifest[gender] = await analyze(rules);
}

await writeFile(FRAMES_PATH, JSON.stringify(manifest, null, 1) + '\n');

const male = manifest.male.groups;
const female = manifest.female.regions;
console.log(
  'male: ' + male.length + ' grupos, ' + male.reduce((sum, group) => sum + group.frames.length, 0) + ' cuadros',
);
console.log(
  'female: ' + female.length + ' regiones, ' + female.filter((region) => region.kind === 'character').length + ' de personaje',
);
console.log('→ ' + path.relative(ROOT, FRAMES_PATH));
