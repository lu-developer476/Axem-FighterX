import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import {
  detectCheckerboardColors,
  removeCheckerboardBackground,
} from '../src/infrastructure/graphics/checkerboardBackground.js';

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

function isDarkNeutral(red, green, blue) {
  return Math.max(red, green, blue) <= 56 &&
    Math.max(red, green, blue) - Math.min(red, green, blue) <= 24;
}

async function repairOrange() {
  // Parte de la subida original del usuario. No se recrea desde Red ni se recolorea.
  const source = readAtCommit(ORANGE_UPLOAD_COMMIT, ORANGE_PATH);
  const metadata = await sharp(source).metadata();
  if (metadata.format !== 'png' || metadata.width !== 857 || metadata.height !== 1171) {
    throw new Error(
      'La última subida Orange debe ser PNG 857×1171; se encontró ' +
      metadata.format + ' ' + metadata.width + '×' + metadata.height,
    );
  }

  // El upload viene opaco. Se identifica exclusivamente el fondo exterior
  // conectado al borde; el RGB de todos los píxeles del dibujo se conserva.
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const borderHistogram = new Map();
  const addBorderPixel = (x, y) => {
    const offset = (y * info.width + x) * 4;
    const key = [pixels[offset] >> 4, pixels[offset + 1] >> 4, pixels[offset + 2] >> 4].join(',');
    const entry = borderHistogram.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    entry.count += 1;
    entry.red += pixels[offset];
    entry.green += pixels[offset + 1];
    entry.blue += pixels[offset + 2];
    borderHistogram.set(key, entry);
  };
  for (let x = 0; x < info.width; x += 1) {
    addBorderPixel(x, 0);
    addBorderPixel(x, info.height - 1);
  }
  for (let y = 1; y < info.height - 1; y += 1) {
    addBorderPixel(0, y);
    addBorderPixel(info.width - 1, y);
  }
  const borderSummary = [...borderHistogram.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((entry) => ({
      count: entry.count,
      rgb: [
        Math.round(entry.red / entry.count),
        Math.round(entry.green / entry.count),
        Math.round(entry.blue / entry.count),
      ],
    }));
  console.log('Orange upload border diagnostic: ' + JSON.stringify({
    format: metadata.format,
    hasAlpha: metadata.hasAlpha,
    borderPixels: (info.width + info.height - 2) * 2,
    topColors: borderSummary,
  }));
  const detected = detectCheckerboardColors(pixels, info.width, info.height);
  const keyed = removeCheckerboardBackground(pixels, info.width, info.height, detected.colors);

  let transparent = 0;
  let visible = 0;
  let blackLinework = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) transparent += 1;
    else {
      visible += 1;
      if (isDarkNeutral(pixels[offset], pixels[offset + 1], pixels[offset + 2])) {
        blackLinework += 1;
      }
    }
  }

  const total = info.width * info.height;
  if (
    keyed.removedPixels < total * 0.05 ||
    transparent < total * 0.05 ||
    visible < total * 0.1 ||
    blackLinework < 10000
  ) {
    throw new Error(
      'La extracción del fondo Orange no superó las verificaciones de seguridad: ' +
      JSON.stringify({
        detectedBackground: detected.colors,
        backgroundType: detected.backgroundType,
        removedPixels: keyed.removedPixels,
        transparent,
        visible,
        blackLinework,
      }),
    );
  }

  const output = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png({ compressionLevel: 9, effort: 10 }).toBuffer();

  const { data: verified, info: verifiedInfo } = await sharp(output)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (verifiedInfo.width !== 857 || verifiedInfo.height !== 1171) {
    throw new Error('Orange cambió de dimensiones durante la extracción del fondo.');
  }
  for (let offset = 0; offset < verified.length; offset += 4) {
    if (
      verified[offset] !== pixels[offset] ||
      verified[offset + 1] !== pixels[offset + 1] ||
      verified[offset + 2] !== pixels[offset + 2] ||
      verified[offset + 3] !== pixels[offset + 3]
    ) {
      throw new Error('El PNG Orange cambió después de codificar el canal alfa.');
    }
  }

  await fs.writeFile(ORANGE_PATH, output);
  console.log(
    'Orange reparado desde la última subida: 857×1171; fondo ' +
    detected.backgroundType + ' ' + JSON.stringify(detected.colors) +
    '; ' + keyed.removedPixels + ' píxeles de fondo eliminados; ' +
    blackLinework + ' píxeles negros/grises conservados. RGB del arte intacto.',
  );
}

async function repairViolet() {
  // Se recupera la versión anterior al margen artificial de 348 px.
  const source = readAtCommit(VIOLET_UPLOAD_COMMIT, VIOLET_PATH);
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 617 || metadata.height !== 1024) {
    throw new Error(
      'El Violet original esperado era 617×1024; se encontró ' +
      metadata.width + '×' + metadata.height,
    );
  }

  // Encajar el arte completo en el lienzo 745×1372 sin recortar ni deformar.
  // El ancho es el factor limitante: deja solo 3 px a los lados y ~72 px
  // arriba/abajo, el mínimo compatible con conservar toda la proporción original.
  const canvas = { width: 745, height: 1372 };
  const padding = 3;
  const scale = Math.min(
    (canvas.width - padding * 2) / metadata.width,
    (canvas.height - padding * 2) / metadata.height,
  );
  const scaledWidth = Math.round(metadata.width * scale);
  const scaledHeight = Math.round(metadata.height * scale);
  const left = Math.floor((canvas.width - scaledWidth) / 2);
  const top = Math.floor((canvas.height - scaledHeight) / 2);
  const right = canvas.width - scaledWidth - left;
  const bottom = canvas.height - scaledHeight - top;

  const output = await sharp(source)
    .ensureAlpha()
    .resize(scaledWidth, scaledHeight, { fit: 'fill', kernel: 'nearest' })
    .extend({
      top,
      bottom,
      left,
      right,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const resultMeta = await sharp(output).metadata();
  const { data: resultRaw, info: resultInfo } = await sharp(output)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = boundsFromAlpha(resultRaw, resultInfo.width, resultInfo.height);
  const visibleWidth = bounds.right - bounds.left;
  const visibleHeight = bounds.bottom - bounds.top;

  if (
    resultMeta.width !== canvas.width ||
    resultMeta.height !== canvas.height ||
    !resultMeta.hasAlpha ||
    visibleWidth < 700 ||
    visibleHeight < 1100 ||
    bounds.left > 20 ||
    bounds.right < 725 ||
    bounds.top > 100 ||
    bounds.bottom < 1270
  ) {
    throw new Error(
      'Violet no llenó el lienzo sin recortes como se esperaba: ' +
      JSON.stringify({ bounds, visibleWidth, visibleHeight, padding: { left, top, right, bottom } }),
    );
  }

  await fs.writeFile(VIOLET_PATH, output);
  console.log(
    'Violet ajustado sin recortes: 745×1372; lienzo transparente añadido ' +
    JSON.stringify({ left, top, right, bottom }) +
    '; límites visibles ' + JSON.stringify(bounds) +
    '; escala nearest-neighbor, proporción original preservada.',
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
