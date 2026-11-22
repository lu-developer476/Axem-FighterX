import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ORANGE_UPLOAD_COMMIT = '93a9715bcd6868b100c5a129669ecf5de1d504ef';
const VIOLET_UPLOAD_COMMIT = '864c7e9fd8da25c0a1ab848bfdf59817f8f4c843';
const ORANGE_PATH = 'art/source/sprites/results/male/orange/super-axem-ranger-orange.png';
const VIOLET_PATH = 'art/source/sprites/results/female/violet/super-axem-ranger-violet.png';

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

function isBlackLinework(red, green, blue) {
  return Math.max(red, green, blue) <= 56 &&
    Math.max(red, green, blue) - Math.min(red, green, blue) <= 24;
}

async function repairOrange() {
  // Se restaura byte por byte la última subida del artwork naranja.
  // El normalizador global ahora lo excluye para no tocar su lineart negro.
  const orangeSource = readAtCommit(ORANGE_UPLOAD_COMMIT, ORANGE_PATH);
  const metadata = await sharp(orangeSource).metadata();
  if (
    metadata.format !== 'png' ||
    metadata.width !== 857 ||
    metadata.height !== 1171
  ) {
    throw new Error(
      'La última subida Orange debe ser PNG 857×1171; se encontró ' +
      metadata.format + ' ' + metadata.width + '×' + metadata.height,
    );
  }

  const { data, info } = await sharp(orangeSource).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  let visible = 0;
  let transparent = 0;
  let black = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] > 0) visible += 1;
    else transparent += 1;
    if (
      data[offset + 3] > 0 &&
      Math.max(data[offset], data[offset + 1], data[offset + 2]) <= 56 &&
      Math.max(data[offset], data[offset + 1], data[offset + 2]) -
        Math.min(data[offset], data[offset + 1], data[offset + 2]) <= 24
    ) black += 1;
  }
  if (!visible || !transparent || !black) {
    throw new Error(
      'Orange no conserva transparencia o lineart negro verificable: ' +
      JSON.stringify({ visible, transparent, black, width: info.width, height: info.height }),
    );
  }

  await fs.writeFile(ORANGE_PATH, orangeSource);
  const written = await fs.readFile(ORANGE_PATH);
  if (!written.equals(orangeSource)) {
    throw new Error('Orange no se restauró byte por byte desde la última subida.');
  }
  console.log(
    'Orange restaurado sin recodificar ni recolorear: ' +
    '857×1171; ' + black + ' píxeles de lineart negro; ' +
    transparent + ' píxeles transparentes; bytes idénticos a la última subida.',
  );
}

async function repairViolet() {
  // Se recupera la versión sin el margen superior artificial de 348 px.
  const violetSource = readAtCommit(VIOLET_UPLOAD_COMMIT, VIOLET_PATH);
  const metadata = await sharp(violetSource).metadata();
  if (metadata.width !== 617 || metadata.height !== 1024) {
    throw new Error(
      'El Violet original esperado era 617×1024, se encontró ' +
      metadata.width + '×' + metadata.height,
    );
  }

  const { data: sourceRaw, info: sourceInfo } = await sharp(violetSource)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sourceBounds = boundsFromAlpha(sourceRaw, sourceInfo.width, sourceInfo.height);

  // Mantiene la proporción del arte: escala a 1366 px de alto, recorta únicamente
  // margen transparente lateral y agrega 3 px transparentes arriba y abajo.
  const scaledHeight = 1366;
  const scaledWidth = Math.round(metadata.width * scaledHeight / metadata.height);
  const cropLeft = Math.floor((scaledWidth - 745) / 2);
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
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
