import movesAtlasUrl from '../../../art/source/sprites/axem-rangers-moves-sprites.png?url';

/** Única fuente gráfica de movimiento para todos los Axem Rangers X. */
export const AXEM_MOVES_ATLAS_KEY = 'axem-moves-atlas';
export const AXEM_MOVES_ATLAS_URL = movesAtlasUrl;

/** Textura de pose base generada desde el primer cuadro del atlas compartido. */
export const spriteKeyFor = (rangerId) => 'ranger-' + rangerId;

/** Hoja de cuadros de un estado, coloreada para el personaje indicado. */
export const sheetTextureKey = (rangerId, state) => 'motion-' + rangerId + '-' + state;
