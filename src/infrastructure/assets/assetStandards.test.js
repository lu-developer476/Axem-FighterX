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
async function readGifFrameDescriptors(filename) {
  const bytes = await fs.readFile(filename);
  const read16 = (offset) => bytes[offset] | (bytes[offset + 1] << 8);
  let offset = 13;
  if (bytes[10] & 0x80) {
    offset += 3 * (1 << ((bytes[10] & 0x07) + 1));
  }

  const frames = [];
  while (offset < bytes.length) {
    const marker = bytes[offset++];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      const label = bytes[offset++];
      if (label === 0xf9) {
        const blockSize = bytes[offset++];
        offset += blockSize;
        if (bytes[offset] === 0) offset += 1;
      } else {
        while (offset < bytes.length) {
          const blockSize = bytes[offset++];
          if (blockSize === 0) break;
          offset += blockSize;
        }
      }
      continue;
    }
    if (marker !== 0x2c) {
      throw new Error(filename + ': unexpected GIF marker 0x' + marker.toString(16));
    }

    const x = read16(offset);
    const y = read16(offset + 2);
    const width = read16(offset + 4);
    const height = read16(offset + 6);
    const flags = bytes[offset + 8];
    offset += 9;
    frames.push({ x, y, width, height });

    if (flags & 0x80) offset += 3 * (1 << ((flags & 0x07) + 1));
    offset += 1;
    while (offset < bytes.length) {
      const blockSize = bytes[offset++];
      if (blockSize === 0) break;
      offset += blockSize;
    }
  }
  return frames;
}

describe('Estándares centrales de recursos gráficos', () => {
  it('conserva el GIF maestro de bicicleta y el PNG de referencia en Red', async () => {
    const directory = absolute('art/source/sprites/references/axem-red');
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const filenames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();

    expect(filenames).toContain('axem-red-nitro-bike.png');
    expect(filenames.filter((filename) => filename.endsWith('.gif')).sort()).toEqual(
      [...ASSET_STANDARDS.categories.actionGif.referenceFiles].sort(),
    );

    const masterPath = absolute('art/source/sprites/references/axem-red/axem-red-nitro-bike.gif');
    const master = await sharp(masterPath, { animated: true }).metadata();
    expect(master.format).toBe('gif');
    expect(master.width).toBe(150);
    expect(master.pageHeight ?? master.height).toBe(100);
    expect(master.pages).toBeGreaterThan(1);
    expect(master.hasAlpha).toBe(true);

    const referencePng = await sharp(absolute(
      'art/source/sprites/references/axem-red/axem-red-nitro-bike.png',
    )).metadata();
    expect(referencePng.format).toBe('png');
    expect(ASSET_STANDARDS.categories.actionGif.referenceFiles).toHaveLength(22);

    const pinkDirectory = absolute('art/source/sprites/references/axem-pink');
    const pinkEntries = await fs.readdir(pinkDirectory, { withFileTypes: true });
    const pinkFiles = pinkEntries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    expect(pinkFiles).toEqual(['super-pink.png']);
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


  it('valida los artworks adicionales y decodifica el spritesheet X de referencia', async () => {
    for (const relativePath of ASSET_STANDARDS.categories.characterArtwork.additionalReferences ?? []) {
      const filename = absolute(relativePath);
      const metadata = await sharp(filename, { failOn: 'error' }).metadata();
      expect(metadata.format, relativePath).toBe('png');
      expect(metadata.width, relativePath).toBeGreaterThan(0);
      expect(metadata.height, relativePath).toBeGreaterThan(0);
      const decoded = await sharp(filename, { failOn: 'error' }).stats();
      expect(decoded.channels.length, relativePath).toBeGreaterThan(0);
    }

    const referenceSheet = ASSET_STANDARDS.categories.referenceSheet;
    expect(referenceSheet.families).toEqual([]);
    for (const relativePath of referenceSheet.files ?? []) {
      const filename = absolute(relativePath);
      const metadata = await sharp(filename, { failOn: 'error' }).metadata();
      expect(metadata.format, relativePath).toBe(referenceSheet.format ?? 'png');
      expect(metadata.width, relativePath).toBeGreaterThan(0);
      expect(metadata.height, relativePath).toBeGreaterThan(0);
      const decoded = await sharp(filename, { failOn: 'error' }).stats();
      expect(decoded.channels.length, relativePath).toBeGreaterThan(0);
    }
  });

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

  it('mantiene los GIF de acción en resolución nativa 150×100 y escala de píxel 1:1', async () => {
    const category = ASSET_STANDARDS.categories.actionGif;
    expect(category).toMatchObject({
      width: 150,
      height: 100,
      canvasPolicy: 'fixed-native-frame',
      pixelScale: '1:1',
      allowResampling: false,
      allowCropping: false,
    });
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
    for (const relativeDirectory of [category.directory, ...(category.additionalDirectories ?? [])]) {
      canonicalGifs.push(...await collectGifFiles(
        absolute(relativeDirectory),
        category.recursive === true,
      ));
    }
    expect(canonicalGifs.some((filename) => filename.includes('/results/male/white/'))).toBe(true);
    for (const name of category.files ?? []) {
      await expect(fs.access(path.join(absolute(category.directory), name))).resolves.toBeUndefined();
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
      if (file.startsWith(redReferenceDirectory + path.sep)) {
        const descriptors = await readGifFrameDescriptors(file);
        expect(descriptors).toHaveLength(metadata.pages);
        for (const descriptor of descriptors) {
          expect(descriptor).toEqual({
            x: 0,
            y: 0,
            width: category.width,
            height: category.height,
          });
        }
      }
      if (category.preserveFrameTiming) {
        const delays = Array.isArray(metadata.delay) ? metadata.delay : [metadata.delay];
        expect(delays).toEqual(Array(metadata.pages).fill(100));
      }
    }
  });


});
