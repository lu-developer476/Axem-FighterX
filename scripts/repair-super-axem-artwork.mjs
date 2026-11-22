import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ORANGE_UPLOAD_COMMIT = '93a9715bcd6868b100c5a129669ecf5de1d504ef';
const VIOLET_UPLOAD_COMMIT = '864c7e9fd8da25c0a1ab848bfdf59817f8f4c843';
const ORANGE_PATH = 'art/source/sprites/results/male/orange/super-axem-ranger-orange.png';
const VIOLET_PATH = 'art/source/sprites/results/female/violet/super-axem-ranger-violet.png';
const RED_REFERENCE_PATH = 'art/source/sprites/references/axem-red/super-axem-red.png';

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
  // Se parte del upload original más reciente y se reconstruye la transparencia
  // con el alfa de Red, que comparte exactamente el lienzo 857×1171.
  const orangeSource = readAtCommit(ORANGE_UPLOAD_COMMIT, ORANGE_PATH);
  const redSource = await fs.readFile(RED_REFERENCE_PATH);

  const [orangeMeta, redMeta] = await Promise.all([
    sharp(orangeSource).metadata(),
    sharp(redSource).metadata(),
  ]);
  if (
    orangeMeta.width !== redMeta.width ||
    orangeMeta.height !== redMeta.height ||
    orangeMeta.width !== 857 ||
    orangeMeta.height !== 1171
  ) {
    throw new Error(
      'Orange y la referencia Red no comparten el lienzo esperado: ' +
      orangeMeta.width + '×' + orangeMeta.height + ' / ' +
      redMeta.width + '×' + redMeta.height,
    );
  }
  if (!redMeta.hasAlpha) {
    throw new Error('La referencia Red no tiene canal alfa para reconstruir la silueta.');
  }

  // RGB y alfa de Red se decodifican por separado. El alfa sale del RGBA
  // original, sin convertir el PNG indexado/gris a otro espacio de color.
  const [orangeRgbDecoded, redRgbDecoded, redRgbaDecoded] = await Promise.all([
    sharp(orangeSource).toColourspace('srgb').removeAlpha().raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(redSource).toColourspace('srgb').removeAlpha().raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(redSource).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true }),
  ]);
  const pixelCount = orangeMeta.width * orangeMeta.height;
  if (
    orangeRgbDecoded.info.channels !== 3 ||
    redRgbDecoded.info.channels !== 3 ||
    redRgbaDecoded.info.channels !== 4 ||
    redRgbaDecoded.data.length !== pixelCount * 4
  ) {
    throw new Error(
      'No se pudieron separar RGB y RGBA de Red; canales: ' +
      orangeRgbDecoded.info.channels + '/' +
      redRgbDecoded.info.channels + '/' +
      redRgbaDecoded.info.channels,
    );
  }

  const redRgba = redRgbaDecoded.data;
  const redAlpha = new Uint8Array(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    redAlpha[pixel] = redRgba[pixel * 4 + 3];
  }

  let visibleReferencePixels = 0;
  let transparentReferencePixels = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (redAlpha[pixel] >= 16) visibleReferencePixels += 1;
    else transparentReferencePixels += 1;
  }
  if (visibleReferencePixels < 100000 || transparentReferencePixels < 100000) {
    throw new Error(
      'La máscara alfa Red no parece una silueta válida: visibles=' +
      visibleReferencePixels + ', transparentes=' + transparentReferencePixels,
    );
  }

  const orangeRgb = orangeRgbDecoded.data;
  const redRgb = redRgbDecoded.data;
  const outputPixels = new Uint8Array(pixelCount * 4);
  let restoredBlackColor = 0;
  let referenceBlackPixels = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offsetRgb = pixel * 3;
    const offsetRgba = pixel * 4;
    const maskAlpha = redAlpha[pixel];
    const blackLine = maskAlpha >= 16 && isBlackLinework(
      redRgb[offsetRgb], redRgb[offsetRgb + 1], redRgb[offsetRgb + 2],
    );

    if (blackLine) {
      referenceBlackPixels += 1;
      if (
        orangeRgb[offsetRgb] !== redRgb[offsetRgb] ||
        orangeRgb[offsetRgb + 1] !== redRgb[offsetRgb + 1] ||
        orangeRgb[offsetRgb + 2] !== redRgb[offsetRgb + 2]
      ) restoredBlackColor += 1;

      // Solo RGB negro se recupera desde Red; el resto conserva el color Orange.
      outputPixels[offsetRgba] = redRgb[offsetRgb];
      outputPixels[offsetRgba + 1] = redRgb[offsetRgb + 1];
      outputPixels[offsetRgba + 2] = redRgb[offsetRgb + 2];
    } else {
      outputPixels[offsetRgba] = orangeRgb[offsetRgb];
      outputPixels[offsetRgba + 1] = orangeRgb[offsetRgb + 1];
      outputPixels[offsetRgba + 2] = orangeRgb[offsetRgb + 2];
    }
    // La silueta se reconstruye con el canal alfa real de Red.
    outputPixels[offsetRgba + 3] = maskAlpha;
  }

  const output = await sharp(Buffer.from(outputPixels), {
    raw: { width: orangeMeta.width, height: orangeMeta.height, channels: 4 },
  }).png({ compressionLevel: 9, effort: 10 }).toBuffer();

  // Guarda primero el resultado para que el artefacto de CI permita inspección
  // aun cuando el control de alfa detecte una discrepancia.
  await fs.writeFile(ORANGE_PATH, output);

  const verifyDecoded = await sharp(output).raw().toBuffer({ resolveWithObject: true });
  if (verifyDecoded.info.channels !== 4) {
    throw new Error('Orange reparado no se codificó como PNG RGBA.');
  }
  const verify = verifyDecoded.data;
  let alphaMismatchCount = 0;
  let alphaSevereMismatchCount = 0;
  let maxAlphaDifference = 0;
  const alphaMismatchSamples = [];
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const expected = redAlpha[pixel];
    const actual = verify[pixel * 4 + 3];
    const difference = Math.abs(actual - expected);
    if (difference > 0) {
      alphaMismatchCount += 1;
      if (difference > 1) alphaSevereMismatchCount += 1;
      maxAlphaDifference = Math.max(maxAlphaDifference, difference);
      if (alphaMismatchSamples.length < 8) {
        alphaMismatchSamples.push({ pixel, expected, actual, difference });
      }
    }
  }
  console.log(
    'Verificación alfa Orange: ' + alphaMismatchCount +
    ' diferencias; ' + alphaSevereMismatchCount +
    ' diferencias mayores a 1 nivel; máximo=' + maxAlphaDifference +
    '; muestras=' + JSON.stringify(alphaMismatchSamples),
  );
  if (alphaSevereMismatchCount > pixelCount * 0.001) {
    throw new Error(
      'El PNG exportado difiere significativamente de la máscara Red en ' +
      alphaSevereMismatchCount + ' píxeles alfa.',
    );
  }

  console.log(
    'Orange reparado: RGB Orange preservado fuera del lineart; alfa Red aplicado; ' +
    visibleReferencePixels + ' píxeles visibles y ' + transparentReferencePixels +
    ' transparentes; ' + restoredBlackColor + ' valores RGB negros restaurados de ' +
    referenceBlackPixels + ' píxeles negros visibles de referencia.',
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
