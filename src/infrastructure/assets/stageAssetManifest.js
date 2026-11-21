import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';

const MAP_MODULES = import.meta.glob(
  '../../../art/source/environments/maps/*.{png,webp,jpg,jpeg}',
  { eager: true, query: '?url', import: 'default' },
);
const TILESET_MODULES = import.meta.glob(
  '../../../art/source/environments/maps/tilesets/*.{png,webp,jpg,jpeg}',
  { eager: true, query: '?url', import: 'default' },
);
const TILESET_METADATA_MODULES = import.meta.glob(
  '../../../art/source/environments/maps/tilesets/*.json',
  { eager: true, import: 'default' },
);

const STAGE_IDS_LIST = Object.values(STAGE_IDS);
const IMAGE_PRIORITY = Object.freeze({ png: 0, webp: 1, jpg: 2, jpeg: 3 });

export function slugifyAssetName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fileParts(path) {
  const filename = path.split('/').pop() ?? path;
  const dot = filename.lastIndexOf('.');
  return {
    filename,
    stem: dot > 0 ? filename.slice(0, dot) : filename,
    extension: dot > 0 ? filename.slice(dot + 1).toLowerCase() : '',
  };
}

function displayName(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function collectImageFiles(modules, keyPrefix) {
  const grouped = new Map();
  for (const [path, url] of Object.entries(modules)) {
    const parts = fileParts(path);
    const stem = slugifyAssetName(parts.stem);
    if (!stem || typeof url !== 'string') continue;
    const entries = grouped.get(stem) ?? [];
    entries.push({ path, url, ...parts, stem });
    grouped.set(stem, entries);
  }

  return [...grouped.entries()]
    .map(([stem, entries]) => {
      entries.sort((a, b) =>
        (IMAGE_PRIORITY[a.extension] ?? 99) - (IMAGE_PRIORITY[b.extension] ?? 99),
      );
      const selected = entries[0];
      return {
        stem,
        filename: selected.filename,
        extension: selected.extension,
        url: selected.url,
        key: keyPrefix + stem,
      };
    })
    .sort((a, b) => a.stem.localeCompare(b.stem));
}

/** A map can be scoped with a filename prefix: <stage-id>--<variant-name>. */
export function stageScopeForMapName(filename) {
  const rawStem = fileParts(filename).stem.toLowerCase();
  const stageId = STAGE_IDS_LIST.find((id) => rawStem.startsWith(slugifyAssetName(id) + '--'));
  if (!stageId) return null;
  const prefix = slugifyAssetName(stageId) + '--';
  return {
    stageId,
    variantName: slugifyAssetName(rawStem.slice(prefix.length)),
  };
}

const mapFiles = collectImageFiles(MAP_MODULES, 'stage-map-');
export const STAGE_MAP_ASSETS = Object.freeze(mapFiles.map((asset) => {
  const scope = stageScopeForMapName(asset.filename);
  const labelStem = scope?.variantName || asset.stem;
  return Object.freeze({
    ...asset,
    id: asset.stem,
    label: displayName(labelStem),
    stageId: scope?.stageId ?? null,
  });
}));

function stableSeed(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const tilesetFiles = collectImageFiles(TILESET_MODULES, 'stage-tileset-');
export const STAGE_TILESET_ASSETS = Object.freeze(tilesetFiles.map((asset) => {
  const selectedPath = Object.entries(TILESET_MODULES)
    .find(([, url]) => url === asset.url)?.[0] ?? '';
  const metadataPath = selectedPath.replace(/\.[^.]+$/, '.json');
  const metadata = TILESET_METADATA_MODULES[metadataPath] ?? {};
  const tileSize = Number(metadata.tileSize) || 32;

  return Object.freeze({
    ...asset,
    id: asset.stem,
    label: displayName(asset.stem),
    tileWidth: Math.max(4, Number(metadata.tileWidth) || tileSize),
    tileHeight: Math.max(4, Number(metadata.tileHeight) || tileSize),
    margin: Math.max(0, Number(metadata.margin) || 0),
    spacing: Math.max(0, Number(metadata.spacing) || 0),
    seed: Number.isFinite(Number(metadata.seed)) ? Number(metadata.seed) : stableSeed(asset.stem),
    backgroundColor: typeof metadata.backgroundColor === 'string' ? metadata.backgroundColor : 'auto',
  });
}));

export function proceduralTextureKeyForTileset(tilesetKey) {
  return 'stage-procedural-' + String(tilesetKey).replace(/^stage-tileset-/, '');
}

const CLASSIC_VARIANT = Object.freeze({
  id: 'classic',
  label: 'Diseño original',
  kind: 'classic',
  backgroundKey: null,
  proceduralKey: null,
});

export function getStageVisualVariants(stageId) {
  const maps = STAGE_MAP_ASSETS
    .filter((asset) => !asset.stageId || asset.stageId === stageId)
    .map((asset) => Object.freeze({
      id: 'map-' + asset.id,
      label: 'Mapa · ' + asset.label,
      kind: 'map',
      backgroundKey: asset.key,
      proceduralKey: null,
      sourceId: asset.id,
    }));

  const generated = STAGE_TILESET_ASSETS.map((asset) => Object.freeze({
    id: 'procedural-' + asset.id,
    label: 'Procedural · ' + asset.label,
    kind: 'procedural',
    backgroundKey: null,
    proceduralKey: proceduralTextureKeyForTileset(asset.key),
    tilesetKey: asset.key,
    sourceId: asset.id,
  }));

  return Object.freeze([CLASSIC_VARIANT, ...maps, ...generated]);
}

export function getStageVisualVariant(stageId, variantId = 'classic') {
  return getStageVisualVariants(stageId).find((entry) => entry.id === variantId) ?? CLASSIC_VARIANT;
}
