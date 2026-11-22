function colorDistance(pixel, color) {
  const red = pixel[0] - color[0];
  const green = pixel[1] - color[1];
  const blue = pixel[2] - color[2];
  return Math.sqrt(red * red + green * green + blue * blue);
}

export function detectCheckerboardColors(data, width, height) {
  const histogram = new Map();
  const add = (x, y) => {
    const offset = (y * width + x) * 4;
    if (data[offset + 3] < 16) return;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const key = (red >> 4) + ',' + (green >> 4) + ',' + (blue >> 4);
    const entry = histogram.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    entry.count += 1;
    entry.red += red;
    entry.green += green;
    entry.blue += blue;
    histogram.set(key, entry);
  };

  for (let x = 0; x < width; x += 1) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    add(0, y);
    add(width - 1, y);
  }

  const ranked = Array.from(histogram.values()).sort((left, right) => right.count - left.count);
  const borderPixels = ranked.reduce((sum, entry) => sum + entry.count, 0);
  const toColor = (entry) => [
    Math.round(entry.red / entry.count),
    Math.round(entry.green / entry.count),
    Math.round(entry.blue / entry.count),
  ];
  const firstEntry = ranked[0];
  if (!firstEntry || borderPixels === 0) {
    throw new Error('No se pudieron analizar los píxeles del contorno.');
  }

  const first = toColor(firstEntry);
  const firstCoverage = firstEntry.count / borderPixels;
  const brightness = (first[0] + first[1] + first[2]) / 3;
  const chroma = Math.max(...first) - Math.min(...first);

  // Un contorno negro/gris oscuro puede ser lineart del personaje, no el fondo.
  // Los fondos oscuros saturados siguen siendo válidos; solo se rechaza el gris neutro.
  if (firstCoverage >= 0.65) {
    if (brightness < 48 && chroma <= 24) {
      throw new Error(
        'El color dominante del contorno es demasiado oscuro para considerarlo fondo; ' +
        'se canceló la eliminación para proteger los detalles negros del personaje.',
      );
    }
    return { colors: [first], borderCoverage: firstCoverage, backgroundType: 'solid' };
  }

  const secondEntry = ranked[1];
  if (!secondEntry) {
    throw new Error('No se encontró un segundo color válido en el contorno.');
  }
  const second = toColor(secondEntry);
  const secondCoverage = secondEntry.count / borderPixels;
  const separation = colorDistance(first, second);
  const isNeutral = (color) => Math.max(...color) - Math.min(...color) <= 24;
  if (
    firstCoverage < 0.12 ||
    secondCoverage < 0.12 ||
    firstCoverage + secondCoverage < 0.55 ||
    !isNeutral(first) ||
    !isNeutral(second) ||
    ((first[0] + first[1] + first[2]) / 3) < 120 ||
    ((second[0] + second[1] + second[2]) / 3) < 120 ||
    separation < 12 ||
    separation > 110
  ) {
    const palette = ranked.slice(0, 5).map((entry) => ({
      color: toColor(entry),
      coverage: Number((entry.count / borderPixels).toFixed(3)),
    }));
    throw new Error(
      'No se reconoció el fondo del contorno; no se modificó el sprite. Colores detectados: ' +
      JSON.stringify(palette),
    );
  }

  return {
    colors: [first, second],
    borderCoverage: firstCoverage + secondCoverage,
    backgroundType: 'checkerboard',
  };
}

export function removeCheckerboardBackground(data, width, height, colors, options = {}) {
  const {
    edgeAlphaFloor = 0,
    fringeLimit = 36,
    coverageStart = 8,
    coverageRange = 28,
  } = options;
  const total = width * height;
  const tolerance = 22;
  const toleranceSquared = tolerance * tolerance;
  const matchesBackground = (index) => {
    const offset = index * 4;
    if (data[offset + 3] < 16) return false;
    const pixel = data.subarray(offset, offset + 3);
    return colors.some((color) => {
      const red = pixel[0] - color[0];
      const green = pixel[1] - color[1];
      const blue = pixel[2] - color[2];
      return red * red + green * green + blue * blue <= toleranceSquared;
    });
  };

  const visited = new Uint8Array(total);
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;
  const enqueue = (index) => {
    if (visited[index] || !matchesBackground(index)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  // Ambos tonos de la cuadrícula se reconocen como fondo: basta la conectividad
  // cardinal. La conexión solo diagonal no debe atravesar el contorno del sprite.
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  for (let index = 0; index < total; index += 1) {
    if (visited[index]) data[index * 4 + 3] = 0;
  }

  // El halo se atenúa solo cuando comparte un lado con el fondo eliminado.
  let softenedPixels = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (visited[index]) continue;
      const offset = index * 4;
      if (data[offset + 3] < 16) continue;
      const touchesBackground =
        visited[index - 1] ||
        visited[index + 1] ||
        visited[index - width] ||
        visited[index + width];
      if (!touchesBackground) continue;

      const pixel = data.subarray(offset, offset + 3);
      const distance = Math.min(...colors.map((color) => colorDistance(pixel, color)));
      if (distance >= fringeLimit) continue;
      const originalAlpha = data[offset + 3];
      const coverage = Math.max(0.12, Math.min(1, (distance - coverageStart) / coverageRange));
      const softenedAlpha = Math.round(originalAlpha * coverage);
      // Un borde retenido nunca cae por debajo del mínimo específico del artwork.
      // RGB permanece intacto: no hay blur, resampling ni pérdida del color del píxel.
      data[offset + 3] = Math.min(
        originalAlpha,
        Math.max(edgeAlphaFloor, softenedAlpha),
      );
      softenedPixels += 1;
    }
  }

  return { removedPixels: tail, softenedPixels };
}
