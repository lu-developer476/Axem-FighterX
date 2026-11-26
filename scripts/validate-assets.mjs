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

async function validateArtwork() {
  for (const [gender, family] of Object.entries(standards.categories.characterArtwork.families)) {
    const dimensions = { width: family.width, height: family.height };
    await validatePng(family.reference, dimensions, 'Master Super Axem ' + gender, false);

    // Solo valida otro artwork cuando existe como fuente versionada distinta.
    // Las copias preparadas en public/generated son artefactos de build y no se crean aquí.
    if (family.result && family.result !== family.reference) {
      await validatePng(family.result, dimensions, 'Artwork Super Axem ' + gender, true);
    }
  }
}

async function collectGifFiles(directory, recursive = false) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.gif') {
      files.push(fullPath);
    } else if (recursive && entry.isDirectory()) {
      files.push(...await collectGifFiles(fullPath, true));
    }
  }
  return files;
}

async function validateActionGifs() {
  const category = standards.categories.actionGif;
  const directory = absolute(category.directory);
  if (!Number.isInteger(category.frameDelayMs) || category.frameDelayMs <= 0) {
    throw new Error('asset-standards.json debe definir un frameDelayMs positivo para los GIF de acción.');
  }
  if (category.frameRateFps !== 1000 / category.frameDelayMs) {
    throw new Error('frameRateFps debe coincidir con 1000 / frameDelayMs en asset-standards.json.');
  }
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
        metadata.delay.some((delay) => delay !== category.frameDelayMs)
      )
    ) {
      throw new Error(relativePath + ': todos los cuadros deben durar exactamente ' + category.frameDelayMs + ' ms.');
    }
  }

  return files.length;
}

async function validateEffectGifs() {
  const category = standards.categories.effectAnimation;
  const files = [];

  for (const directory of category.directories) {
    const absoluteDirectory = absolute(directory);
    if (!await fileExists(absoluteDirectory)) {
      throw new Error('No existe el directorio de efectos manuales: ' + directory);
    }
    files.push(...await collectGifFiles(absoluteDirectory, true));
  }

  if (!files.length) {
    throw new Error('No se encontraron GIF manuales para validar en los directorios de efectos.');
  }

  let validated = 0;
  for (const filename of files.sort()) {
    const relativePath = path.relative(ROOT, filename).split(path.sep).join('/');
    const gif = await sharp(filename, { animated: true, failOn: 'error' }).metadata();

    assertEqual(gif.format, 'gif', relativePath + ' formato');
    if (!Number.isInteger(gif.width) || gif.width <= 0 ||
        !Number.isInteger(gif.pageHeight ?? gif.height) || (gif.pageHeight ?? gif.height) <= 0) {
      throw new Error(relativePath + ': dimensiones de fotograma inválidas.');
    }
    if (category.alphaRequired && !gif.hasAlpha) {
      throw new Error(relativePath + ': falta la transparencia.');
    }
    if (!Number.isInteger(gif.pages) || gif.pages < category.minimumFrames) {
      throw new Error(relativePath + ': se requieren al menos ' + category.minimumFrames + ' fotogramas.');
    }
    if (!Array.isArray(gif.delay) || gif.delay.length !== gif.pages ||
        gif.delay.some((delay) => !Number.isFinite(delay) || delay <= 0)) {
      throw new Error(relativePath + ': la duración de los fotogramas es inválida.');
    }

    // Fuerza la decodificación de todos los fotogramas sin escribir ni modificar archivos.
    const decoded = await sharp(filename, { animated: true, failOn: 'error' })
      .ensureAlpha()
      .raw()
      .toBuffer();
    if (!decoded.length) {
      throw new Error(relativePath + ': no se pudo decodificar el contenido de los fotogramas.');
    }

    validated += 1;
  }
  return validated;
}

async function main() {
  await validateArtwork();

  const gifCount = await validateActionGifs();
  const effectGifCount = await validateEffectGifs();

  console.log(
    'Recursos fuente validados en modo de solo lectura: ' +
    gifCount + ' GIF de acción y ' + effectGifCount +
    ' GIF de efectos manuales, además de los masters de artwork.',
  );
}

main().catch((error) => {
  console.error('Falló la validación global de recursos gráficos:', error);
  process.exitCode = 1;
});
