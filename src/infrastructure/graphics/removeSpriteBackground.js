/**
 * Elimina el fondo uniforme o casi uniforme, incluidos los fragmentos atrapados en huecos internos del sprite.
 * Trabaja sobre una imagen ya reducida a su resolución de juego, por lo que
 * también resulta válido para hojas de animación con varios cuadros.
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} imageData
 * @param {{ tolerance?: number, minBorderCoverage?: number }} options
 * @returns {{ removedPixels: number, backgroundColor: [number, number, number] | null }}
 */
export function removeSpriteBackground(imageData, {
  tolerance = 44,
  minBorderCoverage = 0.08,
} = {}) {
  const { data, width, height } = imageData;
  const total = width * height;
  if (width < 3 || height < 3 || data.length !== total * 4) {
    return { removedPixels: 0, backgroundColor: null };
  }

  const histogram = new Uint32Array(32 * 32 * 32);
  let opaqueBorderPixels = 0;
  let transparentBorderPixels = 0;

  const visitBorder = (x, y) => {
    const offset = (y * width + x) * 4;
    if (data[offset + 3] < 16) {
      transparentBorderPixels += 1;
      return;
    }
    const bucket =
      ((data[offset] >> 3) << 10) |
      ((data[offset + 1] >> 3) << 5) |
      (data[offset + 2] >> 3);
    histogram[bucket] += 1;
    opaqueBorderPixels += 1;
  };

  for (let x = 0; x < width; x++) {
    visitBorder(x, 0);
    visitBorder(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    visitBorder(0, y);
    visitBorder(width - 1, y);
  }

  // Una imagen que ya tiene transparencia en casi todo el contorno no necesita keying.
  const borderPixels = opaqueBorderPixels + transparentBorderPixels;
  if (!opaqueBorderPixels || transparentBorderPixels / borderPixels > 0.75) {
    return { removedPixels: 0, backgroundColor: null };
  }

  let dominantBucket = 0;
  let dominantCount = 0;
  for (let i = 0; i < histogram.length; i++) {
    if (histogram[i] > dominantCount) {
      dominantBucket = i;
      dominantCount = histogram[i];
    }
  }

  if (dominantCount / opaqueBorderPixels < minBorderCoverage) {
    return { removedPixels: 0, backgroundColor: null };
  }

  const background = [
    (((dominantBucket >> 10) & 31) << 3) + 4,
    (((dominantBucket >> 5) & 31) << 3) + 4,
    ((dominantBucket & 31) << 3) + 4,
  ];
  const toleranceSquared = tolerance * tolerance;
  const isBackground = (pixelIndex) => {
    const offset = pixelIndex * 4;
    if (data[offset + 3] < 16) return false;
    const red = data[offset] - background[0];
    const green = data[offset + 1] - background[1];
    const blue = data[offset + 2] - background[2];
    return red * red + green * green + blue * blue <= toleranceSquared;
  };

  const visited = new Uint8Array(total);
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;

  const enqueue = (pixelIndex) => {
    if (visited[pixelIndex] || !isBackground(pixelIndex)) return;
    visited[pixelIndex] = 1;
    queue[tail++] = pixelIndex;
  };

  // El fondo puede quedar atrapado en huecos cerrados entre extremidades,
  // cabello y accesorios. También se buscan esos fragmentos interiores del
  // mismo color dominante, no solo los que llegan hasta el borde del PNG.
  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  for (let i = 0; i < total; i++) enqueue(i);

  while (head < tail) {
    const pixelIndex = queue[head++];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }

  for (let i = 0; i < total; i++) {
    if (visited[i]) data[i * 4 + 3] = 0;
  }

  // Atenúa el halo de los píxeles antialias que quedan pegados al fondo eliminado.
  const fringeLimit = tolerance * 1.65;
  const fringeLimitSquared = fringeLimit * fringeLimit;
  let removedPixels = tail;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixelIndex = y * width + x;
      const offset = pixelIndex * 4;
      if (visited[pixelIndex] || data[offset + 3] < 16) continue;

      const touchesBackground =
        visited[pixelIndex - 1] ||
        visited[pixelIndex + 1] ||
        visited[pixelIndex - width] ||
        visited[pixelIndex + width];
      if (!touchesBackground) continue;

      const red = data[offset] - background[0];
      const green = data[offset + 1] - background[1];
      const blue = data[offset + 2] - background[2];
      const distanceSquared = red * red + green * green + blue * blue;
      if (distanceSquared > fringeLimitSquared) continue;

      const distance = Math.sqrt(distanceSquared);
      const coverage = Math.max(0, Math.min(1, (distance - tolerance * 0.55) / (tolerance * 0.9)));
      const nextAlpha = Math.round(data[offset + 3] * coverage);
      if (nextAlpha === 0) removedPixels += 1;
      data[offset + 3] = nextAlpha;
    }
  }

  return { removedPixels, backgroundColor: background };
}
