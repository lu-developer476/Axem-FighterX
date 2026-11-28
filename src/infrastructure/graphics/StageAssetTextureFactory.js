import { ARENA } from '../../domain/arena/arena.js';
import { GAME_HEIGHT } from '../../config/gameConfig.js';
import {
  proceduralTextureKeyForTileset,
  STAGE_TILESET_ASSETS,
} from '../assets/stageAssetManifest.js';
import { createCanvasTexture } from './canvasTexture.js';

const MIN_FOREGROUND_COVERAGE = 0.055;

const PALETTES = Object.freeze({
  cave: { skyTop: '#10131d', skyBottom: '#39414d', far: '#29313e', ground: '#242b32', accent: '#8f9ca8' },
  darkness: { skyTop: '#07151b', skyBottom: '#263b43', far: '#193039', ground: '#1b292d', accent: '#45a7a7' },
  side: { skyTop: '#111b2b', skyBottom: '#637487', far: '#35475a', ground: '#242b39', accent: '#a7c5d2' },
  forest: { skyTop: '#8daebe', skyBottom: '#c2d5a3', far: '#536c56', ground: '#38513a', accent: '#a6c96d' },
  space: { skyTop: '#100c27', skyBottom: '#392b5c', far: '#2c2350', ground: '#211b35', accent: '#8f8cf3' },
  default: { skyTop: '#111522', skyBottom: '#3c4859', far: '#293445', ground: '#252b35', accent: '#b2bdcb' },
});

/** Turns every discovered tileset into a selectable, deterministic environment. */
export function createStageAssetTextures(scene) {
  for (const asset of STAGE_TILESET_ASSETS) {
    if (!scene.textures.exists(asset.key)) continue;
    createProceduralBackground(scene, asset);
  }
}

export function createProceduralBackground(scene, asset, options = {}) {
  const source = scene.textures.get(asset.key).getSourceImage();
  const tileWidth = asset.tileWidth ?? 32;
  const tileHeight = asset.tileHeight ?? 32;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = source.width;
  sourceCanvas.height = source.height;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  sourceContext.drawImage(source, 0, 0);
  const sourcePixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
  const backgroundColor = asset.backgroundColor && asset.backgroundColor !== 'auto'
    ? parseHexColor(asset.backgroundColor)
    : detectCornerBackground(sourcePixels, source.width, source.height);
  const tiles = findUsableTiles(sourcePixels, source.width, source.height, asset, backgroundColor);
  const palette = paletteFor(asset.id);
  const key = options.key ?? proceduralTextureKeyForTileset(asset.key);

  createCanvasTexture(scene, key, ARENA.width, GAME_HEIGHT, (ctx, width, height) => {
    const random = createRandom(options.seed ?? asset.seed ?? 1);
    const pick = () => tiles[Math.floor(random() * tiles.length)];

    ctx.imageSmoothingEnabled = false;
    const gradient = ctx.createLinearGradient(0, 0, 0, ARENA.groundY + 12);
    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawFarHorizon(ctx, width, ARENA.groundY, palette, random);

    // Distant tile clusters create a skyline without adding playable platforms.
    for (let index = 0; index < 28 && tiles.length; index += 1) {
      const tile = pick();
      const scale = random() > 0.84 ? 2 : 1;
      const x = Math.floor(random() * Math.max(1, width - tileWidth * scale));
      const y = Math.floor(36 + random() * 126);
      ctx.globalAlpha = 0.18 + random() * 0.2;
      drawTile(ctx, source, tile, tileWidth, tileHeight, x, y, scale);
    }

    // Structured clusters make random placements read as ruins, cliffs or machinery.
    for (let cluster = 0; cluster < 5 && tiles.length; cluster += 1) {
      const centerX = Math.floor(24 + random() * (width - 48));
      const rows = 2 + Math.floor(random() * 3);
      const columns = 1 + Math.floor(random() * 2);
      const baseY = ARENA.groundY - tileHeight * rows;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          if (random() < 0.16) continue;
          ctx.globalAlpha = 0.34 + random() * 0.24;
          drawTile(
            ctx,
            source,
            pick(),
            tileWidth,
            tileHeight,
            centerX + (column - (columns - 1) / 2) * tileWidth,
            baseY + row * tileHeight,
            1,
          );
        }
      }
    }

    // A ground strip aligns with ARENA.groundY but adds no collision geometry.
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, ARENA.groundY, width, height - ARENA.groundY);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(0, ARENA.groundY, width, 2);

    if (tiles.length) {
      for (let x = 0; x < width; x += tileWidth) {
        ctx.globalAlpha = 0.78 + random() * 0.18;
        drawTile(ctx, source, pick(), tileWidth, tileHeight, x, ARENA.groundY, 1);
      }
      for (let y = ARENA.groundY + tileHeight; y < height; y += tileHeight) {
        for (let x = 0; x < width; x += tileWidth) {
          ctx.globalAlpha = 0.44;
          drawTile(ctx, source, pick(), tileWidth, tileHeight, x, y, 1);
        }
      }
    }

    ctx.globalAlpha = 1;
    if (backgroundColor) removeKeyedBackground(ctx, width, height, backgroundColor);
  });

  return { key, tileCount: tiles.length };
}

/**
 * Construye patrones largos a partir de tiles repetibles para usarlos como fondos
 * en movimiento. La carrera puede avanzar sin mover horizontalmente a los corredores.
 */
/** Compone mapas terminados en una panorámica horizontal para las carreras. */
export function createLoopingMapTexture(scene, assets, {
  key = 'race-map-course',
  height = GAME_HEIGHT,
  cropTop = 0,
  cropHeight = null,
} = {}) {
  const available = (assets ?? []).filter((asset) => scene.textures.exists(asset.key));
  if (!available.length) return null;
  if (!Number.isInteger(height) || height < 1) {
    throw new RangeError('La altura de la panorámica debe ser un entero positivo.');
  }
  const sections = available.map((asset) => {
    const source = scene.textures.get(asset.key).getSourceImage();
    const sectionHeight = Math.max(1, Math.min(source.height, Math.floor(cropHeight ?? source.height)));
    const top = Math.max(0, Math.min(source.height - sectionHeight, Math.floor(cropTop)));
    return {
      source,
      top,
      sectionHeight,
      width: Math.max(1, Math.round(source.width * height / sectionHeight)),
    };
  });
  const width = sections.reduce((total, section) => total + section.width, 0);
  createCanvasTexture(scene, key, width, height, (ctx) => {
    let left = 0;
    for (const section of sections) {
      ctx.drawImage(section.source, 0, section.top, section.source.width, section.sectionHeight,
        left, 0, section.width, height);
      left += section.width;
    }
  });
  return key;
}

/**
 * Renderiza mapas Tiled sobre un atlas de tiles y los concatena en una cinta horizontal.
 * Las capas se dibujan en el orden original del mapa para conservar fondo y primer plano.
 */
export function createLoopingTiledMapTexture(scene, maps, {
  key = 'race-tiled-map',
  atlasKey,
  height = GAME_HEIGHT,
} = {}) {
  const available = (maps ?? []).filter((map) =>
    Number.isInteger(map?.width) &&
    Number.isInteger(map?.height) &&
    Array.isArray(map.layers),
  );
  if (!available.length || !atlasKey || !scene.textures.exists(atlasKey)) return null;
  if (!Number.isInteger(height) || height < 1) {
    throw new RangeError('La altura del mapa Tiled debe ser un entero positivo.');
  }

  const source = scene.textures.get(atlasKey).getSourceImage();
  const firstTileset = available[0].tilesets?.[0];
  const tileWidth = Number(firstTileset?.tilewidth ?? available[0].tilewidth ?? 18);
  const tileHeight = Number(firstTileset?.tileheight ?? available[0].tileheight ?? tileWidth);
  const columns = Number(firstTileset?.columns ?? Math.floor(source.width / tileWidth));
  if (!Number.isInteger(tileWidth) || tileWidth < 1 ||
      !Number.isInteger(tileHeight) || tileHeight < 1 ||
      !Number.isInteger(columns) || columns < 1) {
    throw new RangeError('El tileset del mapa Tiled tiene una cuadrícula inválida.');
  }

  const sections = available.map((map) => {
    const scale = height / (map.height * tileHeight);
    return {
      map,
      scale,
      width: Math.max(1, Math.round(map.width * tileWidth * scale)),
    };
  });
  const width = sections.reduce((total, section) => total + section.width, 0);
  createCanvasTexture(scene, key, width, height, (ctx) => {
    ctx.imageSmoothingEnabled = false;
    let offsetX = 0;
    for (const section of sections) {
      const { map, scale } = section;
      const mapWidth = map.width * tileWidth * scale;
      ctx.fillStyle = map.backgroundcolor ?? '#b9e9e6';
      ctx.fillRect(offsetX, 0, mapWidth, height);
      for (const layer of map.layers) {
        if (layer.type !== 'tilelayer' || layer.visible === false || !Array.isArray(layer.data)) continue;
        const expectedTiles = map.width * map.height;
        if (layer.data.length !== expectedTiles) {
          throw new RangeError('La capa "' + (layer.name ?? 'sin nombre') + '" no coincide con las dimensiones del mapa.');
        }
        for (let index = 0; index < layer.data.length; index += 1) {
          const gid = (Number(layer.data[index]) >>> 0) & 0x1fffffff;
          if (!gid) continue;
          const tileIndex = gid - 1;
          const sourceX = (tileIndex % columns) * tileWidth;
          const sourceY = Math.floor(tileIndex / columns) * tileHeight;
          if (sourceX < 0 || sourceY < 0 ||
              sourceX + tileWidth > source.width || sourceY + tileHeight > source.height) {
            throw new RangeError('El tile GID ' + gid + ' excede el atlas "' + atlasKey + '".');
          }
          const x = offsetX + (index % map.width) * tileWidth * scale;
          const y = Math.floor(index / map.width) * tileHeight * scale;
          ctx.drawImage(source, sourceX, sourceY, tileWidth, tileHeight, x, y,
            tileWidth * scale, tileHeight * scale);
        }
      }
      offsetX += section.width;
    }
  });
  return key;
}

/**
 * Recorta objetos con función jugable desde coordenadas explícitas de los tilesets.
 * Cada salida se asocia a una clave estable del objeto en lugar de elegir un tile al azar.
 */
/**
 * Recorta cada objeto de una hoja y lo instancia como un Phaser Image separado.
 * El atlas solo se usa como fuente de píxeles: nunca se muestra ni se aplana
 * como una única textura ambiental.
 */
export function createTilesetEnvironmentSprites(scene, assets, placements, {
  prefix = 'race-environment-object',
  worldCycle = 1800,
  repetitions = 3,
} = {}) {
  const assetsById = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const textureSpecs = (placements ?? []).map((item) => {
    const asset = assetsById.get(item.assetId);
    if (!asset) throw new Error('Falta el tileset "' + item.assetId + '" para "' + item.id + '".');
    return {
      id: item.id,
      asset,
      x: item.source.x,
      y: item.source.y,
      width: item.source.width,
      height: item.source.height,
    };
  });
  const textures = createTilesetObjectTextures(scene, textureSpecs, { prefix });

  const instances = [];
  const repeatCount = Math.max(1, Math.floor(repetitions));
  const repeatWidth = Math.max(1, Math.floor(worldCycle));

  for (let cycle = 0; cycle < repeatCount; cycle += 1) {
    for (const item of placements ?? []) {
      const worldX = item.x + cycle * repeatWidth;
      const image = scene.add.image(worldX, item.y, textures[item.id])
        .setOrigin(0, 0)
        .setDisplaySize(item.width, item.height)
        .setDepth(item.depth ?? -80)
        .setAlpha(item.alpha ?? 1);
      instances.push(Object.freeze({
        image,
        worldX,
        scrollFactor: item.scrollFactor ?? 0.25,
      }));
    }
  }

  return Object.freeze(instances);
}

export function createTilesetObjectTextures(scene, objectSpecs, {
  prefix = 'race-object',
} = {}) {
  const textures = Object.create(null);

  for (const { id, asset, x, y, width, height } of objectSpecs ?? []) {
    if (!asset || !scene.textures.exists(asset.key)) {
      throw new Error('No se pudo cargar el tileset del objeto "' + id + '".');
    }
    const source = scene.textures.get(asset.key).getSourceImage();
    if (x + width > source.width || y + height > source.height) {
      throw new RangeError('El recorte del objeto "' + id + '" excede el tileset "' + asset.id + '".');
    }

    const key = prefix + '-' + id;
    if (!scene.textures.exists(key)) {
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = source.width;
      sourceCanvas.height = source.height;
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      sourceContext.drawImage(source, 0, 0);
      const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
      const backgroundColor = asset.backgroundColor && asset.backgroundColor !== 'auto'
        ? parseHexColor(asset.backgroundColor)
        : detectCornerBackground(pixels, source.width, source.height);

      const texture = scene.textures.createCanvas(key, width, height);
      const context = texture.getContext();
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, width, height);
      context.drawImage(source, x, y, width, height, 0, 0, width, height);
      if (backgroundColor) removeKeyedBackground(context, width, height, backgroundColor);
      texture.refresh();
    }
    textures[id] = key;
  }

  return Object.freeze({ ...textures });
}

/** Prepara motivos individuales para repetirlos como vegetación, rocas y objetos contextuales. */
export function createTilesetStampTextures(scene, assets, {
  prefix = 'race-prop',
  countPerAsset = 5,
  seed = 1,
} = {}) {
  const stamps = [];
  (assets ?? []).forEach((asset, assetIndex) => {
    if (!scene.textures.exists(asset.key)) return;
    const source = scene.textures.get(asset.key).getSourceImage();
    const tileWidth = asset.tileWidth ?? 32;
    const tileHeight = asset.tileHeight ?? 32;
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = source.width;
    sourceCanvas.height = source.height;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    sourceContext.drawImage(source, 0, 0);
    const sourcePixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
    const backgroundColor = asset.backgroundColor && asset.backgroundColor !== 'auto'
      ? parseHexColor(asset.backgroundColor)
      : detectCornerBackground(sourcePixels, source.width, source.height);
    const tiles = findUsableTiles(sourcePixels, source.width, source.height, asset, backgroundColor);
    if (!tiles.length) return;

    const random = createRandom((seed + assetIndex * 104729) >>> 0);
    const used = new Set();
    for (let index = 0; index < Math.min(countPerAsset, tiles.length); index += 1) {
      let tileIndex = Math.floor(random() * tiles.length);
      while (used.has(tileIndex) && used.size < tiles.length) tileIndex = (tileIndex + 1) % tiles.length;
      used.add(tileIndex);
      const tile = tiles[tileIndex];
      const key = prefix + '-' + assetIndex + '-' + index;
      const texture = scene.textures.createCanvas(key, tileWidth, tileHeight);
      const ctx = texture.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, tile.x, tile.y, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
      if (backgroundColor) removeKeyedBackground(ctx, tileWidth, tileHeight, backgroundColor);
      texture.refresh();
      stamps.push(key);
    }
  });
  return stamps;
}

function paletteFor(id = '') {
  const name = String(id).toLowerCase();
  if (name.includes('cave')) return PALETTES.cave;
  if (name.includes('dark')) return PALETTES.darkness;
  if (name.includes('side')) return PALETTES.side;
  if (name.includes('forest') || name.includes('platformer')) return PALETTES.forest;
  if (name.includes('space')) return PALETTES.space;
  return PALETTES.default;
}

function drawFarHorizon(ctx, width, horizon, palette, random) {
  ctx.fillStyle = palette.far;
  ctx.globalAlpha = 0.4;
  for (let x = 0; x < width; x += 4) {
    const wave = Math.sin(x / 43) * 9 + Math.sin(x / 17) * 4;
    const y = Math.floor(horizon - 26 + wave - random() * 8);
    ctx.fillRect(x, y, 4, horizon - y);
  }
  ctx.globalAlpha = 1;
}

function findUsableTiles(pixels, width, height, asset, backgroundColor) {
  const tileWidth = asset.tileWidth ?? 32;
  const tileHeight = asset.tileHeight ?? 32;
  const strideX = tileWidth + (asset.spacing ?? 0);
  const strideY = tileHeight + (asset.spacing ?? 0);
  const margin = asset.margin ?? 0;
  const tiles = [];

  for (let y = margin; y + tileHeight <= height - margin; y += strideY) {
    for (let x = margin; x + tileWidth <= width - margin; x += strideX) {
      let visible = 0;
      const sampleStepX = Math.max(1, Math.floor(tileWidth / 7));
      const sampleStepY = Math.max(1, Math.floor(tileHeight / 7));
      for (let py = 0; py < tileHeight; py += sampleStepY) {
        for (let px = 0; px < tileWidth; px += sampleStepX) {
          const offset = ((y + py) * width + x + px) * 4;
          const alpha = pixels[offset + 3];
          if (alpha < 40) continue;
          if (backgroundColor && matchesColor(pixels, offset, backgroundColor, 14)) continue;
          visible += 1;
        }
      }
      const totalSamples = Math.ceil(tileWidth / sampleStepX) * Math.ceil(tileHeight / sampleStepY);
      const coverage = totalSamples ? visible / totalSamples : 0;
      if (coverage >= MIN_FOREGROUND_COVERAGE) tiles.push({ x, y });
    }
  }

  return tiles;
}

function detectCornerBackground(pixels, width, height) {
  const points = [
    [0, 0],
    [Math.max(0, width - 1), 0],
    [0, Math.max(0, height - 1)],
    [Math.max(0, width - 1), Math.max(0, height - 1)],
  ];
  const colors = points.map(([x, y]) => {
    const offset = (y * width + x) * 4;
    return {
      r: pixels[offset],
      g: pixels[offset + 1],
      b: pixels[offset + 2],
      a: pixels[offset + 3],
    };
  }).filter((color) => color.a > 220);

  for (const candidate of colors) {
    const matches = colors.filter((color) =>
      Math.abs(color.r - candidate.r) <= 12
      && Math.abs(color.g - candidate.g) <= 12
      && Math.abs(color.b - candidate.b) <= 12,
    ).length;
    if (matches >= 3) return candidate;
  }
  return null;
}

function parseHexColor(value) {
  const match = /^#?([\da-f]{6})$/i.exec(value);
  if (!match) return null;
  const number = Number.parseInt(match[1], 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
    a: 255,
  };
}

function matchesColor(pixels, offset, color, tolerance) {
  return Math.abs(pixels[offset] - color.r) <= tolerance
    && Math.abs(pixels[offset + 1] - color.g) <= tolerance
    && Math.abs(pixels[offset + 2] - color.b) <= tolerance;
}

function removeKeyedBackground(ctx, width, height, color) {
  const frame = ctx.getImageData(0, 0, width, height);
  const pixels = frame.data;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) continue;
    if (matchesColor(pixels, offset, color, 14)) pixels[offset + 3] = 0;
  }
  ctx.putImageData(frame, 0, 0);
}

function drawTile(ctx, source, tile, tileWidth, tileHeight, x, y, scale = 1) {
  ctx.drawImage(
    source,
    tile.x,
    tile.y,
    tileWidth,
    tileHeight,
    Math.round(x),
    Math.round(y),
    tileWidth * scale,
    tileHeight * scale,
  );
}

function createRandom(initialSeed) {
  let seed = initialSeed >>> 0;
  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
