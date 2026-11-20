import { RANGER_IDS } from '../../domain/rangers/rangerCatalog.js';
import {
  AXEM_MOVES_ATLAS_KEY,
  sheetTextureKey,
  spriteKeyFor,
} from '../assets/assetManifest.js';
import {
  AXEM_ATLAS_SIZE,
  AXEM_PALETTE_HUES,
  SHARED_ANIMATION_SEQUENCES,
} from '../assets/sharedAxemAtlas.js';
import { removeSpriteBackground } from './removeSpriteBackground.js';

const RANGER_ORDER = [RANGER_IDS.VIOLET, RANGER_IDS.ORANGE];
const BASE_SPRITE_SIZE = Object.freeze({ width: 53, height: 83 });

/**
 * Recorta las mismas coordenadas del mismo atlas para ambos rangers y genera
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
      const textureKey = sheetTextureKey(rangerId, state);
      createPaletteSheet(scene, source, textureKey, sequence, targetHue);
    }

    // La pose de menú, cinemática y fallback también nace del mismo primer
    // cuadro de reposo. Se amplía con nearest-neighbor a la cuadrícula usada
    // por el juego, sin introducir una segunda ilustración.
    const idleKey = sheetTextureKey(rangerId, 'idle');
    const idleTexture = scene.textures.get(idleKey);
    const idleSource = idleTexture.getSourceImage();
    const idleSequence = SHARED_ANIMATION_SEQUENCES.idle;
    const baseTexture = scene.textures.createCanvas(
      spriteKeyFor(rangerId),
      BASE_SPRITE_SIZE.width,
      BASE_SPRITE_SIZE.height,
    );
    const baseContext = baseTexture.getContext();
    baseContext.imageSmoothingEnabled = false;
    baseContext.drawImage(
      idleSource,
      0, 0, idleSequence.frameWidth, idleSequence.frameHeight,
      0, 0, BASE_SPRITE_SIZE.width, BASE_SPRITE_SIZE.height,
    );
    baseTexture.refresh();
  }
}

function createPaletteSheet(scene, source, textureKey, sequence, targetHue) {
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);

  const { x, y, frameWidth, frameHeight, stepX, frameCount } = sequence;
  const sheet = scene.textures.createCanvas(
    textureKey,
    frameWidth * frameCount,
    frameHeight,
  );
  const context = sheet.getContext();
  context.imageSmoothingEnabled = false;

  for (let index = 0; index < frameCount; index++) {
    const sourceX = x + index * stepX;
    const targetX = index * frameWidth;

    context.drawImage(
      source,
      sourceX, y, frameWidth, frameHeight,
      targetX, 0, frameWidth, frameHeight,
    );

    const frameData = context.getImageData(targetX, 0, frameWidth, frameHeight);
    removeSpriteBackground(frameData, {
      tolerance: 36,
      minBorderCoverage: 0.05,
    });
    recolorAxemPixels(frameData, targetHue);
    context.putImageData(frameData, targetX, 0);
  }

  sheet.refresh();
  for (let index = 0; index < frameCount; index++) {
    sheet.add(
      'f' + index,
      0,
      index * frameWidth,
      0,
      frameWidth,
      frameHeight,
    );
  }
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
