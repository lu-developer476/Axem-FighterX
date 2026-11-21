import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { layoutSequence } from './atlasFrameDetection.js';
import { ATLAS_SEQUENCE_ROLES, ATLAS_SOURCES } from './atlasLayoutRules.js';
import atlasFrames from './atlasFrames.json';

const COLORS = ['violet', 'orange'];
const resultsPath = (...parts) =>
  fileURLToPath(new URL('../../../art/source/sprites/results/' + parts.join('/'), import.meta.url));

const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const alphaOf = async (file) => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(info.width * info.height);
  for (let index = 0; index < alpha.length; index++) alpha[index] = data[index * 4 + 3];
  return { alpha, width: info.width, height: info.height };
};

describe('cuadros de la hoja masculina (Axem Red)', () => {
  const { groups, width, height } = atlasFrames.male;

  it('conserva la distribución irregular: 14 grupos con 107 cuadros', () => {
    expect(groups.map((group) => group.frames.length))
      .toEqual([7, 9, 10, 8, 8, 5, 5, 5, 5, 11, 8, 14, 6, 6]);
  });

  it('clasifica los 14 grupos según las secuencias manuales del personaje', () => {
    const countOf = (id) => groups.find((group) => group.id === id).frames.length;
    expect(ATLAS_SEQUENCE_ROLES.male).toEqual({
      'group-01': 'idle',
      'group-02': 'idle',
      'group-03': 'punch',
      'group-04': 'punch',
      'group-05': 'punch',
      'group-06': 'battle-pose',
      'group-07': 'battle-pose',
      'group-08': 'battle-pose',
      'group-09': 'battle-pose',
      'group-10': 'run',
      'group-11': 'dash',
      'group-12': 'jump',
      'group-13': 'hit-hurt',
      'group-14': 'teleport',
    });
    expect(groups.map((group) => countOf(group.id)))
      .toEqual([7, 9, 10, 8, 8, 5, 5, 5, 5, 11, 8, 14, 6, 6]);
  });

  it('clasifica los recursos de referencia fuera de las secuencias masculinas', () => {
    const groups = atlasFrames.male.supplementalGroups;
    const excluded = ATLAS_SOURCES.male.excluded[0].bounds;
    expect(groups).toHaveLength(5);
    expect(groups.every((group) => group.assets.length > 0)).toBe(true);

    const assets = groups.flatMap((group) => group.assets);
    expect(assets.length).toBeGreaterThanOrEqual(8);
    expect(new Set(assets.map((asset) => asset.index)).size).toBe(assets.length);

    for (const asset of assets) {
      expect(asset.x).toBeGreaterThanOrEqual(excluded[0]);
      expect(asset.y).toBeGreaterThanOrEqual(excluded[1]);
      expect(asset.x + asset.w).toBeLessThanOrEqual(excluded[0] + excluded[2]);
      expect(asset.y + asset.h).toBeLessThanOrEqual(excluded[1] + excluded[3]);
    }
  });

  it('no tiene cuadros superpuestos, fuera de la hoja ni dentro de zonas excluidas', () => {
    const frames = groups.flatMap((group) => group.frames);
    const excluded = ATLAS_SOURCES.male.excluded.map(({ bounds: [x, y, w, h] }) => ({ x, y, w, h }));
    frames.forEach((frame, index) => {
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.w).toBeLessThanOrEqual(width);
      expect(frame.y + frame.h).toBeLessThanOrEqual(height);
      for (const other of frames.slice(index + 1)) expect(overlaps(frame, other)).toBe(false);
      for (const zone of excluded) expect(overlaps(frame, zone)).toBe(false);
    });
  });
});

describe('secuencias y recursos de la hoja femenina (Axem Pink)', () => {
  const { regions, groups, width, height } = atlasFrames.female;

  it('reconoce las 116 regiones y distingue poses de recursos', () => {
    const characters = regions.filter((region) => region.kind === 'character');
    expect(regions).toHaveLength(116);
    expect(characters).toHaveLength(84);
    expect(regions.length - characters.length).toBe(32);
  });

  it('clasifica las siete filas en tiras compactas y recursos suplementarios', () => {
    expect(groups.map((group) => group.frameCount)).toEqual([11, 14, 16, 16, 20, 10, 0]);
    expect(groups.map((group) => group.assetCount)).toEqual([1, 6, 3, 1, 2, 13, 6]);
    expect(groups.map((group) => group.role)).toEqual([
      'pose-sequence', 'pose-sequence', 'pose-sequence', 'pose-sequence',
      'pose-sequence', 'pose-sequence', 'effects-only',
    ]);
  });

  it('asigna cada región del atlas a una sola fila y a una sola celda o recurso', () => {
    const indices = groups.flatMap((group) => group.regionIndices);
    for (const group of groups) {
      for (const frame of group.frames) expect(group.regionIndices).toContain(frame.regionIndex);
      for (const asset of group.assets) expect(group.regionIndices).toContain(asset.regionIndex);
    }
    expect(indices).toHaveLength(regions.length);
    expect(new Set(indices).size).toBe(regions.length);
    expect([...indices].sort((a, b) => a - b)).toEqual(regions.map((region) => region.index));
  });

  it('mantiene cada recorte dentro de las dimensiones de la hoja', () => {
    for (const group of groups) {
      for (const frame of [...group.frames, ...group.assets]) {
        expect(frame.x).toBeGreaterThanOrEqual(0);
        expect(frame.y).toBeGreaterThanOrEqual(0);
        expect(frame.x + frame.w).toBeLessThanOrEqual(width);
        expect(frame.y + frame.h).toBeLessThanOrEqual(height);
      }
    }
  });

  it('conserva marcadas las regiones compuestas o dudosas para revisión', () => {
    const reviewed = regions.filter((region) => region.review);
    expect(reviewed).toHaveLength(12);
    for (const region of reviewed) expect(['varias-poses', 'posible-personaje']).toContain(region.review);
    expect(groups[2].frames.filter((frame) => frame.splitFrom === 33).map((frame) => frame.segment))
      .toEqual([0, 1]);
    expect(groups[4].frames.filter((frame) => frame.splitFrom === 82).map((frame) => frame.segment))
      .toEqual([0, 1, 2]);
    expect(groups[2].splitRegions).toEqual([33]);
    expect(groups[4].splitRegions).toEqual([82]);
  });
});

describe('resultados por género y color', () => {
  it('exporta los recursos suplementarios masculinos para Orange y Violet', async () => {
    const groups = atlasFrames.male.supplementalGroups;
    for (const color of COLORS) {
      const index = JSON.parse(await readFile(resultsPath('male', color, 'supplemental', 'index.json'), 'utf8'));
      expect(index).toHaveLength(groups.length);

      for (const entry of index) {
        const group = groups.find((candidate) => candidate.id === entry.id);
        expect(entry.assetCount).toBe(group.assets.length);
        expect(entry.assets.map((asset) => asset.sourceRegion)).toEqual(group.assets.map((asset) => asset.index));
        const metadata = await sharp(resultsPath('male', color, 'supplemental', entry.file)).metadata();
        expect(metadata.width).toBe(entry.cellWidth * entry.assetCount);
        expect(metadata.height).toBe(entry.cellHeight);
        expect(metadata.hasAlpha).toBe(true);
      }
    }
  });

  it('cada tira masculina mide celdas × cuadros según su índice', async () => {
    for (const color of COLORS) {
      const index = JSON.parse(await readFile(resultsPath('male', color, 'sequences', 'index.json'), 'utf8'));
      expect(index).toHaveLength(atlasFrames.male.groups.length);

      for (const entry of index) {
        const group = atlasFrames.male.groups.find((candidate) => candidate.id === entry.id);
        const layout = layoutSequence(group.frames, { anchor: entry.anchor });
        expect(entry.frameCount).toBe(group.frames.length);
        expect(entry.cellWidth).toBe(layout.cellWidth);
        expect(entry.cellHeight).toBe(layout.cellHeight);
        expect(entry.anchorX).toBe(layout.placements[0].x + group.frames[0].pivotX);

        const metadata = await sharp(resultsPath('male', color, 'sequences', entry.file)).metadata();
        expect(metadata.width).toBe(entry.cellWidth * entry.frameCount);
        expect(metadata.height).toBe(entry.cellHeight);
      }
    }
  });

  it('genera las seis tiras compactas de poses femeninas y los siete grupos suplementarios', async () => {
    for (const color of COLORS) {
      const index = JSON.parse(await readFile(resultsPath('female', color, 'sequences', 'index.json'), 'utf8'));
      expect(index).toHaveLength(7);
      expect(index.map((entry) => entry.frameCount)).toEqual([11, 14, 16, 16, 20, 10, 0]);
      expect(index.map((entry) => entry.assetCount)).toEqual([1, 6, 3, 1, 2, 13, 6]);

      for (const entry of index) {
        const group = atlasFrames.female.groups.find((candidate) => candidate.id === entry.id);
        expect(entry.regionIndices).toEqual(group.regionIndices);

        if (group.frameCount) {
          const metadata = await sharp(resultsPath('female', color, 'sequences', entry.sequence.file)).metadata();
          expect(metadata.width).toBe(entry.sequence.cellWidth * group.frameCount);
          expect(metadata.height).toBe(entry.sequence.cellHeight);
          expect(metadata.hasAlpha).toBe(true);
          expect(entry.sequence.frames.map((frame) => [
            frame.sourceRegion, frame.segment ?? null, frame.splitFrom ?? null,
          ])).toEqual(group.frames.map((frame) => [
            frame.regionIndex, frame.segment ?? null, frame.splitFrom ?? null,
          ]));
        } else {
          expect(entry.sequence).toBeNull();
          await expect(readFile(resultsPath('female', color, 'sequences', group.id + '.png')))
            .rejects.toMatchObject({ code: 'ENOENT' });
        }

        if (group.assetCount) {
          const metadata = await sharp(resultsPath('female', color, 'supplemental', entry.supplemental.file)).metadata();
          expect(metadata.width).toBe(entry.supplemental.cellWidth * group.assetCount);
          expect(metadata.height).toBe(entry.supplemental.cellHeight);
          expect(metadata.hasAlpha).toBe(true);
          expect(entry.supplemental.items.map((item) => item.sourceRegion))
            .toEqual(group.assets.map((asset) => asset.regionIndex));
        }
      }
    }
  });

  it('genera los GIF de acción de ambos masculinos en lienzos de 150×100 px', async () => {
    const animations = {
      'pose.gif': 16,
      'punch-01.gif': 10,
      'punch-02.gif': 8,
      'punch-03.gif': 8,
      'battle-pose.gif': 20,
      'run.gif': 11,
      'dash.gif': 8,
      'jump.gif': 14,
      'hit.gif': 2,
      'hurt.gif': 3,
      'teleport.gif': 6,
    };

    for (const color of COLORS) {
      for (const [animation, originalFrames] of Object.entries(animations)) {
        const expectedFrames = animation === 'battle-pose.gif'
          ? originalFrames + 1
          : animation === 'teleport.gif'
            ? originalFrames + 3
            : originalFrames;
        const metadata = await sharp(resultsPath('male', color, animation), { animated: true }).metadata();
        const frameHeight = metadata.pageHeight ?? metadata.height / (metadata.pages || 1);
        expect(metadata.width, color + '/' + animation).toBe(150);
        expect(frameHeight, color + '/' + animation).toBe(100);
        expect(metadata.pages, color + '/' + animation).toBe(expectedFrames);
      }
    }
  });

  it('completa los GIF y la pose de derrota del Axem Violeta', async () => {
    const animations = {
      'battle-pose.gif': 21,
      'teleport.gif': 9,
      'charge.gif': 7,
      'idle.gif': 8,
    };

    for (const [animation, expectedFrames] of Object.entries(animations)) {
      const metadata = await sharp(resultsPath('male', 'violet', animation), { animated: true }).metadata();
      expect(metadata.format, animation).toBe('gif');
      expect(metadata.width, animation).toBe(150);
      expect(metadata.pageHeight, animation).toBe(100);
      expect(metadata.pages, animation).toBe(expectedFrames);
      expect(metadata.hasAlpha, animation).toBe(true);
    }

    const defeated = await sharp(resultsPath('male', 'violet', 'defeated.png')).metadata();
    expect(defeated.format).toBe('png');
    expect(defeated.width).toBe(150);
    expect(defeated.height).toBe(100);
    expect(defeated.hasAlpha).toBe(true);
  });

  it.each(COLORS)('termina charge %s sosteniendo la última pose de group-09 con aura Super Saiyan', async (color) => {
    const auraPath = fileURLToPath(new URL(
      '../../../art/source/effects/dragon-ball-style/super-saiyan-aura.webp',
      import.meta.url,
    ));
    const auraMetadata = await sharp(auraPath).metadata();
    expect(auraMetadata.width).toBe(128);
    expect(auraMetadata.height).toBe(128);
    expect(auraMetadata.hasAlpha).toBe(true);

    const chargePath = resultsPath('male', color, 'charge.gif');
    const chargeMetadata = await sharp(chargePath, { animated: true }).metadata();
    expect(chargeMetadata.pages).toBe(7);
    expect(chargeMetadata.width).toBe(150);
    expect(chargeMetadata.pageHeight).toBe(100);
    const delays = Array.isArray(chargeMetadata.delay)
      ? chargeMetadata.delay
      : [chargeMetadata.delay || 100];
    expect(delays).toHaveLength(7);
    expect(delays.slice(3).every((delay) => delay >= 160)).toBe(true);

    const group09 = atlasFrames.male.groups.find((group) => group.id === 'group-09');
    const finalSourceFrame = group09.frames[group09.frames.length - 1];
    expect(group09.frames).toHaveLength(5);
    const sourceFrame = await sharp(resultsPath('male', color, 'spritesheet.png'))
      .extract({
        left: finalSourceFrame.x,
        top: finalSourceFrame.y,
        width: finalSourceFrame.w,
        height: finalSourceFrame.h,
      })
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
      .png()
      .toBuffer();
    const sourceMetadata = await sharp(sourceFrame).metadata();
    const width = Math.round(sourceMetadata.width * (78 / sourceMetadata.height));
    const normalized = await sharp(sourceFrame)
      .resize(width, 78, { fit: 'fill', kernel: 'nearest' })
      .png()
      .toBuffer();
    const expectedLeft = Math.round((150 - width) / 2);
    const expectedPose = await sharp({
      create: {
        width: 150,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: normalized, left: expectedLeft, top: 18 }])
      .png()
      .toBuffer();

    const expectedRaw = await sharp(expectedPose).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const expectedMask = new Uint8Array(expectedRaw.info.width * expectedRaw.info.height);
    let opaquePosePixels = 0;
    for (let pixel = 0; pixel < expectedMask.length; pixel += 1) {
      expectedMask[pixel] = expectedRaw.data[pixel * 4 + 3] > 220 ? 1 : 0;
      if (expectedMask[pixel]) opaquePosePixels += 1;
    }
    expect(opaquePosePixels).toBeGreaterThan(900);

    const previousAuraFrames = [];
    for (let page = 3; page < 7; page += 1) {
      const frameIndex = page - 3;
      const sourceAura = await sharp(auraPath)
        .extract({
          left: (frameIndex % 2) * 64,
          top: Math.floor(frameIndex / 2) * 64,
          width: 64,
          height: 64,
        })
        .resize(112, 112, { fit: 'fill', kernel: 'nearest' })
        .extract({ left: 0, top: 8, width: 112, height: 100 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const finalRaw = await sharp(chargePath, { page, pages: 1 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const finalMask = new Uint8Array(finalRaw.info.width * finalRaw.info.height);
      for (let pixel = 0; pixel < finalMask.length; pixel += 1) {
        finalMask[pixel] = finalRaw.data[pixel * 4 + 3] > 200 ? 1 : 0;
      }

      let bestPoseOverlap = 0;
      let bestPoseMask = new Uint8Array(expectedMask.length);
      for (let offsetY = -8; offsetY <= 8; offsetY += 1) {
        for (let offsetX = -8; offsetX <= 8; offsetX += 1) {
          const shiftedMask = new Uint8Array(expectedMask.length);
          let overlap = 0;
          for (let y = 0; y < 100; y += 1) {
            for (let x = 0; x < 150; x += 1) {
              const sourceX = x - offsetX;
              const sourceY = y - offsetY;
              if (sourceX < 0 || sourceX >= 150 || sourceY < 0 || sourceY >= 100) continue;
              const sourceIndex = sourceY * 150 + sourceX;
              const targetIndex = y * 150 + x;
              if (expectedMask[sourceIndex]) {
                shiftedMask[targetIndex] = 1;
                if (finalMask[targetIndex]) overlap += 1;
              }
            }
          }
          if (overlap > bestPoseOverlap) {
            bestPoseOverlap = overlap;
            bestPoseMask = shiftedMask;
          }
        }
      }

      let expectedAuraPixels = 0;
      let matchingAuraPixels = 0;
      let auraPixelsOutsidePose = 0;
      for (let y = 0; y < 100; y += 1) {
        for (let x = 0; x < 112; x += 1) {
          const auraOffset = (y * 112 + x) * 4;
          if (sourceAura.data[auraOffset + 3] < 96) continue;
          const screenX = x + 19;
          const screenY = y;
          const screenIndex = screenY * 150 + screenX;
          if (bestPoseMask[screenIndex]) continue;

          expectedAuraPixels += 1;
          const outputOffset = screenIndex * 4;
          if (finalRaw.data[outputOffset + 3] <= 100) continue;
          auraPixelsOutsidePose += 1;
          const channelDelta = Math.abs(sourceAura.data[auraOffset] - finalRaw.data[outputOffset]) +
            Math.abs(sourceAura.data[auraOffset + 1] - finalRaw.data[outputOffset + 1]) +
            Math.abs(sourceAura.data[auraOffset + 2] - finalRaw.data[outputOffset + 2]);
          if (channelDelta <= 180) matchingAuraPixels += 1;
        }
      }

      expect(bestPoseOverlap / opaquePosePixels, color + '/frame-' + page)
        .toBeGreaterThan(0.9);
      expect(expectedAuraPixels, color + '/source-aura-' + frameIndex).toBeGreaterThan(800);
      expect(auraPixelsOutsidePose, color + '/frame-' + page).toBeGreaterThan(700);
      expect(matchingAuraPixels / expectedAuraPixels, color + '/source-aura-' + frameIndex)
        .toBeGreaterThan(0.62);

      const currentFrameHash = finalRaw.data.toString('hex');
      previousAuraFrames.push(currentFrameHash);
    }

    expect(new Set(previousAuraFrames).size).toBe(4);
    }
  });


  it.each(COLORS)('mantiene la escala estándar del personaje en los ocho cuadros de idle %s', async (color) => {
    const file = resultsPath('male', color, 'idle.gif');
    const metadata = await sharp(file, { animated: true }).metadata();
    const visibleHeights = [];

    expect(metadata.width).toBe(150);
    expect(metadata.pageHeight).toBe(100);
    expect(metadata.pages).toBe(8);

    for (let page = 0; page < metadata.pages; page += 1) {
      const { data, info } = await sharp(file, { page, pages: 1 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(150);
      expect(info.height).toBe(100);

      let top = info.height;
      let bottom = -1;
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          if (data[(y * info.width + x) * 4 + 3] < 16) continue;
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
      visibleHeights.push(bottom >= top ? bottom - top + 1 : 0);
    }

    expect(visibleHeights.every((height) => height > 0)).toBe(true);
    expect(Math.max(...visibleHeights) - Math.min(...visibleHeights)).toBeLessThanOrEqual(1);
    expect(Math.abs(visibleHeights[0] - 78)).toBeLessThanOrEqual(1);
  });

  it('integra la invocación del hacha y la pose de derrota del Axem Naranja', async () => {
    const battlePose = await sharp(resultsPath('male', 'orange', 'battle-pose.gif'), { animated: true }).metadata();
    expect(battlePose.format).toBe('gif');
    expect(battlePose.width).toBe(150);
    expect(battlePose.pageHeight).toBe(100);
    expect(battlePose.pages).toBe(21);
    expect(battlePose.hasAlpha).toBe(true);

    const defeated = await sharp(resultsPath('male', 'orange', 'defeated.png')).metadata();
    expect(defeated.format).toBe('png');
    expect(defeated.width).toBe(150);
    expect(defeated.height).toBe(100);
    expect(defeated.hasAlpha).toBe(true);
  });

  it('Violet y Orange comparten exactamente los mismos cuadros: solo cambia la paleta', async () => {
    const files = {
      male: [
        'spritesheet.png', 'run.png', 'bike.png', 'double-axe.png',
        ...atlasFrames.male.groups.map((group) => 'sequences/' + group.id + '.png'),
        ...atlasFrames.male.supplementalGroups.map((group) => 'supplemental/' + group.id + '.png'),
      ],
      female: [
        'spritesheet.png', 'pose.png', 'battle-pose.png', 'levitate.png',
        ...atlasFrames.female.groups.flatMap((group) => [
          ...(group.frameCount ? ['sequences/' + group.id + '.png'] : []),
          ...(group.assetCount ? ['supplemental/' + group.id + '.png'] : []),
        ]),
      ],
    };

    for (const [gender, list] of Object.entries(files)) {
      for (const file of list) {
        // Las poses femeninas pose y levitate pueden tener siluetas propias por color.
        if (gender === 'female' && ['pose.png', 'levitate.png'].includes(file)) continue;
        const violet = await alphaOf(resultsPath(gender, 'violet', file));
        const orange = await alphaOf(resultsPath(gender, 'orange', file));
        expect(orange.width).toBe(violet.width);
        expect(orange.height).toBe(violet.height);
        expect(orange.alpha.equals(violet.alpha)).toBe(true);
      }
    }
  });

  it('las poses femeninas generadas son copias exactas de los resultados canónicos', async () => {
    for (const color of COLORS) {
      const canonical = await readFile(resultsPath('female', 'axem-ranger-' + color + '.png'));
      const pose = await readFile(resultsPath('female', color, 'pose.png'));
      expect(pose.equals(canonical)).toBe(true);
    }
  });
});
