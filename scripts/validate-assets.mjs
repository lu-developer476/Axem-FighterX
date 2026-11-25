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

async function fileExists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
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

function visibleBounds(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
  }
  if (right <= left || bottom <= top) throw new Error('El artwork no tiene píxeles visibles.');
  return { left, top, right, bottom };
}
async function readVisibleBounds(relativePath) {
  const decoded = await sharp(absolute(relativePath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return visibleBounds(decoded.data, decoded.info.width, decoded.info.height);
}
async function assertVisualBoundsMatch(family) {
  if (!family.visualBoundsReference) return;
  const [orange, red] = await Promise.all([
    readVisibleBounds(family.visualBoundsReference), readVisibleBounds(family.preparedSource),
  ]);
  const tolerance = family.visualBoundsTolerance ?? 2;
  const ratioTolerance = family.visualBoundsRatioTolerance ?? 0.04;
  const orangeWidth = orange.right - orange.left;
  const orangeHeight = orange.bottom - orange.top;
  const redWidth = red.right - red.left;
  const redHeight = red.bottom - red.top;
  const widthDifference = Math.abs(redWidth - orangeWidth) / orangeWidth;
  const heightDifference = Math.abs(redHeight - orangeHeight) / orangeHeight;
  const centerDifference = Math.abs((red.left + red.right - orange.left - orange.right) / 2);
  const bottomDifference = Math.abs(red.bottom - orange.bottom);
  if (widthDifference > ratioTolerance || heightDifference > ratioTolerance ||
      centerDifference > tolerance || bottomDifference > tolerance) {
    throw new Error('El derivado Red ' + family.preparedSource + ' no coincide con la escala visual de Orange: ' +
      'Orange=' + JSON.stringify(orange) + '; Red=' + JSON.stringify(red) +
      '; diferencia ancho=' + (widthDifference * 100).toFixed(2) + '%' +
      '; diferencia alto=' + (heightDifference * 100).toFixed(2) + '%' +
      '; centro=' + centerDifference + ' px; línea de pies=' + bottomDifference + ' px.');
  }
}

async function validateArtwork() {
  for (const [gender, family] of Object.entries(standards.categories.characterArtwork.families)) {
    const dimensions = { width: family.width, height: family.height };
    await validatePng(family.reference, dimensions, 'Master Super Axem ' + gender, false);
    if (family.result) {
      await validatePng(family.result, dimensions, 'Artwork Super Axem ' + gender, true);
    }
    await validatePng(family.preparedSource, dimensions, 'Fuente preparada Super Axem ' + gender, true);
    await assertVisualBoundsMatch(family);
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

async function validateReferenceSheets() {
  for (const family of standards.categories.referenceSheet.families) {
    const source = await sharp(absolute(family.reference), { failOn: 'error' }).metadata();
    // Algunas referencias se conservan como masters sin publicar una salida derivada.
    if (!family.result) continue;
    await validatePng(
      family.result,
      { width: source.width, height: source.height },
      'Referencia compuesta ' + path.basename(family.result),
      true,
    );
  }
}

async function collectActionGifs(directory, recursive = false) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.gif') {
      files.push(fullPath);
    } else if (recursive && entry.isDirectory()) {
      files.push(...await collectActionGifs(fullPath, true));
    }
  }
  return files;
}

async function validateActionGifs() {
  const category = standards.categories.actionGif;
  const directory = absolute(category.directory);
  const redActionDirectory = absolute(category.referenceDirectory);
  const optionalReferenceFiles = [];
  for (const name of category.referenceFiles ?? []) {
    const filename = path.join(redActionDirectory, name);
    if (await fileExists(filename)) optionalReferenceFiles.push(filename);
  }
  const canonicalFiles = [];
  for (const name of category.files ?? []) {
    const filename = path.join(directory, name);
    if (await fileExists(filename)) canonicalFiles.push(filename);
  }
  const files = [...canonicalFiles, ...optionalReferenceFiles].sort();

  if (!files.length) {
    console.log('No hay GIF canónicos para validar en ' + category.directory + '.');
    return 0;
  }

  for (const filename of files) {
    const relativePath = path.relative(ROOT, filename).split(path.sep).join('/');
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
      (
        !Array.isArray(metadata.delay) ||
        metadata.delay.length !== metadata.pages ||
        metadata.delay.some((delay) => delay !== 100)
      )
    ) {
      throw new Error(relativePath + ': todos los cuadros deben durar exactamente 100 ms.');
    }
  }

  // El único GIF maestro externo que consume el generador es la bicicleta.
  for (const name of ['axem-ranger-bike.gif']) {
    const filename = path.join(redActionDirectory, name);
    const metadata = await sharp(filename, { animated: true, failOn: 'error' }).metadata();
    if (!Array.isArray(metadata.delay) || metadata.delay.length !== metadata.pages ||
        metadata.delay.some((delay) => delay !== 100)) {
      throw new Error(path.relative(ROOT, filename) + ': todos los cuadros deben durar exactamente 100 ms.');
    }
  }

  return files.length;
}

async function validateEffectGifs() {
  const effects = standards.categories.effectAnimation.files;
  let validated = 0;
  for (const effect of effects) {
    if (!await fileExists(absolute(effect.source)) || !await fileExists(absolute(effect.output))) {
      console.log(effect.source + ': fuente o derivado ausente; recurso opcional omitido.');
      continue;
    }
    const source = await sharp(absolute(effect.source), { failOn: 'error' }).metadata();
    assertEqual(source.format, 'png', effect.source + ' formato');
    if (!source.hasAlpha) throw new Error(effect.source + ': el PNG fuente debe conservar alfa.');

    const gif = await sharp(absolute(effect.output), { animated: true, failOn: 'error' }).metadata();
    assertEqual(gif.format, 'gif', effect.output + ' formato');
    assertEqual(gif.width, source.width, effect.output + ' ancho');
    assertEqual(gif.pageHeight ?? gif.height, source.height, effect.output + ' alto por cuadro');
    if (!gif.hasAlpha) throw new Error(effect.output + ': falta la transparencia.');
    if (!Number.isInteger(gif.pages) || gif.pages < 2) {
      throw new Error(effect.output + ': se requieren al menos dos cuadros.');
    }
    if (!Array.isArray(gif.delay) || gif.delay.length !== gif.pages ||
        gif.delay.some((delay) => !Number.isFinite(delay) || delay <= 0)) {
      throw new Error(effect.output + ': la duración de los cuadros es inválida.');
    }
    validated += 1;
  }
  return validated;
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
  await validateReferenceSheets();

  const gifCount = await validateActionGifs();
  const effectGifCount = await validateEffectGifs();

  console.log(
    'Recursos gráficos validados: artwork, hojas compuestas de referencia, texturas y retratos; ' +
    gifCount + ' GIF de acción y ' + effectGifCount + ' GIF de efectos Axem. Los recursos sin tamaño fijo conservan su resolución nativa.',
  );
}

main().catch((error) => {
  console.error('Falló la validación global de recursos gráficos:', error);
  process.exitCode = 1;
});
