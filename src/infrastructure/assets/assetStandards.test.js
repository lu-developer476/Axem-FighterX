import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import ASSET_STANDARDS from '../../../art/source/sprites/asset-standards.json';

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
  for (const [gender, family] of Object.entries(ASSET_STANDARDS.categories.characterArtwork.families)) {
    it('mantiene el mismo lienzo entre el master y el artwork ' + gender, async () => {
      const [master, artwork, prepared, derived] = await Promise.all([
        sharp(absolute(family.reference)).metadata(),
        sharp(absolute(family.result)).metadata(),
        sharp(absolute(family.preparedSource)).metadata(),
        family.derivedArtwork ? sharp(absolute(family.derivedArtwork)).metadata() : Promise.resolve(null),
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
      if (family.derivedArtwork) {
        expect(family.derivedArtwork).toBe('art/source/sprites/results/male/red/super-axem-ranger-red.png');
        expect(derived.format).toBe('png');
        expect([derived.width, derived.height]).toEqual([family.width, family.height]);
        expect(derived.hasAlpha).toBe(true);
      }
    });
  }

  it('hace que el Red derivado ocupe la misma caja visible que Orange', async () => {
    const family = ASSET_STANDARDS.categories.characterArtwork.families.male;
    const [master, orange, orangeBounds, redBounds] = await Promise.all([
      sharp(absolute(family.reference)).metadata(),
      sharp(absolute(family.result)).metadata(),
      visibleBounds(family.visualBoundsReference),
      visibleBounds(family.derivedArtwork ?? family.preparedSource),
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
