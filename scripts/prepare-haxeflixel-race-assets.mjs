import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'public', 'generated', 'haxeflixel');
const FRAME_WIDTH = 150;
const FRAME_HEIGHT = 100;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const SOURCES = Object.freeze({
  'axem-orange-bike': { file: 'art/source/sprites/results/male/orange/bike.gif' },
  'axem-red-bike': { file: 'art/source/effects/bike/axem-red-bike_x4.gif' },
  'axem-red-bike-up': { file: 'art/source/effects/bike/axem-red-bike-up_x4.gif' },
  'axem-red-bike-down': { file: 'art/source/effects/bike/axem-red-bike-down_x4.gif' },
  'unpiloted-bike': { file: 'art/source/effects/bike/unpiloted-bike_x4.gif' },
  'bike-shoot': { file: 'art/source/effects/bike/bike-shoot_x8.gif' },
  'bike-special-shoot': { file: 'art/source/effects/bike/bike-special-shoot_x8.gif' },
  'axem-orange-run': { file: 'art/source/sprites/results/male/orange/run.gif' },
  'axem-orange-idle': { file: 'art/source/sprites/results/male/orange/idle.gif' },
  'axem-orange-dash': { file: 'art/source/sprites/results/male/orange/dash.gif' },
  // Las acciones opcionales se incorporan automáticamente cuando aparece su GIF fuente.
  'axem-orange-walk': { file: 'art/source/sprites/results/male/orange/walk.gif', optional: true },
  'axem-orange-jump': { file: 'art/source/sprites/results/male/orange/jump.gif', optional: true },
  'axem-orange-roll': { file: 'art/source/sprites/results/male/orange/roll.gif', optional: true },
  // Red reutiliza las animaciones Orange versionadas y vuelve a teñir la armadura a rojo.
  'axem-red-run': { file: 'art/source/sprites/results/male/orange/run.gif', recolorToRed: true },
  'axem-red-idle': { file: 'art/source/sprites/results/male/orange/idle.gif', recolorToRed: true },
  'axem-red-walk': { file: 'art/source/sprites/results/male/orange/run.gif', recolorToRed: true },
  'axem-red-dash': { file: 'art/source/sprites/results/male/orange/dash.gif', recolorToRed: true },
});

function rgbToHsl(red, green, blue) {
  const r = red / 255, g = green / 255, b = blue / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0, saturation = 0;
  if (delta !== 0) {
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
  }
  return [hue, saturation, lightness];
}

function hslToRgb(hue, saturation, lightness) {
  const h = (((hue % 360) + 360) % 360) / 360;
  if (saturation === 0) {
    const gray = Math.round(lightness * 255);
    return [gray, gray, gray];
  }
  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const hueToRgb = (value) => {
    let t = value;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hueToRgb(h + 1 / 3) * 255),
    Math.round(hueToRgb(h) * 255),
    Math.round(hueToRgb(h - 1 / 3) * 255),
  ];
}

async function recolorOrangeFrameToRed(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 16) continue;
    const [hue, saturation, lightness] = rgbToHsl(
      data[offset], data[offset + 1], data[offset + 2],
    );
    // Misma familia cromática que usa el recolor canónico Orange: solo el naranja saturado.
    if (hue < 14 || hue > 32 || saturation < 0.24 || lightness < 0.12) continue;
    const [red, green, blue] = hslToRgb(0, saturation, lightness);
    data[offset] = red;
    data[offset + 1] = green;
    data[offset + 2] = blue;
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

async function convertGifToSpritesheet(sourcePath, targetPath, { recolorToRed = false } = {}) {
  const metadata = await sharp(sourcePath, { animated: true }).metadata();
  const pages = Math.max(1, metadata.pages || 1);
  if (pages < 2) throw new Error('La referencia animada no contiene suficientes cuadros: ' + sourcePath);

  const frames = [];
  for (let page = 0; page < pages; page += 1) {
    const frame = await sharp(sourcePath, { page, pages: 1 })
      .ensureAlpha()
      .resize(FRAME_WIDTH, FRAME_HEIGHT, {
        fit: 'contain',
        position: 'centre',
        kernel: 'nearest',
        background: TRANSPARENT,
      })
      .png()
      .toBuffer();
    frames.push(recolorToRed ? await recolorOrangeFrameToRed(frame) : frame);
  }

  const sheet = await sharp({
    create: {
      width: FRAME_WIDTH * pages,
      height: FRAME_HEIGHT,
      channels: 4,
      background: TRANSPARENT,
    },
  }).composite(frames.map((input, index) => ({
    input,
    left: index * FRAME_WIDTH,
    top: 0,
  }))).png().toBuffer();

  await fs.writeFile(targetPath, sheet);
  console.log('Hoja HaxeFlixel: ' + path.relative(ROOT, targetPath) + ' (' + pages + ' cuadros)');
}

async function syncLandRaceActionAssets(generatedNames) {
  const projectPath = path.join(ROOT, 'haxeflixel', 'project.xml');
  const project = await fs.readFile(projectPath, 'utf8');
  const marker = /<!-- BEGIN GENERATED LAND RACE ACTION ASSETS -->[\s\S]*?<!-- END GENERATED LAND RACE ACTION ASSETS -->/;
  const matches = project.match(marker);
  if (!matches || matches.length !== 1) {
    throw new Error('haxeflixel/project.xml debe contener una única región de assets generados para Carrera Terrestre.');
  }

  const actions = ['idle', 'walk', 'run', 'dash', 'jump', 'roll'];
  const entries = actions
    .filter((action) => generatedNames.has('axem-orange-' + action))
    .map((action) =>
      '  <assets path="../public/generated/haxeflixel/axem-orange-' + action +
      '.png" rename="assets/races/axem-orange-' + action + '.png" />'
    );
  const block = [
    '<!-- BEGIN GENERATED LAND RACE ACTION ASSETS -->',
    ...entries,
    '<!-- END GENERATED LAND RACE ACTION ASSETS -->',
  ].join('\n');
  await fs.writeFile(projectPath, project.replace(marker, block));
}

async function main() {
  await fs.mkdir(OUTPUT, { recursive: true });
  const generatedNames = new Set();
  for (const [name, specification] of Object.entries(SOURCES)) {
    const source = path.join(ROOT, specification.file);
    const target = path.join(OUTPUT, name + '.png');
    try {
      await fs.access(source);
    } catch {
      if (specification.optional === true) {
        await fs.rm(target, { force: true });
        console.log('Animación opcional no disponible: ' + specification.file);
        continue;
      }
      throw new Error('Falta el recurso requerido: ' + specification.file);
    }

    await convertGifToSpritesheet(source, target, {
      recolorToRed: specification.recolorToRed === true,
    });
    generatedNames.add(name);
  }

  await syncLandRaceActionAssets(generatedNames);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
