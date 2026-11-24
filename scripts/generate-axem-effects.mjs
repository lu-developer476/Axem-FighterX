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

function buildSparkFrames(source, width, height, count) {
  const frames = [];
  const frameOffsets = [0, 0, 1, 1, 0, 0, -1, -1];
  for (let frameIndex = 0; frameIndex < count; frameIndex += 1) {
    const output = Buffer.alloc(width * height * 4);
    const yOffset = frameOffsets[frameIndex % frameOffsets.length];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sourceOffset = (y * width + x) * 4;
        const alpha = source[sourceOffset + 3];
        if (alpha === 0) continue;

        // Desincroniza el parpadeo por partícula para evitar que toda la hoja
        // desaparezca a la vez; el desplazamiento de un píxel aporta vibración.
        const phase = (frameIndex / count) * Math.PI * 2 +
          (((x * 17 + y * 31) % 37) / 37) * Math.PI * 2;
        const pulse = 0.24 + 0.76 * ((Math.sin(phase) + 1) / 2);
        const targetY = y + yOffset;
        if (targetY < 0 || targetY >= height) continue;
        const targetOffset = (targetY * width + x) * 4;
        output[targetOffset] = source[sourceOffset];
        output[targetOffset + 1] = source[sourceOffset + 1];
        output[targetOffset + 2] = source[sourceOffset + 2];
        output[targetOffset + 3] = Math.max(1, Math.round(alpha * pulse));
      }
    }
    frames.push(output);
  }
  return frames;
}

async function makeGif(config) {
  const sourcePath = absolute(config.source);
  const outputPath = absolute(config.output);
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

  if (config.mode === 'spark-flicker') {
    frames = buildSparkFrames(data, width, height, config.frameCount ?? 8);
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
        ' segmentos; se requieren al menos ' + minimumFrames +
        '. No se generará un GIF estático por error.',
    );
    frames = segments
      .map((segment) => buildSegmentFrame(data, width, height, segment, config.mode))
      .filter(Boolean);
  }

  assert(frames.length >= 2, config.source + ': la animación necesita al menos dos cuadros.');
  const pngFrames = await Promise.all(frames.map((frame) =>
    sharp(frame, { raw: { width, height, channels: 4 } })
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
  assert(verified.width === width, config.output + ': cambió el ancho del lienzo.');
  assert((verified.pageHeight ?? verified.height) === height, config.output + ': cambió el alto del lienzo.');
  assert((verified.pages ?? 0) === pngFrames.length, config.output + ': se alteró la cantidad de cuadros.');
  assert(verified.hasAlpha, config.output + ': se perdió la transparencia.');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, gif);
  console.log(
    path.relative(ROOT, outputPath) + ': ' + pngFrames.length + ' cuadros · ' +
    width + 'x' + height + ' px · ' + (config.frameDelay ?? 80) +
    ' ms/cuadro · loop infinito · transparencia conservada · ' +
    (gif.length / 1024).toFixed(1) + ' KiB.',
  );
}

async function main() {
  for (const config of EFFECTS) {
    await makeGif(config);
  }
  console.log('Animaciones de efectos Axem White generadas sin modificar los PNG fuente.');
}

main().catch((error) => {
  console.error('No se pudieron generar las animaciones de efectos Axem White:', error);
  process.exitCode = 1;
});
