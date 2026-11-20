/**
 * Detección de cuadros sobre un atlas de fondo plano.
 *
 * El atlas de Axem Rangers X no es una cuadrícula: cada fila tiene cantidad,
 * ancho y separación de cuadros distintos. Por eso los cuadros se localizan por
 * proyección de píxeles (filas de cuadros → cuadros dentro de cada fila) y se
 * guarda el rectángulo ajustado de cada uno.
 *
 * Es una función pura sobre RGBA crudo: la usa `scripts/analyze-atlas.mjs` para
 * generar el manifiesto y los tests para comprobar que no se desfasó del PNG.
 */

const FEET_ROWS = 6;

/**
 * @param {{ data: Uint8Array | Uint8ClampedArray, width: number, height: number }} image RGBA
 * @param {{
 *   background: [number, number, number],
 *   excluded?: Array<[number, number, number, number]>,
 * }} options `excluded` son rectángulos [x, y, ancho, alto] que se ignoran.
 * @returns {Array<{ id: string, bounds: number[], frames: Array<{ x: number, y: number, w: number, h: number, pivotX: number }> }>}
 */
export function detectAtlasFrames(image, { background, excluded = [] }) {
  const { data, width, height } = image;
  const isForeground = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const opaque = data[offset + 3] > 0;
      const isBackground =
        data[offset] === background[0] &&
        data[offset + 1] === background[1] &&
        data[offset + 2] === background[2];
      if (opaque && !isBackground) isForeground[y * width + x] = 1;
    }
  }

  for (const [ex, ey, ew, eh] of excluded) {
    for (let y = ey; y < Math.min(height, ey + eh); y++) {
      for (let x = ex; x < Math.min(width, ex + ew); x++) isForeground[y * width + x] = 0;
    }
  }

  const rowHasPixels = Array.from({ length: height }, (_, y) => {
    for (let x = 0; x < width; x++) if (isForeground[y * width + x]) return true;
    return false;
  });

  const groups = [];
  for (const [bandTop, bandBottom] of runsOf(rowHasPixels)) {
    const columnHasPixels = Array.from({ length: width }, (_, x) => {
      for (let y = bandTop; y <= bandBottom; y++) if (isForeground[y * width + x]) return true;
      return false;
    });

    const frames = runsOf(columnHasPixels).map(([left, right]) =>
      tightFrame(isForeground, width, left, right, bandTop, bandBottom));

    const first = frames[0];
    const last = frames[frames.length - 1];
    const top = Math.min(...frames.map((frame) => frame.y));
    const bottom = Math.max(...frames.map((frame) => frame.y + frame.h));
    groups.push({
      id: 'group-' + String(groups.length + 1).padStart(2, '0'),
      bounds: [first.x, top, last.x + last.w - first.x, bottom - top],
      frames,
    });
  }

  return groups;
}

function tightFrame(isForeground, width, left, right, bandTop, bandBottom) {
  let top = bandBottom;
  let bottom = bandTop;
  for (let y = bandTop; y <= bandBottom; y++) {
    for (let x = left; x <= right; x++) {
      if (!isForeground[y * width + x]) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  // Pivote horizontal: centro de los píxeles de los pies. Mantiene al personaje
  // quieto aunque la bufanda o un efecto ensanchen el rectángulo del cuadro.
  let feetSum = 0;
  let feetCount = 0;
  for (let y = Math.max(top, bottom - FEET_ROWS + 1); y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (!isForeground[y * width + x]) continue;
      feetSum += x;
      feetCount += 1;
    }
  }

  return {
    x: left,
    y: top,
    w: right - left + 1,
    h: bottom - top + 1,
    pivotX: Math.round(feetSum / feetCount) - left,
  };
}

/** Tramos consecutivos de `true`, como pares [inicio, fin] inclusivos. */
function runsOf(flags) {
  const runs = [];
  let start = null;
  flags.forEach((flag, index) => {
    if (flag && start === null) start = index;
    if (!flag && start !== null) {
      runs.push([start, index - 1]);
      start = null;
    }
  });
  if (start !== null) runs.push([start, flags.length - 1]);
  return runs;
}
