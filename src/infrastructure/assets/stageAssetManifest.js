const MAP_MODULES = import.meta.glob(
  '../../../art/source/environments/maps/**/*.{png,webp,jpg,jpeg}',
  { eager: true, query: '?url', import: 'default' },
);
const TILESET_MODULES = import.meta.glob(
  '../../../art/source/environments/maps/tilesets/**/*.{png,webp,jpg,jpeg}',
  { eager: true, query: '?url', import: 'default' },
);
const TILESET_METADATA_MODULES = import.meta.glob(
  '../../../art/source/environments/maps/tilesets/**/*.json',
  { eager: true, import: 'default' },
);

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

export function collectImageFiles(modules, keyPrefix) {
  const grouped = new Map();
  for (const [path, url] of Object.entries(modules)) {
    const parts = fileParts(path);
    const normalizedPath = path.replaceAll('\\', '/');
    const rootMarker = keyPrefix === 'stage-tileset-' ? '/tilesets/' : '/maps/';
    const rootIndex = normalizedPath.lastIndexOf(rootMarker);
    const relativePath = rootIndex >= 0
      ? normalizedPath.slice(rootIndex + rootMarker.length).replace(/\\.[^.]+$/, '')
      : parts.stem;
    const stem = slugifyAssetName(relativePath);
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
        path: selected.path,
        filename: selected.filename,
        extension: selected.extension,
        url: selected.url,
        key: keyPrefix + stem,
      };
    })
    .sort((a, b) => a.stem.localeCompare(b.stem));
}

const mapFiles = collectImageFiles(
  Object.fromEntries(Object.entries(MAP_MODULES).filter(([path]) => !path.includes('/maps/tilesets/'))),
  'stage-map-',
);
export const STAGE_MAP_ASSETS = Object.freeze(mapFiles.map((asset) => Object.freeze({
  ...asset,
  id: asset.stem,
  label: displayName(asset.stem),
})));

const tilesetFiles = collectImageFiles(TILESET_MODULES, 'stage-tileset-');
export const STAGE_TILESET_ASSETS = Object.freeze(tilesetFiles.map((asset) => {
  const selectedPath = asset.path;
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

function stableSeed(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function proceduralTextureKeyForTileset(tilesetKey) {
  return 'stage-procedural-' + String(tilesetKey).replace(/^stage-tileset-/, '');
}

const lines = (...entries) => Object.freeze(entries.map(([speaker, text]) => Object.freeze({ speaker, text })));

const RESULT_DIALOGUE = Object.freeze({
  violetWins: lines(
    ['violet', 'Leí mejor el espacio y encontré el momento para cerrar el combate.'],
    ['orange', 'Me concentré demasiado en atacar y dejé de prestar atención al terreno.'],
  ),
  orangeWins: lines(
    ['orange', 'Aproveché el espacio disponible y no te dejé recuperar la posición.'],
    ['violet', 'Vi tarde el cambio de distancia. La próxima vez voy a anticiparlo.'],
  ),
  draw: lines(
    ['violet', 'Ninguno consiguió una ventaja definitiva en este terreno.'],
    ['orange', 'Volvamos a intentarlo. Ya sabemos un poco más sobre el espacio disponible.'],
  ),
});

function createStageDialogue(name, filename, kind) {
  const sourceDescription = kind === 'map' ? 'mapa' : 'tileset';
  return lines(
    ['violet', `El archivo ${filename} define esta zona. El registro la identifica como ${name}.`],
    ['orange', `Entonces usemos el terreno tal como está representado, sin asumir que el fondo cambia las reglas.`],
    ['violet', 'Revisá las distancias y mantené la vista en el rival. No conocemos todos los puntos de referencia.'],
    ['orange', `La configuración llegó desde un ${sourceDescription} del proyecto. El combate sigue las mismas reglas.`],
    ['violet', 'Entendido. Nada de confiarse por conocer el dibujo; primero vamos a medir el espacio.'],
    ['orange', 'Cuando quieras. El escenario está cargado y podemos empezar.'],
  );
}

function createStage(asset, kind) {
  const isMap = kind === 'map';
  const id = isMap ? asset.id : 'tileset-' + asset.id;
  const name = isMap ? asset.label : asset.label + ' · Tileset';
  return Object.freeze({
    id,
    name,
    kind,
    assetFilename: asset.filename,
    tagline: isMap ? 'Mapa incorporado al proyecto' : 'Entorno generado desde un tileset del proyecto',
    location: isMap ? 'MAPA DEL PROYECTO' : 'TILESET DEL PROYECTO',
    description: isMap
      ? `Escenario cargado directamente desde ${asset.filename}.`
      : `Escenario procedural reproducible generado a partir de ${asset.filename}.`,
    groundDepthMode: 'free',
    backgroundKey: isMap ? asset.key : null,
    proceduralKey: isMap ? null : proceduralTextureKeyForTileset(asset.key),
    dialogue: createStageDialogue(name, asset.filename, kind),
    resultDialogue: RESULT_DIALOGUE,
  });
}

/**
 * La carpeta de mapas y la carpeta de tilesets son la única fuente del catálogo.
 * Vite descubre sus archivos durante el build; no hay que registrar escenarios a mano.
 */
export const STAGES = Object.freeze([
  ...STAGE_MAP_ASSETS.map((asset) => createStage(asset, 'map')),
  ...STAGE_TILESET_ASSETS.map((asset) => createStage(asset, 'tileset')),
]);

export const DEFAULT_STAGE_ID = STAGES[0]?.id ?? null;

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0] ?? null;
}
