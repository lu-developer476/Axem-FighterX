import { describe, expect, it } from 'vitest';
import { PICKUP_ASSETS, pickupTextureKeyFor } from './pickupAssetManifest.js';

describe('Recursos PNG de consumibles', () => {
  it('descubre los recursos actuales de pickups/', () => {
    expect(Object.keys(PICKUP_ASSETS)).toEqual(expect.arrayContaining([
      'bike-key', 'bomb', 'heart', 'shield', 'sword', 'thunder',
    ]));
  });

  it('genera claves de textura estables', () => {
    for (const name of ['heart', 'shield', 'sword', 'thunder', 'bomb', 'bike-key']) {
      expect(pickupTextureKeyFor(name)).toBe('pickup-' + name);
    }
  });
});
