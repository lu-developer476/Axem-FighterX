import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import { detectAtlasFrames } from './atlasFrameDetection.js';
import { ATLAS_BACKGROUND, ATLAS_EXCLUDED_REGIONS } from './atlasLayoutRules.js';
import { characterAnimationData } from './characterAnimationData.js';
import {
  ATLAS_GROUPS,
  AUXILIARY_ATLAS_GROUPS,
  AXEM_PALETTE_HUES,
  SHARED_ANIMATION_SEQUENCES,
} from './sharedAxemAtlas.js';

const atlasPath = fileURLToPath(
  new URL('../../../art/source/sprites/axem-rangers-moves-sprites.png', import.meta.url),
);

const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('manifiesto de cuadros del atlas', () => {
  it('coincide con lo que se detecta hoy en el PNG original', async () => {
    const { data, info } = await sharp(atlasPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const detected = detectAtlasFrames(
      { data, width: info.width, height: info.height },
      { background: ATLAS_BACKGROUND, excluded: ATLAS_EXCLUDED_REGIONS.map((region) => region.bounds) },
    );
    expect(ATLAS_GROUPS.map((group) => ({ ...group, bounds: [...group.bounds] })))
      .toEqual(JSON.parse(JSON.stringify(detected)));
  });

  it('no tiene cuadros superpuestos ni dentro de las zonas excluidas', () => {
    const frames = ATLAS_GROUPS.flatMap((group) => group.frames);
    for (let i = 0; i < frames.length; i++) {
      for (let j = i + 1; j < frames.length; j++) {
        expect(overlaps(frames[i], frames[j])).toBe(false);
      }
      for (const region of ATLAS_EXCLUDED_REGIONS) {
        const [x, y, w, h] = region.bounds;
        expect(overlaps(frames[i], { x, y, w, h })).toBe(false);
      }
    }
  });

  it('las secuencias activas son grupos del atlas y el resto queda como auxiliar', () => {
    const activeIds = Object.values(SHARED_ANIMATION_SEQUENCES).map((sequence) => sequence.groupId);
    expect(activeIds).toEqual(['group-01', 'group-02', 'group-03']);
    expect(AUXILIARY_ATLAS_GROUPS.length).toBe(ATLAS_GROUPS.length - activeIds.length);
  });
});

describe('reutilización entre Violet y Orange', () => {
  it('ambos rangers apuntan al mismo objeto de secuencias', () => {
    expect(characterAnimationData[RANGER_IDS.VIOLET].sheets)
      .toBe(characterAnimationData[RANGER_IDS.ORANGE].sheets);
    expect(characterAnimationData[RANGER_IDS.VIOLET].sheets).toBe(SHARED_ANIMATION_SEQUENCES);
  });

  it('solo difiere el tono de la paleta', () => {
    expect(Object.keys(AXEM_PALETTE_HUES).sort()).toEqual(['orange', 'violet']);
    expect(AXEM_PALETTE_HUES.violet).not.toBe(AXEM_PALETTE_HUES.orange);
  });
});
