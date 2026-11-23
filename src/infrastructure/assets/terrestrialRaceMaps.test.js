import { describe, expect, it } from 'vitest';
import terrestrialMapA from '../../../art/source/environments/race-terrestrial/maps/terrestrial-a.json';
import terrestrialMapB from '../../../art/source/environments/race-terrestrial/maps/terrestrial-b.json';

const maps = [terrestrialMapA, terrestrialMapB];

describe('Mapas del circuito terrestre', () => {
  it('usa mapas exteriores Tiled sobre una cuadrícula de 18 px', () => {
    for (const map of maps) {
      expect(map.orientation).toBe('orthogonal');
      expect(map.tilewidth).toBe(18);
      expect(map.tileheight).toBe(18);
      expect(map.width).toBe(26);
      expect(map.height).toBe(15);
      expect(map.tilesets[0]).toMatchObject({
        firstgid: 1,
        tilewidth: 18,
        tileheight: 18,
        tilecount: 180,
        columns: 20,
      });
    }
  });

  it('conserva todas las capas dentro de los límites del atlas', () => {
    for (const map of maps) {
      expect(map.layers.length).toBeGreaterThan(0);
      for (const layer of map.layers) {
        expect(layer.type).toBe('tilelayer');
        expect(layer.data).toHaveLength(map.width * map.height);
        expect(layer.data.every((gid) => Number.isInteger(gid) && gid >= 0 && gid <= 180)).toBe(true);
      }
    }
  });

  it('no mezcla sprites de personajes con la composición del escenario', () => {
    for (const map of maps) {
      expect(map.layers.some(({ name }) => name === 'Characters')).toBe(false);
    }
  });
});
