/**
 * ¿Hay que espejar el sprite? El arte original mira hacia `spriteFacing`
 * (1 = derecha, -1 = izquierda); el personaje debe mirar hacia `facing`.
 * La misma regla se comparte entre combate, cinemática y menú.
 */
export const shouldFlip = (facing, spriteFacing) =>
  Math.sign(facing) !== Math.sign(spriteFacing);
