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


/**
 * Agrupa todas las regiones femeninas por su franja de lectura.
 * Los cortes clasifican por centro vertical; los bounds de salida se amplían
 * hasta los extremos de las regiones asignadas para no cortar poses solapadas.
 */
function groupFemaleRegions(regions, height, rowCuts) {
  const edges = [0, ...rowCuts, height];
  return Array.from({ length: edges.length - 1 }, (_, index) => {
    const minCenter = edges[index];
    const maxCenter = edges[index + 1];
    const members = regions
      .filter((region) => {
        const centerY = region.y + region.h / 2;
        return centerY >= minCenter && centerY < maxCenter;
      })
      .sort((left, right) => left.x - right.x);
    if (!members.length) return null;

    const frames = members
      .filter((region) => region.kind === 'character')
      .map(({ index: regionIndex, x, y, w, h, review }) => ({
        regionIndex, x, y, w, h, ...(review ? { review } : {}),
      }));
    const assets = members
      .filter((region) => region.kind === 'other')
      .map(({ index: regionIndex, x, y, w, h, review }) => ({
        regionIndex, x, y, w, h, ...(review ? { review } : {}),
      }));

    return {
      id: 'group-' + String(index + 1).padStart(2, '0'),
      row: index + 1,
      role: frames.length ? 'pose-sequence' : 'effects-only',
      frames,
      assets,
      frameCount: frames.length,
      assetCount: assets.length,
      regionCount: members.length,
      characterCount: frames.length,
      otherCount: assets.length,
      reviewCount: members.filter((region) => Boolean(region.review)).length,
      regionIndices: members.map((region) => region.index),
    };
  }).filter(Boolean);
}

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
    result.groups = groupFemaleRegions(result.regions, info.height, rules.rowCuts);
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
const femaleGroups = manifest.female.groups;
console.log(
  'male: ' + male.length + ' grupos, ' + male.reduce((sum, group) => sum + group.frames.length, 0) + ' cuadros',
);
console.log(
  'female: ' + femaleGroups.length + ' grupos, ' + femaleGroups.reduce((sum, group) => sum + group.frameCount, 0) + ' cuadros de personaje y ' + femaleGroups.reduce((sum, group) => sum + group.assetCount, 0) + ' recursos suplementarios',
);
console.log('→ ' + path.relative(ROOT, FRAMES_PATH));
