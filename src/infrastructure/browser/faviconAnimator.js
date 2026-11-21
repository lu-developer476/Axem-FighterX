// Anima el favicon cambiando el <link rel="icon"> entre cuadros PNG.
// Los cuadros los genera scripts/prepare-favicons.mjs en public/favicon-frames/.
// Firefox ya anima el GIF por su cuenta, así que ahí no se activa. Si algo falla
// (sin cuadros, movimiento reducido, red), queda el favicon estático del index.html.

const LINK_ID = 'favicon-animated';
const MIN_FRAME_MS = 80;

function isFirefox() {
  return /firefox/i.test(globalThis.navigator?.userAgent ?? '');
}

function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(url);
    image.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
    image.src = url;
  });
}

export async function startFaviconAnimation() {
  if (typeof document === 'undefined' || isFirefox() || prefersReducedMotion()) return;

  try {
    const baseUrl = new URL('favicon-frames/', document.baseURI);
    const response = await fetch(new URL('manifest.json', baseUrl));
    if (!response.ok) return;

    const { frames, delays } = await response.json();
    if (!Array.isArray(frames) || frames.length < 2) return;

    // Precarga todo antes de empezar para que no haya parpadeos ni íconos vacíos.
    const urls = await Promise.all(frames.map((name) => loadImage(new URL(name, baseUrl).href)));

    // Un <link> propio y último: con íconos del mismo tamaño Chrome elige el último.
    const link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'icon';
    link.type = 'image/png';
    link.sizes = '32x32';
    link.href = urls[0];
    document.head.appendChild(link);

    let index = 0;
    const tick = () => {
      index = (index + 1) % urls.length;
      link.href = urls[index];
      setTimeout(tick, Math.max(MIN_FRAME_MS, delays?.[index] ?? 333));
    };
    setTimeout(tick, Math.max(MIN_FRAME_MS, delays?.[0] ?? 333));
  } catch {
    // Silencioso a propósito: el favicon estático ya cubre este caso.
  }
}
