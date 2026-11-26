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
describe('Estándares centrales de recursos gráficos', () => {
  it('conserva únicamente el GIF maestro de bicicleta en la referencia Red', async () => {
    const directory = absolute('art/source/sprites/references/axem-red');
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const filenames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();

    expect(filenames).toEqual(['axem-ranger-bike.gif']);
    expect(ASSET_STANDARDS.categories.actionGif.referenceFiles).toEqual(['axem-ranger-bike.gif']);

    const pinkDirectory = absolute('art/source/sprites/references/axem-pink');
    const pinkEntries = await fs.readdir(pinkDirectory, { withFileTypes: true });
    const pinkFiles = pinkEntries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    expect(pinkFiles).toEqual(['super-axem-pink.png']);
    expect(ASSET_STANDARDS.categories.characterArtwork.families.male).not.toHaveProperty('derivedArtwork');
  });

  it('limpia únicamente las carpetas temporales del generador', async () => {
    for (const directory of [
      'art/source/sprites/results/male/orange/source',
      'art/source/sprites/results/male/orange/sequences',
      'art/source/sprites/results/male/orange/supplemental',
    ]) {
      await expect(fs.access(absolute(directory))).rejects.toThrow();
    }
  });

  for (const [gender, family] of Object.entries(ASSET_STANDARDS.categories.characterArtwork.families)) {
    it('valida el master de artwork ' + gender + ' sin generar derivados', async () => {
      const master = await sharp(absolute(family.reference)).metadata();
      expect(master.format).toBe('png');
      expect(master.width).toBe(family.width);
      expect(master.height).toBe(family.height);

      if (family.result && family.result !== family.reference) {
        const artwork = await sharp(absolute(family.result)).metadata();
        expect(artwork.format).toBe('png');
        expect(artwork.width).toBe(family.width);
        expect(artwork.height).toBe(family.height);
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


  it('mantiene declaradas las dimensiones objetivo de las texturas de combate', () => {
    const category = ASSET_STANDARDS.categories.combatTexture;
    expect([category.width, category.height]).toEqual([53, 83]);
    expect(category.outputs).toEqual(['public/generated/ranger-male-orange.png']);
  });

  it('mantiene declaradas las dimensiones objetivo de los retratos de menú', () => {
    const category = ASSET_STANDARDS.categories.menuPortrait;
    expect([category.width, category.height]).toEqual([104, 150]);
    expect(category.outputs).toEqual(['public/generated/menu-ranger-male-orange.png']);
  });

  it('no depende de atlas compuestos retirados', () => {
    expect(ASSET_STANDARDS.categories.referenceSheet.families).toEqual([]);
  });

  it('mantiene los GIF de acción en su lienzo estándar y con sus cuadros', async () => {
    const category = ASSET_STANDARDS.categories.actionGif;
    const redReferenceDirectory = absolute(category.referenceDirectory);
    const redReferenceGifs = [];
    for (const name of category.referenceFiles ?? []) {
      const filename = path.join(redReferenceDirectory, name);
      try {
        await fs.access(filename);
        redReferenceGifs.push(filename);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    const canonicalGifs = [];
    for (const name of category.files ?? []) {
      const filename = path.join(absolute(category.directory), name);
      try {
        await fs.access(filename);
        canonicalGifs.push(filename);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    const files = [...canonicalGifs, ...redReferenceGifs];
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const metadata = await sharp(file, { animated: true }).metadata();
      expect(metadata.format).toBe('gif');
      expect(metadata.width).toBe(category.width);
      expect(metadata.pageHeight ?? metadata.height).toBe(category.height);
      expect(metadata.pages).toBeGreaterThan(0);
      expect(metadata.hasAlpha).toBe(true);
      if (category.preserveFrameTiming) {
        const delays = Array.isArray(metadata.delay) ? metadata.delay : [metadata.delay];
        expect(delays).toEqual(Array(metadata.pages).fill(100));
      }
    }
  });


});
