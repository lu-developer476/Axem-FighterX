import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

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
  // npm test ya procesó el último upload y quitó su fondo. Reparar sobre ese
  // PNG evita volver a introducir el fondo opaco del archivo crudo.
  const orangeSource = await fs.readFile(ORANGE_PATH);
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

  // Normaliza ambos PNG a RGBA sRGB. Una referencia indexada o en escala
  // de grises puede decodificarse con 2 canales; asumir 4 desplazaba el alfa.
  if (!orangeMeta.hasAlpha) {
    throw new Error('Orange procesado perdió su canal alfa antes de la reparación.');
  }
  const [orangeDecoded, redDecoded] = await Promise.all([
    sharp(orangeSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(redSource).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (orangeDecoded.info.channels !== 4 || redDecoded.info.channels !== 4) {
    throw new Error(
      'Orange/Red deben decodificarse como RGBA; canales: ' +
      orangeDecoded.info.channels + '/' + redDecoded.info.channels,
    );
  }
  const orangeRaw = orangeDecoded.data;
  const redRaw = redDecoded.data;
  const outputPixels = new Uint8Array(orangeRaw);
  let restoredBlackColor = 0;
  let referenceBlackPixels = 0;

  for (let offset = 0; offset < outputPixels.length; offset += 4) {
    const oldOrangeAlpha = outputPixels[offset + 3];
    const blackLine = oldOrangeAlpha >= 16 && isBlackLinework(
      redRaw[offset], redRaw[offset + 1], redRaw[offset + 2],
    );

    if (blackLine) {
      referenceBlackPixels += 1;
      if (
        outputPixels[offset] !== redRaw[offset] ||
        outputPixels[offset + 1] !== redRaw[offset + 1] ||
        outputPixels[offset + 2] !== redRaw[offset + 2]
      ) restoredBlackColor += 1;

      // Repone solo el lineart negro de la referencia. El resto de RGB naranja
      // queda intacto, conservando la paleta subida por el usuario.
      outputPixels[offset] = redRaw[offset];
      outputPixels[offset + 1] = redRaw[offset + 1];
      outputPixels[offset + 2] = redRaw[offset + 2];
    }

    // El alfa de Red no se usa: su referencia puede tener un canal de
    // transparencia distinto o no equivalente. Orange conserva su alfa exacto.
    // La transparencia original forma parte del arte y nunca se reconstruye.
    // Solo se recuperan valores RGB del lineart negro en el dibujo original.
    outputPixels[offset + 3] = oldOrangeAlpha;
  }

  const output = await sharp(Buffer.from(outputPixels), {
    raw: { width: orangeMeta.width, height: orangeMeta.height, channels: 4 },
  }).png({ compressionLevel: 9, effort: 10 }).toBuffer();

  const verifyDecoded = await sharp(output).toColourspace('srgb').ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  if (verifyDecoded.info.channels !== 4) {
    throw new Error('Orange reparado no pudo verificarse como RGBA.');
  }
  const verify = verifyDecoded.data;
  for (let offset = 0; offset < verify.length; offset += 4) {
    const expectedAlpha = orangeRaw[offset + 3];
    if (verify[offset + 3] !== expectedAlpha) {
      throw new Error('La transparencia original de Orange no se conservó.');
    }
  }

  await fs.writeFile(ORANGE_PATH, output);
  console.log(
    'Orange reparado: paleta del último upload preservada; ' +
    restoredBlackColor + ' valores negros de RGB restaurados entre ' +
    referenceBlackPixels + ' píxeles negros visibles de referencia; ' +
    'transparencia del PNG procesado preservada exactamente.',
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
