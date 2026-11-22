import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { detectCheckerboardColors, removeCheckerboardBackground } from '../src/infrastructure/graphics/checkerboardBackground.js';

const ORANGE_UPLOAD_COMMIT = '93a9715bcd6868b100c5a129669ecf5de1d504ef';
const VIOLET_UPLOAD_COMMIT = '864c7e9fd8da25c0a1ab848bfdf59817f8f4c843';
const ORANGE_PATH = 'art/source/sprites/results/male/orange/super-axem-ranger-orange.png';
const VIOLET_PATH = 'art/source/sprites/results/female/violet/super-axem-ranger-violet.png';
const RED_REFERENCE_PATH = 'art/source/sprites/references/axem-red/super-axem-red.png';
const ORANGE_MASTER_PATH = 'art/source/sprites/results/male/orange/source/super-axem-orange-upload.png';
const VIOLET_MASTER_PATH = 'art/source/sprites/results/female/violet/source/super-axem-violet-upload.png';

async function readPreservedOriginal(filePath, commit, sourcePath) {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const original = readAtCommit(commit, sourcePath);
    await fs.mkdir(filePath.slice(0, filePath.lastIndexOf('/')), { recursive: true });
    await fs.writeFile(filePath, original);
    console.log('Se preservó el upload original sin modificar: ' + filePath);
    return original;
  }
}

function countTransparentPixels(data) {
  let count = 0;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] < 16) count += 1;
  }
  return count;
}

function readAtCommit(commit, path) {
  return execFileSync('git', ['show', commit + ':' + path], {
    maxBuffer: 30 * 1024 * 1024,
  });
}

function boundsFromAlpha(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('El artwork no tiene píxeles visibles.');
  return { left: minX, top: minY, right: maxX + 1, bottom: maxY + 1 };
}

function detectOrangeUploadBackground(data, width, height) {
  const histogram = new Map();
  const add = (x, y) => {
    const offset = (y * width + x) * 4;
    if (data[offset + 3] < 16) return;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const key = (red >> 4) + ',' + (green >> 4) + ',' + (blue >> 4);
    const entry = histogram.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    entry.count += 1;
    entry.red += red;
    entry.green += green;
    entry.blue += blue;
    histogram.set(key, entry);
  };

  for (let x = 0; x < width; x += 1) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    add(0, y);
    add(width - 1, y);
  }

  const ranked = Array.from(histogram.values()).sort((a, b) => b.count - a.count);
  const perimeter = ranked.reduce((sum, entry) => sum + entry.count, 0);
  if (!perimeter || !ranked.length) throw new Error('El perímetro del upload Orange está vacío.');

  const colorOf = (entry) => [
    Math.round(entry.red / entry.count),
    Math.round(entry.green / entry.count),
    Math.round(entry.blue / entry.count),
  ];
  const first = colorOf(ranked[0]);
  const firstCoverage = ranked[0].count / perimeter;
  const neutral = (color) => Math.max(...color) - Math.min(...color) <= 24;
  const brightness = (color) => (color[0] + color[1] + color[2]) / 3;

  // Regla local del upload Orange: un tono neutro oscuro solo se acepta como
  // fondo sólido si domina claramente el perímetro completo.
  if (firstCoverage >= 0.65 && neutral(first)) {
    return { colors: [first], coverage: firstCoverage, mode: 'solid-dark-or-neutral' };
  }

  const secondEntry = ranked[1];
  if (secondEntry) {
    const second = colorOf(secondEntry);
    const secondCoverage = secondEntry.count / perimeter;
    const distance = Math.sqrt(
      (first[0] - second[0]) ** 2 +
      (first[1] - second[1]) ** 2 +
      (first[2] - second[2]) ** 2,
    );
    if (
      firstCoverage >= 0.12 &&
      secondCoverage >= 0.12 &&
      firstCoverage + secondCoverage >= 0.55 &&
      neutral(first) &&
      neutral(second) &&
      distance >= 12 &&
      distance <= 110
    ) {
      return {
        colors: [first, second],
        coverage: firstCoverage + secondCoverage,
        mode: 'dark-or-neutral-checkerboard',
      };
    }
  }

  const detected = detectCheckerboardColors(data, width, height);
  return {
    colors: detected.colors,
    coverage: detected.borderCoverage ?? null,
    mode: detected.backgroundType ?? 'generic-detection',
  };
}

function isBlackLinework(red, green, blue) {
  return Math.max(red, green, blue) <= 56 &&
    Math.max(red, green, blue) - Math.min(red, green, blue) <= 24;
}

async function repairOrange() {
  // Orange conserva la escala y la ocupación de su upload original.
  // El ajuste de escala se aplica al derivado Red en prepare-super-rangers.mjs.
  const orangeSource = await readPreservedOriginal(ORANGE_MASTER_PATH, ORANGE_UPLOAD_COMMIT, ORANGE_PATH);
  const redSource = await fs.readFile(RED_REFERENCE_PATH);
  const [orangeMeta, redMeta, orangeDecoded] = await Promise.all([
    sharp(orangeSource).metadata(),
    sharp(redSource).metadata(),
    sharp(orangeSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);

  if (orangeMeta.width !== 857 || orangeMeta.height !== 1171 ||
      redMeta.width !== orangeMeta.width || redMeta.height !== orangeMeta.height) {
    throw new Error('Orange y Red deben compartir un lienzo 857×1171: ' +
      orangeMeta.width + '×' + orangeMeta.height + ' / ' + redMeta.width + '×' + redMeta.height);
  }
  if (!redMeta.hasAlpha) throw new Error('La referencia Red debe tener transparencia.');

  const orangePixels = new Uint8ClampedArray(
    orangeDecoded.data.buffer, orangeDecoded.data.byteOffset, orangeDecoded.data.byteLength,
  );
  let sourceBackgroundRemoved = 0;

  // Si el master Orange llegó opaco, retirar solo el fondo conectado al borde.
  if (countTransparentPixels(orangePixels) === 0) {
    const detected = detectOrangeUploadBackground(
      orangePixels, orangeDecoded.info.width, orangeDecoded.info.height,
    );
    const cleaned = removeCheckerboardBackground(
      orangePixels, orangeDecoded.info.width, orangeDecoded.info.height, detected.colors,
    );
    sourceBackgroundRemoved = cleaned.removedPixels;
    console.log(
      'Fondo del upload Orange: tipo=' + detected.mode +
      '; colores=' + JSON.stringify(detected.colors) +
      '; cobertura del perímetro=' + detected.coverage,
    );
    if (sourceBackgroundRemoved < orangeDecoded.info.width * orangeDecoded.info.height * 0.1) {
      throw new Error('No se pudo retirar con confianza el fondo del upload Orange.');
    }
  }

  const sourceBounds = boundsFromAlpha(orangePixels, orangeDecoded.info.width, orangeDecoded.info.height);
  const sourceWidth = sourceBounds.right - sourceBounds.left;
  const sourceHeight = sourceBounds.bottom - sourceBounds.top;
  if (sourceWidth < 100 || sourceHeight < 100) {
    throw new Error('Los límites visibles del upload Orange no parecen un artwork completo: ' +
      JSON.stringify(sourceBounds));
  }

  // No se reescala Orange: se conserva su escala original y solo se limpia el fondo.
  const output = await sharp(Buffer.from(orangePixels), {
    raw: { width: orangeDecoded.info.width, height: orangeDecoded.info.height, channels: 4 },
  }).png({ compressionLevel: 9, effort: 10 }).toBuffer();

  const verified = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const resultBounds = boundsFromAlpha(verified.data, verified.info.width, verified.info.height);
  if (
    resultBounds.left !== sourceBounds.left ||
    resultBounds.top !== sourceBounds.top ||
    resultBounds.right !== sourceBounds.right ||
    resultBounds.bottom !== sourceBounds.bottom
  ) {
    throw new Error('Orange cambió su ocupación visible al preservar el upload original: ' +
      'fuente=' + JSON.stringify(sourceBounds) + '; resultado=' + JSON.stringify(resultBounds));
  }

  await fs.writeFile(ORANGE_PATH, output);
  console.log('Orange conserva su escala original: lienzo=' + orangeMeta.width + '×' + orangeMeta.height +
    '; caja visible=' + JSON.stringify(resultBounds) +
    '; fondo quitado=' + sourceBackgroundRemoved + ' px. Sin resize, crop ni deformación.');
}
async function repairViolet() {
  // Se recupera la versión sin el margen superior artificial de 348 px.
  const violetSource = await readPreservedOriginal(VIOLET_MASTER_PATH, VIOLET_UPLOAD_COMMIT, VIOLET_PATH);
  const metadata = await sharp(violetSource).metadata();
  if (metadata.width !== 617 || metadata.height !== 1024) {
    throw new Error(
      'El Violet original esperado era 617×1024, se encontró ' +
      metadata.width + '×' + metadata.height,
    );
  }

  const { data: sourceRaw, info: sourceInfo } = await sharp(violetSource)
    .toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sourceBounds = boundsFromAlpha(sourceRaw, sourceInfo.width, sourceInfo.height);

  // Mantiene la proporción del arte: escala a 1366 px de alto, recorta únicamente
  // margen transparente lateral y agrega 3 px transparentes arriba y abajo.
  const scaledHeight = 1366;
  const scaledWidth = Math.round(metadata.width * scaledHeight / metadata.height);
  const cropLeft = Math.floor((scaledWidth - 745) / 2) - 1; // 1 px a la derecha: balancea los márgenes visibles.
  const scaleX = scaledWidth / metadata.width;
  const scaleY = scaledHeight / metadata.height;
  const projected = {
    left: Math.floor(sourceBounds.left * scaleX) - cropLeft,
    right: Math.ceil(sourceBounds.right * scaleX) - cropLeft,
    top: Math.floor(sourceBounds.top * scaleY) + 3,
    bottom: Math.ceil(sourceBounds.bottom * scaleY) + 3,
  };

  if (projected.left < 0 || projected.right > 745 || projected.top < 0 || projected.bottom > 1372) {
    throw new Error('El encuadre ajustado de Violet cortaría píxeles visibles: ' + JSON.stringify(projected));
  }

  const output = await sharp(violetSource)
    .ensureAlpha()
    .resize(scaledWidth, scaledHeight, { fit: 'fill', kernel: 'nearest' })
    .extract({ left: cropLeft, top: 0, width: 745, height: scaledHeight })
    .extend({
      top: 3,
      bottom: 3,
      left: 0,
      right: 0,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const resultMeta = await sharp(output).metadata();
  const { data: resultRaw, info: resultInfo } = await sharp(output)
    .toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const resultBounds = boundsFromAlpha(resultRaw, resultInfo.width, resultInfo.height);

  if (resultMeta.width !== 745 || resultMeta.height !== 1372 || !resultMeta.hasAlpha) {
    throw new Error('Violet no quedó en el lienzo PNG transparente 745×1372.');
  }
  if (
    resultBounds.left > 4 ||
    resultBounds.right < 741 ||
    resultBounds.top > 4 ||
    resultBounds.bottom < 1369
  ) {
    throw new Error('Violet conserva demasiado margen transparente: ' + JSON.stringify(resultBounds));
  }

  await fs.writeFile(VIOLET_PATH, output);
  console.log(
    'Violet ajustado: 745×1372; arte ampliado proporcionalmente con nearest-neighbor; ' +
    'márgenes visibles: ' + JSON.stringify(resultBounds),
  );
}

async function main() {
  await repairOrange();
  await repairViolet();
}

main().catch((error) => {
  console.error('No se pudieron reparar los artworks Super Axem:', error);
  process.exitCode = 1;
});
