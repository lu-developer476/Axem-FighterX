import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import {
  AXEM_MOVES_ATLAS_KEY,
  sheetTextureKey,
  spriteKeyFor,
} from '../assets/assetManifest.js';
import { ATLAS_BACKGROUND } from '../assets/atlasLayoutRules.js';
import {
  AXEM_ATLAS_SIZE,
  AXEM_PALETTE_HUES,
  SHARED_ANIMATION_SEQUENCES,
  SHARED_CELL,
  placeFrameInCell,
} from '../assets/sharedAxemAtlas.js';
import { removeSpriteBackground } from './removeSpriteBackground.js';

const RANGER_ORDER = [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE];
const BASE_SPRITE_HEIGHT = 83;
const BASE_SPRITE_WIDTH = Math.round(SHARED_CELL.width * (BASE_SPRITE_HEIGHT / SHARED_CELL.height));

/**
 * Recorta los mismos rectángulos del mismo atlas para ambos rangers y genera
 * dos variantes cromáticas en memoria. Nunca escribe ni modifica los PNG fuente.
 *
 * @param {Phaser.Scene} scene
 */
export function prepareSharedAxemTextures(scene) {
  const atlasTexture = scene.textures.get(AXEM_MOVES_ATLAS_KEY);
  if (!atlasTexture) throw new Error('No se cargó el atlas compartido de Axem Rangers X.');

  const source = atlasTexture.getSourceImage();
  if (source.width < AXEM_ATLAS_SIZE.width || source.height < AXEM_ATLAS_SIZE.height) {
    throw new Error(
      'El atlas de movimientos debe medir al menos ' +
      AXEM_ATLAS_SIZE.width + '×' + AXEM_ATLAS_SIZE.height + ' px.',
    );
  }

  for (const rangerId of RANGER_ORDER) {
    const targetHue = AXEM_PALETTE_HUES[rangerId];

    for (const [state, sequence] of Object.entries(SHARED_ANIMATION_SEQUENCES)) {
      createPaletteSheet(scene, source, sheetTextureKey(rangerId, state), sequence, targetHue);
    }

    // La pose de menú, cinemática y fallback nace del primer cuadro de reposo,
    // ya coloreado. Se amplía con nearest-neighbor, sin una segunda ilustración.
    const idleSource = scene.textures.get(sheetTextureKey(rangerId, 'idle')).getSourceImage();
    if (scene.textures.exists(spriteKeyFor(rangerId))) {
      scene.textures.remove(spriteKeyFor(rangerId));
    }
    const baseTexture = scene.textures.createCanvas(
      spriteKeyFor(rangerId),
      BASE_SPRITE_WIDTH,
      BASE_SPRITE_HEIGHT,
    );
    const baseContext = baseTexture.getContext();
    baseContext.imageSmoothingEnabled = false;
    baseContext.drawImage(
      idleSource,
      0, 0, SHARED_CELL.width, SHARED_CELL.height,
      0, 0, BASE_SPRITE_WIDTH, BASE_SPRITE_HEIGHT,
    );
    baseTexture.refresh();
  }
}

/**
 * Una hoja por estado y paleta: todas las celdas miden lo mismo, así que la
 * escala en pantalla no cambia al pasar de un estado a otro.
 */
function createPaletteSheet(scene, source, textureKey, sequence, targetHue) {
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);

  const { frames, frameCount, baseline } = sequence;
  const sheet = scene.textures.createCanvas(
    textureKey,
    SHARED_CELL.width * frameCount,
    SHARED_CELL.height,
  );
  const context = sheet.getContext();
  context.imageSmoothingEnabled = false;

  frames.forEach((frame, index) => {
    const cutout = cutOutFrame(source, frame, targetHue);
    const { x, y } = placeFrameInCell(frame, baseline);
    context.drawImage(cutout, index * SHARED_CELL.width + x, y);
  });

  sheet.refresh();
  for (let index = 0; index < frameCount; index++) {
    sheet.add('f' + index, 0, index * SHARED_CELL.width, 0, SHARED_CELL.width, SHARED_CELL.height);
  }
}

/**
 * Copia exactamente el rectángulo del cuadro (nunca píxeles de cuadros vecinos),
 * quita el fondo y aplica la paleta. Devuelve un canvas del tamaño del cuadro.
 */
function cutOutFrame(source, frame, targetHue) {
  const padded = document.createElement('canvas');
  padded.width = frame.w + 2;
  padded.height = frame.h + 2;
  const context = padded.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingEnabled = false;

  // Margen de 1 px con el color del fondo: el removedor parte del borde y así
  // ve fondo aunque el personaje toque el rectángulo del cuadro.
  context.fillStyle = 'rgb(' + ATLAS_BACKGROUND.join(',') + ')';
  context.fillRect(0, 0, padded.width, padded.height);
  context.drawImage(source, frame.x, frame.y, frame.w, frame.h, 1, 1, frame.w, frame.h);

  const imageData = context.getImageData(0, 0, padded.width, padded.height);
  // Arte de píxeles de bordes duros: tolerancia mínima para no tocar el personaje.
  removeSpriteBackground(imageData, { tolerance: 4, minBorderCoverage: 0.05 });
  recolorAxemPixels(imageData, targetHue);
  context.putImageData(imageData, 0, 0);

  const cutout = document.createElement('canvas');
  cutout.width = frame.w;
  cutout.height = frame.h;
  const cutoutContext = cutout.getContext('2d');
  cutoutContext.imageSmoothingEnabled = false;
  cutoutContext.drawImage(padded, 1, 1, frame.w, frame.h, 0, 0, frame.w, frame.h);
  return cutout;
}

/**
 * Cambia el tono de la familia roja del sprite y conserva saturación,
 * luminosidad, transparencia y todos los demás colores del personaje.
 *
 * @param {ImageData | { data: Uint8ClampedArray }} imageData
 * @param {number} targetHue grados HSL
 * @returns {number} cantidad de píxeles recoloreados
 */
export function recolorAxemPixels(imageData, targetHue) {
  const { data } = imageData;
  let changed = 0;

  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue;

    const [hue, saturation, lightness] = rgbToHsl(
      data[offset],
      data[offset + 1],
      data[offset + 2],
    );

    if (saturation < 0.32 || !(hue <= 16 || hue >= 336)) continue;

    const [red, green, blue] = hslToRgb(targetHue, saturation, lightness);
    data[offset] = red;
    data[offset + 1] = green;
    data[offset + 2] = blue;
    changed++;
  }

  return changed;
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min);

    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
  }

  return [hue, saturation, lightness];
}

function hslToRgb(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360 / 360;
  if (saturation === 0) {
    const gray = Math.round(lightness * 255);
    return [gray, gray, gray];
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const hueToRgb = (t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  return [
    Math.round(hueToRgb(h + 1 / 3) * 255),
    Math.round(hueToRgb(h) * 255),
    Math.round(hueToRgb(h - 1 / 3) * 255),
  ];
}
