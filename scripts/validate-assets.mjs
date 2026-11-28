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

  for (const relativePath of standards.categories.characterArtwork.additionalReferences ?? []) {
    const filename = absolute(relativePath);
    if (!await fileExists(filename)) {
      throw new Error('No existe el artwork adicional: ' + relativePath);
    }
    const metadata = await sharp(filename, { failOn: 'error' }).metadata();
    assertEqual(metadata.format, 'png', relativePath + ' formato');
    if (!Number.isInteger(metadata.width) || metadata.width <= 0 ||
        !Number.isInteger(metadata.height) || metadata.height <= 0) {
      throw new Error(relativePath + ': dimensiones PNG inválidas.');
    }
    await sharp(filename, { failOn: 'error' }).stats();
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

async function validateSpriteNaming() {
  const directories = [
    {
      path: 'art/source/sprites/results/male/white',
      prefix: 'axem-white-',
      requiredSubdirectory: 'super-white',
    },
    {
      path: 'art/source/sprites/results/male/white/super-white',
      prefix: 'super-white-',
    },
    {
      path: 'art/source/sprites/results/male/orange',
      prefix: 'axem-orange-',
      requiredSubdirectory: 'super-orange',
    },
  ];

  let validatedFiles = 0;
  for (const rule of directories) {
    const directory = absolute(rule.path);
    if (!await fileExists(directory)) {
      throw new Error('No existe el directorio de sprites: ' + rule.path);
    }

    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    const invalid = files.filter((name) => !name.startsWith(rule.prefix));
    if (invalid.length) {
      throw new Error(
        rule.path + ': todos los archivos deben comenzar con "' + rule.prefix +
        '". Archivos inválidos: ' + invalid.join(', '),
      );
    }

    if (rule.requiredSubdirectory &&
        !entries.some((entry) => entry.isDirectory() && entry.name === rule.requiredSubdirectory)) {
      throw new Error(
        rule.path + ': falta el subdirectorio obligatorio "' + rule.requiredSubdirectory + '".',
      );
    }
    validatedFiles += files.length;
  }

  const superOrangeDirectory = absolute('art/source/sprites/results/male/orange/super-orange');
  if (!await fileExists(superOrangeDirectory)) {
    throw new Error('No existe el directorio de artwork maestro: art/source/sprites/results/male/orange/super-orange.');
  }
  const masterFiles = (await fs.readdir(superOrangeDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  if (masterFiles.length !== 1 || masterFiles[0] !== 'super-orange.png') {
    throw new Error(
      'super-orange debe contener únicamente super-orange.png. Archivos encontrados: ' +
      masterFiles.join(', '),
    );
  }

  const misplacedMaster = absolute('art/source/sprites/results/male/orange/super-axem-ranger-orange.png');
  if (await fileExists(misplacedMaster)) {
    throw new Error('El artwork maestro Orange debe residir en la carpeta super-orange.');
  }

  return validatedFiles + masterFiles.length;
}


async function validateReferenceSheets() {
  const category = standards.categories.referenceSheet;
  const files = category.files ?? [];
  if (!files.length) {
    console.log('No hay spritesheets de referencia registrados.');
    return 0;
  }

  for (const relativePath of files) {
    const filename = absolute(relativePath);
    if (!await fileExists(filename)) {
      throw new Error('No existe el spritesheet de referencia: ' + relativePath);
    }
    const fileStats = await fs.stat(filename);
    if (fileStats.size <= 0) {
      throw new Error(relativePath + ': el archivo está vacío.');
    }

    const metadata = await sharp(filename, { failOn: 'error' }).metadata();
    assertEqual(metadata.format, category.format ?? 'png', relativePath + ' formato');
    if (!Number.isInteger(metadata.width) || metadata.width <= 0 ||
        !Number.isInteger(metadata.height) || metadata.height <= 0) {
      throw new Error(relativePath + ': dimensiones de imagen inválidas.');
    }
    if (category.alphaRequired && !metadata.hasAlpha) {
      throw new Error(relativePath + ': el spritesheet requiere canal alfa.');
    }

    // stats() recorre y decodifica el contenido completo sin reescribir el recurso.
    const decoded = await sharp(filename, { failOn: 'error' }).stats();
    if (!Array.isArray(decoded.channels) || decoded.channels.length < 1 ||
        decoded.channels.some((channel) => !Number.isFinite(channel.min) || !Number.isFinite(channel.max))) {
      throw new Error(relativePath + ': no se pudieron decodificar los canales de imagen.');
    }

    console.log(
      relativePath + ': ' + metadata.format.toUpperCase() + ' ' +
      metadata.width + 'x' + metadata.height + ', ' + fileStats.size +
      ' bytes, alpha=' + Boolean(metadata.hasAlpha) + ', decodificación completa correcta.',
    );
  }

  return files.length;
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
      throw new Error(filename + ': marcador GIF inesperado 0x' + marker.toString(16) + '.');
    }

    const x = read16(offset);
    const y = read16(offset + 2);
    const width = read16(offset + 4);
    const height = read16(offset + 6);
    const flags = bytes[offset + 8];
    offset += 9;
    frames.push({ x, y, width, height });

    if (flags & 0x80) {
      offset += 3 * (1 << ((flags & 0x07) + 1));
    }
    offset += 1; // Código mínimo LZW.
    while (offset < bytes.length) {
      const blockSize = bytes[offset++];
      if (blockSize === 0) break;
      offset += blockSize;
    }
  }
  return frames;
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
  // Descubre recursivamente todos los GIF de acción: ningún archivo nuevo puede
  // quedar fuera de la regla de resolución nativa 150×100.
  const canonicalFiles = [];
  for (const relativeDirectory of [category.directory, ...(category.additionalDirectories ?? [])]) {
    const actionDirectory = absolute(relativeDirectory);
    if (!await fileExists(actionDirectory)) {
      throw new Error('No existe el directorio de GIF de acción: ' + relativeDirectory + '.');
    }
    canonicalFiles.push(...await collectGifFiles(actionDirectory, category.recursive === true));
  }
  for (const name of category.files ?? []) {
    const filename = path.join(directory, name);
    if (!canonicalFiles.includes(filename)) {
      throw new Error('Falta el GIF de acción declarado: ' + path.relative(ROOT, filename).split(path.sep).join('/') + '.');
    }
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

    if (
      category.referenceFramePolicy === 'full-canvas' &&
      filename.startsWith(redActionDirectory + path.sep)
    ) {
      const descriptors = await readGifFrameDescriptors(filename);
      assertEqual(descriptors.length, metadata.pages, relativePath + ' cantidad de descriptores');
      for (const [index, frame] of descriptors.entries()) {
        assertEqual(frame.x, 0, relativePath + ' cuadro ' + index + ' X');
        assertEqual(frame.y, 0, relativePath + ' cuadro ' + index + ' Y');
        assertEqual(frame.width, category.width, relativePath + ' cuadro ' + index + ' ancho real');
        assertEqual(frame.height, category.height, relativePath + ' cuadro ' + index + ' alto real');
      }
    }

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
  const spriteFileCount = await validateSpriteNaming();

  const referenceSheetCount = await validateReferenceSheets();
  const gifCount = await validateActionGifs();
  const effectGifCount = await validateEffectGifs();

  console.log(
    'Recursos fuente validados en modo de solo lectura: ' +
    gifCount + ' GIF de acción y ' + effectGifCount +
    ' GIF de efectos manuales, ' + spriteFileCount + ' archivos con nomenclatura verificada, ' + referenceSheetCount + ' spritesheets decodificados y los masters de artwork.',
  );
}

main().catch((error) => {
  console.error('Falló la validación global de recursos gráficos:', error);
  process.exitCode = 1;
});
