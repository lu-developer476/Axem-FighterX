/**
 * ¿Hay que espejar el sprite? El arte original mira hacia `spriteFacing`
 * (1 = derecha, -1 = izquierda); el personaje apunta hacia `facing`.
 * Se espeja solo cuando no coinciden, así siempre queda de frente a donde se mueve.
 */
export const shouldFlip = (facing, spriteFacing) => facing !== spriteFacing;
