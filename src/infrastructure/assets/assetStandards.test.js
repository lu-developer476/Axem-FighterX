import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import ASSET_STANDARDS from '../../../art/source/sprites/asset-standards.json';
import PROCESSING_RULES from '../../../art/source/sprites/processing-rules.json';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const absolute = (relativePath) => path.join(ROOT, relativePath);
async function visibleBounds(relativePath) {
  const { data, info } = await sharp(absolute(relativePath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
  }
  return { left, top, right, bottom };
}

describe('Estándares centrales de recursos gráficos', () => {
  it('no crea una carpeta results/male/red para el artwork de Red', async () => {
    await expect(fs.access(absolute('art/source/sprites/results/male/red'))).rejects.toThrow();
    expect(ASSET_STANDARDS.categories.characterArtwork.families.male).not.toHaveProperty('derivedArtwork');
  });

  it('mantiene los uploads Orange y Violet en sus rutas y fuera de references', async () => {
    const sources = [
      {
        file: 'art/source/sprites/results/male/orange/source/super-axem-orange-upload.png',
        excluded: 'male/orange/source/super-axem-orange-upload.png',
        oldDirectory: 'art/source/sprites/references/axem-orange',
      },
      {
        file: 'art/source/sprites/results/female/violet/source/super-axem-violet-upload.png',
        excluded: 'female/violet/source/super-axem-violet-upload.png',
        oldDirectory: 'art/source/sprites/references/axem-violet',
      },
    ];
    for (const source of sources) {
      const metadata = await sharp(absolute(source.file)).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBeGreaterThan(0);
      expect(metadata.height).toBeGreaterThan(0);
      expect(PROCESSING_RULES.processedPolicy.excludedFiles).toContain(source.excluded);
      await expect(fs.access(absolute(source.oldDirectory))).rejects.toThrow();
    }
  });


  for (const [gender, family] of Object.entries(ASSET_STANDARDS.categories.characterArtwork.families)) {
    it('mantiene el mismo lienzo entre el master y el artwork ' + gender, async () => {
      const [master, artwork, prepared] = await Promise.all([
        sharp(absolute(family.reference)).metadata(),
        sharp(absolute(family.result)).metadata(),
        sharp(absolute(family.preparedSource)).metadata(),
      ]);
      expect(master.format).toBe('png');
      expect(master.width).toBe(family.width);
      expect(master.height).toBe(family.height);
      expect(artwork.format).toBe('png');
      expect(artwork.width).toBe(master.width);
      expect(artwork.height).toBe(master.height);
      expect(artwork.hasAlpha).toBe(true);
      expect(prepared.width).toBe(master.width);
      expect(prepared.height).toBe(master.height);
      expect(prepared.hasAlpha).toBe(true);
    });
  }

  it('aplica transparencia y suavizado de borde a Orange sin alterar sus píxeles ni nitidez', async () => {
    const family = ASSET_STANDARDS.categories.characterArtwork.families.male;
    const edgeRule = PROCESSING_RULES.processedPolicy.artworkEdgeTreatment[
      'male/orange/super-axem-ranger-orange.png'
    ];
    const [source, output] = await Promise.all([
      sharp(absolute('art/source/sprites/results/male/orange/source/super-axem-orange-upload.png'))
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(absolute(family.result)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);

    expect([output.info.width, output.info.height]).toEqual([857, 1171]);
    expect(edgeRule.edgeAlphaFloor).toBeGreaterThanOrEqual(216);
    expect(edgeRule.preserveInteriorPixels).toBe(true);
    expect(edgeRule.preserveRGB).toBe(true);
    expect(edgeRule.resampling).toBe(false);
    expect(edgeRule.blur).toBe(false);
    expect(edgeRule.sharpen).toBe(false);

    let transparentPixels = 0;
    let softenedPixels = 0;
    for (let offset = 0; offset < output.data.length; offset += 4) {
      const alpha = output.data[offset + 3];
      const sourceAlpha = source.data[offset + 3];
      if (alpha === 0) transparentPixels += 1;
      if (alpha > 0 && alpha < 255) {
        softenedPixels += 1;
        expect(alpha).toBeGreaterThanOrEqual(edgeRule.edgeAlphaFloor);
      }
      // La transformación actúa sobre alfa; RGB, resolución y bloques de píxel quedan intactos.
      expect(Array.from(output.data.slice(offset, offset + 3)))
        .toEqual(Array.from(source.data.slice(offset, offset + 3)));
      if (sourceAlpha > 0 && alpha > 0) {
        expect(alpha).toBeGreaterThanOrEqual(edgeRule.edgeAlphaFloor);
      }
    }
    expect(transparentPixels).toBeGreaterThan(0);
    expect(softenedPixels).toBeGreaterThan(0);
  });

  it('hace que el Red derivado ocupe la misma caja visible que Orange', async () => {
    const family = ASSET_STANDARDS.categories.characterArtwork.families.male;
    const [master, orange, orangeBounds, redBounds] = await Promise.all([
      sharp(absolute(family.reference)).metadata(),
      sharp(absolute(family.result)).metadata(),
      visibleBounds(family.visualBoundsReference),
      visibleBounds(family.preparedSource),
    ]);
    expect([orange.width, orange.height]).toEqual([master.width, master.height]);
    const orangeWidth = orangeBounds.right - orangeBounds.left;
    const orangeHeight = orangeBounds.bottom - orangeBounds.top;
    const redWidth = redBounds.right - redBounds.left;
    const redHeight = redBounds.bottom - redBounds.top;
    expect(Math.abs(redWidth - orangeWidth) / orangeWidth)
      .toBeLessThanOrEqual(family.visualBoundsRatioTolerance);
    expect(Math.abs(redHeight - orangeHeight) / orangeHeight)
      .toBeLessThanOrEqual(family.visualBoundsRatioTolerance);
    expect(Math.abs((redBounds.left + redBounds.right - orangeBounds.left - orangeBounds.right) / 2)
      ).toBeLessThanOrEqual(family.visualBoundsTolerance);
    expect(Math.abs(redBounds.bottom - orangeBounds.bottom))
      .toBeLessThanOrEqual(family.visualBoundsTolerance);
  });

  it('genera las texturas de combate con el tamaño estándar', async () => {
    const category = ASSET_STANDARDS.categories.combatTexture;
    for (const file of category.outputs) {
      const metadata = await sharp(absolute(file)).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(category.width);
      expect(metadata.height).toBe(category.height);
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  it('genera los retratos de menú con el tamaño estándar', async () => {
    const category = ASSET_STANDARDS.categories.menuPortrait;
    for (const file of category.outputs) {
      const metadata = await sharp(absolute(file)).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(category.width);
      expect(metadata.height).toBe(category.height);
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  it('mantiene cada atlas procesado con las dimensiones de su referencia', async () => {
    for (const family of ASSET_STANDARDS.categories.atlasSheet.families) {
      const [source, output] = await Promise.all([sharp(absolute(family.reference)).metadata(), sharp(absolute(family.result)).metadata()]);
      expect([output.width, output.height]).toEqual([source.width, source.height]);
      expect(output.hasAlpha).toBe(true);
    }
  });

  it('mantiene los GIF de acción en su lienzo estándar y con sus cuadros', async () => {
    const category = ASSET_STANDARDS.categories.actionGif;
    const files = (await fs.readdir(absolute(category.directory))).filter((name) => name.toLowerCase().endsWith('.gif'));
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const metadata = await sharp(absolute(path.join(category.directory, name)), { animated: true }).metadata();
      expect(metadata.format).toBe('gif');
      expect(metadata.width).toBe(category.width);
      expect(metadata.pageHeight ?? metadata.height).toBe(category.height);
      expect(metadata.pages).toBeGreaterThan(0);
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  it('usa tamaños de celda declarados en los índices de secuencia', async () => {
    for (const indexPath of ASSET_STANDARDS.categories.sequenceStrips.indexes) {
      const groups = JSON.parse(await fs.readFile(absolute(indexPath), 'utf8'));
      expect(Array.isArray(groups)).toBe(true);
      for (const group of groups) {
        const sequenceDirectory = path.dirname(indexPath);
        const strips = indexPath.includes('/male/')
          ? [{ data: group, directory: sequenceDirectory }]
          : [
              { data: group.sequence, directory: sequenceDirectory },
              { data: group.supplemental, directory: path.join(sequenceDirectory, '../supplemental') },
            ].filter(({ data }) => data);

        for (const { data: strip, directory } of strips) {
          const imagePath = path.join(directory, strip.file);
          const metadata = await sharp(absolute(imagePath)).metadata();
          expect(metadata.width).toBe(strip.cellWidth * strip.frameCount);
          expect(metadata.height).toBe(strip.cellHeight);
          expect(metadata.hasAlpha).toBe(true);
        }
      }
    }
  });
});
