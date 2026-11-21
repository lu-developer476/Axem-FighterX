import { STAGE_IDS } from '../../domain/arena/stageCatalog.js';

import castleMapUrl from '../../../art/source/environments/maps/castle.png';
import caveOneMapUrl from '../../../art/source/environments/maps/cave-1.png';
import caveTwoMapUrl from '../../../art/source/environments/maps/cave-2.png';
import practiceZoneMapUrl from '../../../art/source/environments/maps/practice-zone.png';
import sideScrollOneMapUrl from '../../../art/source/environments/maps/sidescroll-1.png';
import sideScrollTwoMapUrl from '../../../art/source/environments/maps/sidescroll-2.png';
import sideScrollThreeMapUrl from '../../../art/source/environments/maps/sidescroll-3.png';
import sideScrollFourMapUrl from '../../../art/source/environments/maps/sidescroll-4.png';

import caveOneTilesetUrl from '../../../art/source/environments/maps/tilesets/cave1-tileset.png';
import caveTwoTilesetUrl from '../../../art/source/environments/maps/tilesets/cave2-tileset.png';
import darknessTilesetUrl from '../../../art/source/environments/maps/tilesets/darknes-tileset.png';
import sideScrollTilesetUrl from '../../../art/source/environments/maps/tilesets/sidescroll-tileset.png';
import spaceMercTilesetUrl from '../../../art/source/environments/maps/tilesets/space-merc-tileset.png';

const mapAsset = (name, url) => Object.freeze({ key: 'stage-map-' + name, url });
const tilesetAsset = (name, url, seed) => Object.freeze({
  key: 'stage-tileset-' + name,
  url,
  cellSize: 32,
  seed,
});

export const STAGE_MAP_ASSETS = Object.freeze({
  castle: mapAsset('castle', castleMapUrl),
  caveOne: mapAsset('cave-one', caveOneMapUrl),
  caveTwo: mapAsset('cave-two', caveTwoMapUrl),
  practiceZone: mapAsset('practice-zone', practiceZoneMapUrl),
  sideScrollOne: mapAsset('sidescroll-one', sideScrollOneMapUrl),
  sideScrollTwo: mapAsset('sidescroll-two', sideScrollTwoMapUrl),
  sideScrollThree: mapAsset('sidescroll-three', sideScrollThreeMapUrl),
  sideScrollFour: mapAsset('sidescroll-four', sideScrollFourMapUrl),
});

export const STAGE_TILESET_ASSETS = Object.freeze({
  caveOne: tilesetAsset('cave-one', caveOneTilesetUrl, 17),
  caveTwo: tilesetAsset('cave-two', caveTwoTilesetUrl, 29),
  darkness: tilesetAsset('darkness', darknessTilesetUrl, 43),
  sideScroll: tilesetAsset('sidescroll', sideScrollTilesetUrl, 61),
  spaceMerc: tilesetAsset('space-merc', spaceMercTilesetUrl, 83),
});

const variant = (id, label, background, tileset, tint, overlayAlpha = 0.3) => Object.freeze({
  id,
  label,
  backgroundKey: background ? background.key : null,
  tilesetKey: tileset ? tileset.key : null,
  tint: tint ?? null,
  overlayAlpha,
});

export const STAGE_VISUAL_VARIANTS = Object.freeze({
  [STAGE_IDS.RUINS]: Object.freeze([
    variant('castle-hall', 'Castillo en ruinas', STAGE_MAP_ASSETS.sideScrollTwo, STAGE_TILESET_ASSETS.sideScroll, 0x8a9ab8, 0.22),
    variant('broken-tower', 'Torre derruida', STAGE_MAP_ASSETS.sideScrollThree, STAGE_TILESET_ASSETS.sideScroll, 0x9da9bf, 0.22),
    variant('northern-wall', 'Muralla nevada', STAGE_MAP_ASSETS.sideScrollFour, STAGE_TILESET_ASSETS.sideScroll, 0xb7cce0, 0.2),
  ]),
  [STAGE_IDS.VOLCANO]: Object.freeze([
    variant('basalt-gallery', 'Galería de basalto', STAGE_MAP_ASSETS.caveOne, STAGE_TILESET_ASSETS.caveOne, 0x6f8292, 0.2),
  ]),
  [STAGE_IDS.FOREST]: Object.freeze([
    variant('frozen-woods', 'Bosque de montaña', STAGE_MAP_ASSETS.sideScrollOne, STAGE_TILESET_ASSETS.sideScroll, 0x9cb8c5, 0.2),
  ]),
  [STAGE_IDS.SANCTUARY]: Object.freeze([
    variant('forgotten-castle', 'Castillo olvidado', STAGE_MAP_ASSETS.castle, STAGE_TILESET_ASSETS.caveOne, 0x9c7b63, 0.22),
  ]),
  [STAGE_IDS.DOWNTOWN]: Object.freeze([
    variant('industrial-complex', 'Complejo industrial', null, STAGE_TILESET_ASSETS.darkness, 0x2b7182, 0.38),
  ]),
  [STAGE_IDS.MEADOW]: Object.freeze([
    variant('retro-practice', 'Zona de práctica retro', STAGE_MAP_ASSETS.practiceZone, STAGE_TILESET_ASSETS.spaceMerc, 0x6576e4, 0.2),
  ]),
  [STAGE_IDS.VOLCANO_MOUTH]: Object.freeze([
    variant('deep-cavern', 'Caverna profunda', STAGE_MAP_ASSETS.caveTwo, STAGE_TILESET_ASSETS.caveTwo, 0x514b61, 0.22),
  ]),
});

const CLASSIC_VARIANT = Object.freeze({
  id: 'classic',
  label: 'Diseño original',
  backgroundKey: null,
  tilesetKey: null,
  tint: null,
  overlayAlpha: 0,
});

export function getStageVisualVariants(stageId) {
  return Object.freeze([CLASSIC_VARIANT, ...(STAGE_VISUAL_VARIANTS[stageId] ?? [])]);
}

export function getStageVisualVariant(stageId, variantId = 'classic') {
  return getStageVisualVariants(stageId).find((entry) => entry.id === variantId) ?? CLASSIC_VARIANT;
}

export function tileOverlayKeyForTileset(tilesetKey) {
  return tilesetKey
    ? tilesetKey.replace('stage-tileset-', 'stage-tileset-overlay-')
    : null;
}
