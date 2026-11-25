/**
 * Manifiesto automático de los iconos de consumibles del combate.
 * Los PNG conservan dimensiones y colores de origen; Phaser aplica NEAREST.
 */
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
