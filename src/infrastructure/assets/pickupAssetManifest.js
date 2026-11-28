/**
 * Manifiesto automático: todo PNG de art/source/pickups/ se incorpora al juego.
 * Los archivos deben pasar por standardize-pickups.mjs antes de compilar.
 */
export { PICKUP_ASSET_STANDARD } from './pickupAssetStandard.js';

const PICKUP_MODULES = import.meta.glob('../../../art/source/pickups/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const PICKUP_ASSETS = Object.freeze(Object.fromEntries(
  Object.entries(PICKUP_MODULES).map(([file, url]) => {
    const filename = file.split('/').pop();
    const name = filename.slice(0, -4);
    return [name, url];
  }),
));

export const pickupTextureKeyFor = (name) => 'pickup-' + name;
