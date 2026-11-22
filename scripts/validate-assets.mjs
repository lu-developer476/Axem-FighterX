import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standards = JSON.parse(await fs.readFile(
  path.join(ROOT, 'art', 'source', 'sprites', 'asset-standards.json'),
  'utf8',
));

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(label + ': esperado ' + expected + ', recibido ' + actual + '.');
  }
}

async function validatePng(relativePath, expected, label, requireAlpha = true) {
  const metadata = await sharp(absolute(relativePath), { failOn: 'error' }).metadata();
  assertEqual(metadata.format, 'png', label + ' formato');
  assertEqual(metadata.width, expected.width, label + ' ancho');
  assertEqual(metadata.height, expected.height, label + ' alto');
  if (requireAlpha && !metadata.hasAlpha) {
    throw new Error(label + ': falta el canal alfa.');
  }
  return metadata;
}

async function validateArtwork() {
  for (const [gender, family] of Object.entries(standards.categories.characterArtwork.families)) {
    const dimensions = { width: family.width, height: family.height };
    await validatePng(family.reference, dimensions, 'Master Super Axem ' + gender, false);
    await validatePng(family.result, dimensions, 'Artwork Super Axem ' + gender, true);
    await validatePng(family.preparedSource, dimensions, 'Fuente preparada Super Axem ' + gender, true);
  }
}

async function validateFixedCanvasCategories() {
  const combat = standards.categories.combatTexture;
  for (const file of combat.outputs) {
    await validatePng(file, combat, 'Textura de combate ' + path.basename(file), combat.alphaRequired);
  }

  const menu = standards.categories.menuPortrait;
  for (const file of menu.outputs) {
    await validatePng(file, menu, 'Retrato de menú ' + path.basename(file), menu.alphaRequired);
  }
}

async function validateAtlasSheets() {
  for (const family of standards.categories.atlasSheet.families) {
    const source = await sharp(absolute(family.reference), { failOn: 'error' }).metadata();
    await validatePng(
      family.result,
      { width: source.width, height: source.height },
      'Atlas procesado ' + path.basename(family.result),
      true,
    );
  }
}

async function validateActionGifs() {
  const category = standards.categories.actionGif;
  const directory = absolute(category.directory);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.gif')
    .map((entry) => entry.name)
    .sort();

  if (!files.length) {
    throw new Error('No se encontraron GIF de acción en ' + category.directory + '.');
  }

  for (const filename of files) {
    const relativePath = path.join(category.directory, filename).split(path.sep).join('/');
    const metadata = await sharp(absolute(relativePath), { animated: true, failOn: 'error' }).metadata();
    assertEqual(metadata.format, 'gif', relativePath + ' formato');
    assertEqual(metadata.width, category.width, relativePath + ' ancho');
    assertEqual(metadata.pageHeight ?? metadata.height, category.height, relativePath + ' alto por cuadro');

    if (!metadata.hasAlpha && category.alphaRequired) {
      throw new Error(relativePath + ': falta el canal alfa.');
    }
    if (!Number.isInteger(metadata.pages) || metadata.pages < 1) {
      throw new Error(relativePath + ': no se pudo verificar la cantidad de cuadros.');
    }
    if (
      category.preserveFrameTiming &&
      Array.isArray(metadata.delay) &&
      (
        metadata.delay.length !== metadata.pages ||
        metadata.delay.some((delay) => !Number.isFinite(delay) || delay < 0)
      )
    ) {
      throw new Error(relativePath + ': los tiempos de los cuadros son inválidos.');
    }
  }

  return files.length;
}

async function validateSequenceIndex(indexPath, gender) {
  const entries = JSON.parse(await fs.readFile(absolute(indexPath), 'utf8'));
  if (!Array.isArray(entries)) {
    throw new Error(indexPath + ': el índice debe ser un arreglo.');
  }

  for (const entry of entries) {
    const sequenceDirectory = path.dirname(indexPath);
    const strips = gender === 'male'
      ? [{ data: entry, directory: sequenceDirectory }]
      : [
          { data: entry.sequence, directory: sequenceDirectory },
          { data: entry.supplemental, directory: path.join(sequenceDirectory, '../supplemental') },
        ].filter(({ data }) => data);

    for (const { data: strip, directory } of strips) {
      const file = path.join(directory, strip.file).split(path.sep).join('/');
      await validatePng(
        file,
        {
          width: strip.cellWidth * strip.frameCount,
          height: strip.cellHeight,
        },
        'Tira ' + file,
        true,
      );
    }
  }

  return entries.length;
}

async function main() {
  await validateArtwork();
  await validateFixedCanvasCategories();
  await validateAtlasSheets();

  const gifCount = await validateActionGifs();
  const maleGroups = await validateSequenceIndex(
    standards.categories.sequenceStrips.indexes[0],
    'male',
  );
  const femaleGroups = await validateSequenceIndex(
    standards.categories.sequenceStrips.indexes[1],
    'female',
  );

  console.log(
    'Recursos gráficos validados: artwork masculino Orange y femenino Violet, ' +
    'texturas, retratos, atlas, ' + gifCount + ' GIF de acción, ' +
    maleGroups + ' grupos masculinos y ' + femaleGroups +
    ' grupos femeninos. Los recursos sin tamaño fijo conservan su resolución nativa.',
  );
}

main().catch((error) => {
  console.error('Falló la validación global de recursos gráficos:', error);
  process.exitCode = 1;
});
