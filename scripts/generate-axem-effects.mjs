import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANDARDS_PATH = path.join(ROOT, 'art', 'source', 'sprites', 'asset-standards.json');
const standards = JSON.parse(await fs.readFile(STANDARDS_PATH, 'utf8'));
const EFFECTS = standards.categories.effectAnimation.files;

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function findHorizontalSegments(data, width, height, maxEmptyColumns) {
  const activeColumns = new Uint32Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) activeColumns[x] += 1;
    }
  }

  const segments = [];
  let start = -1;
  let lastActive = -1;
  for (let x = 0; x < width; x += 1) {
    if (activeColumns[x] > 0) {
      if (start < 0) start = x;
      lastActive = x;
    } else if (start >= 0 && x - lastActive > maxEmptyColumns) {
      segments.push({ left: start, right: lastActive + 1 });
      start = -1;
      lastActive = -1;
    }
  }
  if (start >= 0) segments.push({ left: start, right: lastActive + 1 });
  return segments;
}

// Elimina solo el blanco conectado al borde. Los píxeles blancos encerrados
// dentro del dibujo (brillos y núcleos) forman parte del arte y deben conservarse.
function removeWhiteBackground(data, width, height, threshold = 250) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueueIfBackground = (pixelIndex) => {
    if (visited[pixelIndex]) return;
    const offset = pixelIndex * 4;
    if (
      data[offset] < threshold ||
      data[offset + 1] < threshold ||
      data[offset + 2] < threshold
    ) return;
    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueueIfBackground(x);
    enqueueIfBackground((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueueIfBackground(y * width);
    enqueueIfBackground(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    data[pixelIndex * 4 + 3] = 0;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueueIfBackground(pixelIndex - 1);
    if (x + 1 < width) enqueueIfBackground(pixelIndex + 1);
    if (y > 0) enqueueIfBackground(pixelIndex - width);
    if (y + 1 < height) enqueueIfBackground(pixelIndex + width);
  }
  return tail;
}

function visibleBounds(data, width, height, left, right) {
  let top = height;
  let bottom = -1;
  let visibleLeft = right;
  let visibleRight = left - 1;
  for (let y = 0; y < height; y += 1) {
    for (let x = left; x < right; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      visibleLeft = Math.min(visibleLeft, x);
      visibleRight = Math.max(visibleRight, x);
    }
  }
  if (bottom < top || visibleRight < visibleLeft) return null;
  return { left: visibleLeft, right: visibleRight + 1, top, bottom: bottom + 1 };
}

function buildSegmentFrame(source, width, height, segment, mode) {
  const bounds = visibleBounds(source, width, height, segment.left, segment.right);
  if (!bounds) return null;

  const cropWidth = bounds.right - bounds.left;
  const cropHeight = bounds.bottom - bounds.top;
  const frame = Buffer.alloc(width * height * 4);
  const targetLeft = mode === 'travel-strip'
    ? bounds.left
    : Math.floor((width - cropWidth) / 2);
  const targetTop = Math.floor((height - cropHeight) / 2);

  for (let y = 0; y < cropHeight; y += 1) {
    const sourceStart = ((bounds.top + y) * width + bounds.left) * 4;
    const sourceEnd = sourceStart + cropWidth * 4;
    const targetStart = ((targetTop + y) * width + targetLeft) * 4;
    source.copy(frame, targetStart, sourceStart, sourceEnd);
  }
  return frame;
}

function buildHorizontalCellFrame(source, width, height, segment, frameWidth) {
  const frame = Buffer.alloc(frameWidth * height * 4);
  const cellWidth = segment.right - segment.left;
  for (let y = 0; y < height; y += 1) {
    const sourceStart = (y * width + segment.left) * 4;
    const sourceEnd = sourceStart + cellWidth * 4;
    source.copy(frame, y * frameWidth * 4, sourceStart, sourceEnd);
  }
  return frame;
}

function createHorizontalSegments(width, count) {
  return Array.from({ length: count }, (_, index) => ({
    left: Math.floor(index * width / count),
    right: Math.floor((index + 1) * width / count),
  }));
}

async function makeGif(config) {
  const sourcePath = absolute(config.source);
  const outputPath = absolute(config.output);
  if (!await fileExists(sourcePath)) {
    await fs.rm(outputPath, { force: true });
    console.log(config.source + ': fuente opcional ausente; se omite su GIF derivado.');
    return false;
  }
  const metadata = await sharp(sourcePath, { failOn: 'error' }).metadata();
  assert(metadata.format === 'png', config.source + ': se esperaba PNG.');
  assert(metadata.width > 0 && metadata.height > 0, config.source + ': lienzo inválido.');

  const decoded = await sharp(sourcePath, { failOn: 'error' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = decoded;
  const width = info.width;
  const height = info.height;
  let frames;

  if (config.backgroundRemoval === 'white') {
    const removedPixels = removeWhiteBackground(
      data,
      width,
      height,
      config.whiteThreshold ?? 250,
    );
    assert(removedPixels > 0, config.source + ': no se detectó el fondo blanco conectado al borde.');
  }

  let frameWidth = width;
  if (config.frameLayout === 'horizontal-cells') {
    const frameCount = config.frameCount;
    assert(
      Number.isInteger(frameCount) && frameCount >= 2 && frameCount <= width,
      config.source + ': frameCount inválido para separar celdas horizontales.',
    );
    frameWidth = config.frameWidth ?? Math.ceil(width / frameCount);
    assert(
      Number.isInteger(frameWidth) && frameWidth >= Math.ceil(width / frameCount),
      config.source + ': frameWidth no alcanza para todas las celdas.',
    );
    const segments = createHorizontalSegments(width, frameCount);
    frames = segments.map((segment) =>
      buildHorizontalCellFrame(data, width, height, segment, frameWidth)
    );
  } else if (config.frameLayout === 'horizontal-strip') {
    const frameCount = config.frameCount;
    assert(
      Number.isInteger(frameCount) && frameCount >= 2 && frameCount <= width,
      config.source + ': frameCount inválido para separar la tira horizontal.',
    );
    const segments = createHorizontalSegments(width, frameCount);
    frames = segments
      .map((segment) => buildSegmentFrame(data, width, height, segment, 'travel-strip'))
      .filter(Boolean);
  } else {
    const segments = findHorizontalSegments(
      data,
      width,
      height,
      config.maxEmptyColumns ?? 2,
    );
    const minimumFrames = config.minFrames ?? 2;
    assert(
      segments.length >= minimumFrames,
      config.source + ': se detectaron solo ' + segments.length +
        ' fotogramas; no se aplicarán cortes aproximados.',
    );
    frames = segments
      .map((segment) => buildSegmentFrame(data, width, height, segment, config.mode))
      .filter(Boolean);
  }

  if (config.strictFrameCount) {
    assert(
      frames.length === config.frameCount,
      config.source + ': se generaron ' + frames.length +
        ' fotogramas; se esperaban exactamente ' + config.frameCount + '.',
    );
  }

  assert(frames.length >= 2, config.source + ': la animación necesita al menos dos cuadros.');
  const pngFrames = await Promise.all(frames.map((frame) =>
    sharp(frame, { raw: { width: frameWidth, height, channels: 4 } })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer()
  ));
  const delay = Array.from({ length: pngFrames.length }, () => config.frameDelay ?? 80);
  const gif = await sharp(pngFrames, { join: { animated: true } })
    .gif({
      loop: 0,
      delay,
      effort: 10,
      dither: 0,
      interFrameMaxError: 0,
      interPaletteMaxError: 0,
      keepDuplicateFrames: true,
    })
    .toBuffer();

  const verified = await sharp(gif, { animated: true, failOn: 'error' }).metadata();
  assert(verified.format === 'gif', config.output + ': no se codificó como GIF.');
  assert(verified.width === frameWidth, config.output + ': ancho del fotograma incorrecto.');
  assert((verified.pageHeight ?? verified.height) === height, config.output + ': cambió el alto del lienzo.');
  assert((verified.pages ?? 0) === pngFrames.length, config.output + ': se alteró la cantidad de cuadros.');
  assert(verified.hasAlpha, config.output + ': se perdió la transparencia.');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, gif);
  console.log(
    path.relative(ROOT, outputPath) + ': ' + pngFrames.length + ' cuadros · ' +
    frameWidth + 'x' + height + ' px · ' + (config.frameDelay ?? 80) +
    ' ms/cuadro · loop infinito · transparencia conservada · ' +
    (gif.length / 1024).toFixed(1) + ' KiB.',
  );
}


const WHITE_CANON_ACTIONS = [
  { source: 'axem-white-canon-dash.png', output: 'canon-dash.gif', frameDelay: 100, maxEmptyColumns: 0 },
  { source: 'axem-white-special-attack.png', output: 'special-attack.gif', frameDelay: 100 },
  { source: 'axem-white-canon-pose.png', output: 'canon-pose.gif', frameDelay: 100 },
  { source: 'axem-white-charge.png', output: 'axem-white-charge.gif', frameDelay: 100 },
];

async function buildWhiteCanonGifs() {
  const sourceDirectory = absolute('art/source/sprites/results/male/white');
  const canvas = { width: 150, height: 100 };

  for (const action of WHITE_CANON_ACTIONS) {
    const sourcePath = path.join(sourceDirectory, action.source);
    const outputPath = path.join(sourceDirectory, action.output);
    if (!await fileExists(sourcePath)) {
      await fs.rm(outputPath, { force: true });
      console.log(action.source + ': recurso opcional eliminado; se retira su GIF derivado.');
      continue;
    }

    try {
      const metadata = await sharp(sourcePath, { failOn: 'error' }).metadata();
      assert(metadata.format === 'png', action.source + ': se esperaba PNG.');
      assert(metadata.width > 0 && metadata.height > 0, action.source + ': lienzo vacío.');

      const decoded = await sharp(sourcePath, { failOn: 'error' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const { data, info } = decoded;
      const segments = findHorizontalSegments(data, info.width, info.height, action.maxEmptyColumns ?? 2);

      // Las hojas White son auxiliares y pueden cambiar de distribución o de
      // cantidad de cuadros. Si la nueva disposición no es una tira horizontal
      // compatible, se conserva el GIF anterior y se deja el PNG intacto.
      if (segments.length < 2) {
        console.warn(action.source + ': no se detectaron al menos dos cuadros; se omite la regeneración.');
        continue;
      }

      const frames = [];
      let unsupportedLayout = false;
      for (const segment of segments) {
        const bounds = visibleBounds(data, info.width, info.height, segment.left, segment.right);
        if (!bounds) {
          unsupportedLayout = true;
          break;
        }
        const cropWidth = bounds.right - bounds.left;
        const cropHeight = bounds.bottom - bounds.top;
        if (cropWidth > canvas.width || cropHeight > canvas.height) {
          unsupportedLayout = true;
          break;
        }

        const frame = Buffer.alloc(canvas.width * canvas.height * 4);
        const targetLeft = Math.floor((canvas.width - cropWidth) / 2);
        const targetTop = Math.floor((canvas.height - cropHeight) / 2);
        for (let y = 0; y < cropHeight; y += 1) {
          const sourceStart = ((bounds.top + y) * info.width + bounds.left) * 4;
          const sourceEnd = sourceStart + cropWidth * 4;
          const targetStart = ((targetTop + y) * canvas.width + targetLeft) * 4;
          data.copy(frame, targetStart, sourceStart, sourceEnd);
        }
        frames.push(frame);
      }

      if (unsupportedLayout || frames.length < 2) {
        console.warn(
          action.source + ': la disposición actual no cabe en el formato de animación 150x100; ' +
          'se conserva el GIF derivado anterior y se omite este recurso.',
        );
        continue;
      }

      const pngFrames = await Promise.all(frames.map((frame) =>
        sharp(frame, { raw: { width: canvas.width, height: canvas.height, channels: 4 } })
          .png({ compressionLevel: 9, effort: 10 })
          .toBuffer()
      ));
      const gif = await sharp(pngFrames, { join: { animated: true } }).gif({
        loop: 0,
        delay: Array.from({ length: pngFrames.length }, () => action.frameDelay),
        effort: 10,
        dither: 0,
        interFrameMaxError: 0,
        interPaletteMaxError: 0,
        keepDuplicateFrames: true,
      }).toBuffer();

      const verified = await sharp(gif, { animated: true, failOn: 'error' }).metadata();
      assert(verified.format === 'gif', action.output + ': no se codificó como GIF.');
      assert(verified.width === canvas.width, action.output + ': ancho de lienzo incorrecto.');
      assert((verified.pageHeight ?? verified.height) === canvas.height, action.output + ': alto de lienzo incorrecto.');
      assert((verified.pages ?? 0) === frames.length, action.output + ': número de cuadros incorrecto.');
      assert(verified.hasAlpha, action.output + ': se perdió la transparencia.');

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, gif);
      console.log(
        path.relative(ROOT, outputPath) + ': ' + pngFrames.length + ' cuadros · ' +
        canvas.width + 'x' + canvas.height + ' px · ' + action.frameDelay +
        ' ms/cuadro · loop infinito · transparencia conservada · ' +
        (gif.length / 1024).toFixed(1) + ' KiB.',
      );
    } catch (error) {
      // Una secuencia auxiliar malformada no debe impedir cargar ni compilar
      // el juego. Los errores en los recursos principales siguen siendo fatales.
      console.warn(action.source + ': se conserva el GIF anterior; recurso auxiliar omitido: ' + error.message);
    }
  }
}

async function main() {
  for (const config of EFFECTS) {
    await makeGif(config);
  }
  await buildWhiteCanonGifs();
  console.log('Animaciones Axem White generadas sin modificar los PNG fuente.');
}

main().catch((error) => {
  console.error('No se pudieron generar las animaciones de efectos Axem White:', error);
  process.exitCode = 1;
});
