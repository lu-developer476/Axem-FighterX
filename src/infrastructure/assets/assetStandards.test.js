import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import ASSET_STANDARDS from '../../../art/source/sprites/asset-standards.json';

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
  it('conserva el GIF maestro y el spritesheet de referencia de bicicleta en Red', async () => {
    const directory = absolute('art/source/sprites/references/axem-red');
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const filenames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();

    expect(filenames).toEqual([
      'axem-ranger-nitro-bike.gif',
      'axem-ranger-bike-spritesheet.json',
      'axem-ranger-nitro-bike.png',
    ].sort());

    const manifestPath = absolute('art/source/sprites/references/axem-red/axem-ranger-bike-spritesheet.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    expect(manifest).toMatchObject({
      image: 'axem-ranger-nitro-bike.png',
      source: 'art/source/sprites/references/axem-red/axem-ranger-nitro-bike.gif',
      frameWidth: 101,
      frameHeight: 49,
      frames: 5,
      columns: 5,
      rows: 1,
      frameDurationMs: 100,
      loop: true,
      cropFromSource: { x: 22, y: 22, width: 101, height: 49 },
      sourceFrameSize: { width: 150, height: 100 },
    });

    const sheet = await sharp(absolute(
      'art/source/sprites/references/axem-red/axem-ranger-nitro-bike.png',
    )).metadata();
    expect(sheet.format).toBe('png');
    expect([sheet.width, sheet.height]).toEqual([
      manifest.frameWidth * manifest.columns,
      manifest.frameHeight * manifest.rows,
    ]);
    expect(sheet.hasAlpha).toBe(true);
    expect(ASSET_STANDARDS.categories.actionGif.referenceFiles).toEqual(['axem-ranger-nitro-bike.gif']);

    const pinkDirectory = absolute('art/source/sprites/references/axem-pink');
    const pinkEntries = await fs.readdir(pinkDirectory, { withFileTypes: true });
    const pinkFiles = pinkEntries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    expect(pinkFiles).toEqual(['super-axem-pink.png']);
    expect(ASSET_STANDARDS.categories.characterArtwork.families.male).not.toHaveProperty('derivedArtwork');
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

  it('mantiene declaradas las dimensiones objetivo de las texturas de combate', () => {
    const category = ASSET_STANDARDS.categories.combatTexture;
    expect([category.width, category.height]).toEqual([53, 83]);
  });

  it('mantiene declaradas las dimensiones objetivo de los retratos de menú', () => {
    const category = ASSET_STANDARDS.categories.menuPortrait;
    expect([category.width, category.height]).toEqual([104, 150]);
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
