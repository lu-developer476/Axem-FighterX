/**
 * Detección de cuadros sobre las hojas de referencia de los Axem Rangers.
 *
 * Ninguna hoja es una cuadrícula: cada fila tiene cantidad, ancho y separación
 * de cuadros distintos, y los fondos traen ruido de compresión. Por eso se
 * trabaja con una máscara de primer plano (distancia al color de fondo) y dos
 * estrategias, ambas funciones puras sobre RGBA crudo:
 *
 *  - detectRowGroups: hojas ordenadas en tiras (Axem Red). Proyección de
 *    píxeles → tiras → cuadros, con pivote de pies por cuadro.
 *  - detectRegions: hojas de distribución libre (Axem Pink). Componentes
 *    conexos que se fusionan por cercanía, más estadísticas de color para
 *    separar personajes de efectos, íconos y siluetas.
 */

const FEET_ROWS = 6;

/**
 * @param {{ data: Uint8Array | Uint8ClampedArray, width: number, height: number }} image RGBA
 * @param {{ background: number[], tolerance?: number, excluded?: number[][], despeckle?: boolean }} options
 *   `excluded`: rectángulos [x, y, ancho, alto] que se ignoran.
 *   `despeckle`: descarta píxeles aislados (ruido de compresión del fondo).
 * @returns {Uint8Array} 1 = primer plano
 */
export function foregroundMask(image, { background, tolerance = 0, excluded = [], despeckle = false }) {
  const { data, width, height } = image;
  const mask = new Uint8Array(width * height);

  for (let index = 0; index < width * height; index++) {
    const offset = index * 4;
    if (data[offset + 3] === 0) continue;
    const distance = Math.max(
      Math.abs(data[offset] - background[0]),
      Math.abs(data[offset + 1] - background[1]),
      Math.abs(data[offset + 2] - background[2]),
    );
    if (distance > tolerance) mask[index] = 1;
  }

  for (const [ex, ey, ew, eh] of excluded) {
    for (let y = ey; y < Math.min(height, ey + eh); y++) {
      for (let x = ex; x < Math.min(width, ex + ew); x++) mask[y * width + x] = 0;
    }
  }

  return despeckle ? withoutIsolatedPixels(mask, width, height) : mask;
}

/** Quita los píxeles de primer plano con a lo sumo un vecino (8 vecinos). */
function withoutIsolatedPixels(mask, width, height) {
  const cleaned = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) neighbors += mask[ny * width + nx];
        }
      }
      if (neighbors >= 2) cleaned[y * width + x] = 1;
    }
  }
  return cleaned;
}

/**
 * Tiras horizontales de cuadros (hojas ordenadas por filas).
 * `minFramePixels` descarta motas de ruido que no forman un cuadro.
 */
export function detectRowGroups(mask, width, height, { minFramePixels = 24 } = {}) {
  const rowHasPixels = Array.from({ length: height }, (_, y) => {
    for (let x = 0; x < width; x++) if (mask[y * width + x]) return true;
    return false;
  });

  const groups = [];
  for (const [bandTop, bandBottom] of runsOf(rowHasPixels)) {
    const columnHasPixels = Array.from({ length: width }, (_, x) => {
      for (let y = bandTop; y <= bandBottom; y++) if (mask[y * width + x]) return true;
      return false;
    });

    const frames = runsOf(columnHasPixels)
      .map(([left, right]) => tightFrame(mask, width, left, right, bandTop, bandBottom))
      .filter((frame) => frame.pixels >= minFramePixels)
      .map(({ pixels, ...frame }) => frame);

    if (!frames.length) continue;
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

/**
 * Regiones de una hoja de distribución libre: componentes conexos (8 vecinos)
 * cuyas cajas se fusionan si están a `gap` píxeles o menos. Se devuelven en
 * orden de lectura aproximado (franjas de `rowBand` px, luego izquierda a derecha).
 */
export function detectRegions(mask, width, height, { gap = 3, minPixels = 12, rowBand = 40 } = {}) {
  const label = new Int32Array(width * height);
  const queue = new Int32Array(width * height);
  const components = [];

  for (let start = 0; start < width * height; start++) {
    if (!mask[start] || label[start]) continue;
    const id = components.length + 1;
    let head = 0;
    let tail = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    label[start] = id;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = (index - x) / width;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (!mask[next] || label[next]) continue;
          label[next] = id;
          queue[tail++] = next;
        }
      }
    }

    if (tail >= minPixels) {
      components.push({ x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1, pixels: tail });
    }
  }

  const parent = components.map((_, index) => index);
  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const touching = (a, b) =>
    !(a.x0 - gap > b.x1 || b.x0 - gap > a.x1 || a.y0 - gap > b.y1 || b.y0 - gap > a.y1);

  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      if (touching(components[i], components[j])) parent[find(i)] = find(j);
    }
  }

  const merged = new Map();
  components.forEach((component, index) => {
    const root = find(index);
    const current = merged.get(root);
    if (!current) {
      merged.set(root, { ...component });
      return;
    }
    current.x0 = Math.min(current.x0, component.x0);
    current.y0 = Math.min(current.y0, component.y0);
    current.x1 = Math.max(current.x1, component.x1);
    current.y1 = Math.max(current.y1, component.y1);
    current.pixels += component.pixels;
  });

  return [...merged.values()]
    .map((box) => ({ x: box.x0, y: box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0, pixels: box.pixels }))
    .sort((a, b) => Math.floor(a.y / rowBand) - Math.floor(b.y / rowBand) || a.x - b.x);
}

/**
 * Cantidad de píxeles de cada familia de color dentro de una caja. El traje de
 * Axem tiene azul verdoso oscuro y bufanda amarilla; los efectos, armas sueltas,
 * íconos y siluetas no. Sirve para separar personajes del resto.
 */
export function measureRegionColors(image, box) {
  const { data, width } = image;
  const counts = { body: 0, suit: 0, scarf: 0 };

  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] === 0) continue;
      const [hue, chroma, lightness] = rgbToHueChromaLightness(data[offset], data[offset + 1], data[offset + 2]);
      // Se usa croma (máximo − mínimo) y no saturación HSL: en las estelas rosa
      // pálido la saturación HSL es alta, pero su croma es bajo.
      if ((hue >= 330 || hue <= 15) && chroma > 0.3 && lightness > 0.3 && lightness < 0.75) counts.body += 1;
      if (hue >= 150 && hue <= 215 && chroma > 0.15 && lightness < 0.45) counts.suit += 1;
      if (hue >= 28 && hue <= 55 && chroma > 0.45) counts.scarf += 1;
    }
  }

  return counts;
}

/** Un personaje tiene masa rosada suficiente y, además, traje o bufanda. */
export function isCharacterRegion(box, colors, { minHeight = 24, minBody = 120, minSuit = 10, minScarf = 6 } = {}) {
  return box.h >= minHeight && colors.body >= minBody && (colors.suit >= minSuit || colors.scarf >= minScarf);
}

/**
 * Celda común para una secuencia: todos los cuadros comparten tamaño, apoyan
 * los pies sobre la misma línea (`anchor: 'feet'`) o se centran (`'center'`,
 * para poses en el aire). Devuelve la posición de cada cuadro dentro de su celda.
 */
export function layoutSequence(frames, { anchor = 'feet' } = {}) {
  const baseline = Math.max(...frames.map((frame) => frame.y + frame.h));
  const pivotOf = (frame) => (anchor === 'feet' ? frame.pivotX ?? Math.round(frame.w / 2) : Math.round(frame.w / 2));
  const anchorX = Math.max(...frames.map(pivotOf));
  const reach = Math.max(...frames.map((frame) => frame.w - pivotOf(frame)));
  const dropOf = (frame) => (anchor === 'feet' ? baseline - (frame.y + frame.h) : 0);
  const cellHeight = Math.max(...frames.map((frame) => frame.h + dropOf(frame)));

  return {
    cellWidth: anchorX + reach,
    cellHeight,
    placements: frames.map((frame) => ({
      x: anchorX - pivotOf(frame),
      y: anchor === 'feet'
        ? cellHeight - frame.h - dropOf(frame)
        : Math.round((cellHeight - frame.h) / 2),
    })),
  };
}

function tightFrame(mask, width, left, right, bandTop, bandBottom) {
  let top = bandBottom;
  let bottom = bandTop;
  let pixels = 0;
  for (let y = bandTop; y <= bandBottom; y++) {
    for (let x = left; x <= right; x++) {
      if (!mask[y * width + x]) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      pixels += 1;
    }
  }

  // Pivote horizontal: centro de los píxeles de los pies. Mantiene al personaje
  // quieto aunque la bufanda o un efecto ensanchen el rectángulo del cuadro.
  let feetSum = 0;
  let feetCount = 0;
  for (let y = Math.max(top, bottom - FEET_ROWS + 1); y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (!mask[y * width + x]) continue;
      feetSum += x;
      feetCount += 1;
    }
  }

  return {
    x: left,
    y: top,
    w: right - left + 1,
    h: bottom - top + 1,
    pivotX: feetCount ? Math.round(feetSum / feetCount) - left : Math.round((right - left + 1) / 2),
    pixels,
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

function rgbToHueChromaLightness(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  if (chroma === 0) return [0, 0, (max + min) / 2];
  let hue;
  if (max === r) hue = ((g - b) / chroma + 6) % 6;
  else if (max === g) hue = (b - r) / chroma + 2;
  else hue = (r - g) / chroma + 4;
  return [hue * 60, chroma, (max + min) / 2];
}
