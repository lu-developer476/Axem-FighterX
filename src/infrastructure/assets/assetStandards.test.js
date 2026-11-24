import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import ASSET_STANDARDS from '../../../art/source/sprites/asset-standards.json';
import PROCESSING_RULES from '../../../art/source/sprites/processing-rules.json';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const absolute = (relativePath) => path.join(ROOT, relativePath);
async function collectGifFiles(directory, recursive = false) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.gif')) files.push(fullPath);
    else if (recursive && entry.isDirectory()) files.push(...await collectGifFiles(fullPath, true));
  }
  return files;
}
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
  it('conserva solo las referencias Red necesarias y el master de moto', async () => {
    const directory = absolute('art/source/sprites/references/axem-red');
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const expectedGifs = ['dash.gif', 'idle.gif', 'jump.gif', 'run.gif', 'walk.gif'].sort();
    const gifs = entries
      .filter((entry) => entry.isFile() && expectedGifs.includes(entry.name))
      .map((entry) => entry.name)
      .sort();
    expect(gifs).toEqual(expectedGifs);
    const retiredGifs = [
      'bike.gif', 'hit.gif', 'hurt.gif', 'punch-01.gif',
      'punch-02.gif', 'punch-03.gif', 'teleport.gif',
    ];
    expect(entries.some((entry) => retiredGifs.includes(entry.name))).toBe(false);
    expect(entries.some((entry) => entry.name === 'axem-ranger-bike.gif')).toBe(true);
    expect(entries.some((entry) => entry.name === 'axem-red-spritesheet.png')).toBe(true);
    expect(entries.some((entry) => entry.name === 'super-axem-ranger-red.png')).toBe(true);
    await expect(fs.access(absolute('art/source/sprites/references/axem-orange'))).rejects.toThrow();

    const resultsDirectory = absolute('art/source/sprites/results/male/red');
    await expect(fs.readdir(resultsDirectory)).resolves.toHaveLength(0);
    expect(ASSET_STANDARDS.categories.characterArtwork.families.male).not.toHaveProperty('derivedArtwork');
  });

  it('mantiene retiradas las carpetas de origen y secuencias que ya no forman parte del proyecto', async () => {
    const removedDirectories = [
      'art/source/sprites/results/male/violet',
      'art/source/sprites/results/female/orange',
      'art/source/sprites/results/male/orange/source',
      'art/source/sprites/results/male/orange/sequences',
      'art/source/sprites/results/female/violet/source',
      'art/source/sprites/results/female/violet/sequences',
      'art/source/sprites/results/female/violet/supplemental',
    ];
    for (const directory of removedDirectories) {
      await expect(fs.access(absolute(directory))).rejects.toThrow();
    }
    expect(PROCESSING_RULES.processedPolicy.excludedFiles)
      .toContain('male/orange/super-axem-ranger-orange.png');
    expect(PROCESSING_RULES.processedPolicy.excludedFiles)
      .toContain('male/orange/super-axem-ranger-orange.PNG');
  });


  for (const [gender, family] of Object.entries(ASSET_STANDARDS.categories.characterArtwork.families)) {
    it('mantiene el lienzo del master y su fuente preparada ' + gender, async () => {
      const [master, prepared] = await Promise.all([
        sharp(absolute(family.reference)).metadata(),
        sharp(absolute(family.preparedSource)).metadata(),
      ]);
      expect(master.format).toBe('png');
      expect(master.width).toBe(family.width);
      expect(master.height).toBe(family.height);
      expect(prepared.format).toBe('png');
      expect(prepared.width).toBe(master.width);
      expect(prepared.height).toBe(master.height);
      expect(prepared.hasAlpha).toBe(true);

      if (family.result) {
        const artwork = await sharp(absolute(family.result)).metadata();
        expect(artwork.format).toBe('png');
        expect(artwork.width).toBe(master.width);
        expect(artwork.height).toBe(master.height);
        expect(artwork.hasAlpha).toBe(true);
      }
    });
  }

  it('aplica transparencia y suavizado de borde a Orange sin comerse píxeles', async () => {
    const family = ASSET_STANDARDS.categories.characterArtwork.families.male;
    const edgeRule = PROCESSING_RULES.processedPolicy.artworkEdgeTreatment[
      'male/orange/super-axem-ranger-orange.png'
    ];
    const { data, info } = await sharp(absolute(family.result))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    expect([info.width, info.height]).toEqual([857, 1171]);
    expect(edgeRule.edgeAlphaFloor).toBeGreaterThanOrEqual(216);
    expect(edgeRule.preserveInteriorPixels).toBe(true);
    expect(edgeRule.preserveRGB).toBe(true);
    expect(edgeRule.resampling).toBe(false);
    expect(edgeRule.blur).toBe(false);
    expect(edgeRule.sharpen).toBe(false);

    let transparentPixels = 0;
    let softenedPixels = 0;
    for (let offset = 3; offset < data.length; offset += 4) {
      const alpha = data[offset];
      if (alpha === 0) transparentPixels += 1;
      if (alpha > 0 && alpha < 255) {
        softenedPixels += 1;
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
    const files = await collectGifFiles(absolute(category.directory), category.recursive === true);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const metadata = await sharp(file, { animated: true }).metadata();
      expect(metadata.format).toBe('gif');
      expect(metadata.width).toBe(category.width);
      expect(metadata.pageHeight ?? metadata.height).toBe(category.height);
      expect(metadata.pages).toBeGreaterThan(0);
      expect(metadata.hasAlpha).toBe(true);
    }
  });


});
