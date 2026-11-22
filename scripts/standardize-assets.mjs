import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANDARDS_PATH = path.join(ROOT, 'art', 'source', 'sprites', 'asset-standards.json');
const standards = JSON.parse(await fs.readFile(STANDARDS_PATH, 'utf8'));
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

/**
 * Completa un lienzo con transparencia sin escalar ni recortar el contenido.
 * Un recurso más grande que el estándar es un error: nunca se descartan píxeles.
 */
async function ensureCanvas(relativePath, width, height, label) {
  const file = absolute(relativePath);
  const original = await fs.readFile(file);
  const metadata = await sharp(original, { failOn: 'error' }).metadata();

  if (!metadata.width || !metadata.height || metadata.format !== 'png') {
    throw new Error(label + ': se esperaba un PNG válido.');
  }
  if (metadata.width > width || metadata.height > height) {
    throw new Error(
      label + ': el recurso mide ' + metadata.width + 'x' + metadata.height +
      ' y supera el lienzo ' + width + 'x' + height +
      '. No se recortará ni reducirá automáticamente.',
    );
  }

  if (metadata.width === width && metadata.height === height && metadata.hasAlpha) {
    return false;
  }

  const horizontal = width - metadata.width;
  const vertical = height - metadata.height;
  const left = Math.floor(horizontal / 2);
  const top = Math.floor(vertical / 2);
  const output = await sharp(original)
    .ensureAlpha()
    .extend({
      left,
      right: horizontal - left,
      top,
      bottom: vertical - top,
      background: TRANSPARENT,
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const verified = await sharp(output).metadata();
  if (
    verified.width !== width ||
    verified.height !== height ||
    verified.format !== 'png' ||
    !verified.hasAlpha
  ) {
    throw new Error(label + ': falló la verificación del lienzo estandarizado.');
  }

  await fs.writeFile(file, output);
  console.log(label + ': padding transparente aplicado; ' + width + 'x' + height + '.');
  return true;
}

async function assertMasterCanvas(relativePath, width, height, label) {
  const metadata = await sharp(absolute(relativePath), { failOn: 'error' }).metadata();
  if (metadata.format !== 'png' || metadata.width !== width || metadata.height !== height) {
    throw new Error(
      label + ': el master debe conservar ' + width + 'x' + height +
      '; recibido ' + metadata.width + 'x' + metadata.height + '.',
    );
  }
}

function visibleBounds(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
  }
  if (right <= left || bottom <= top) throw new Error('El artwork no tiene píxeles visibles.');
  return { left, top, right, bottom };
}
async function readVisibleBounds(relativePath) {
  const decoded = await sharp(absolute(relativePath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return visibleBounds(decoded.data, decoded.info.width, decoded.info.height);
}
async function assertVisualBoundsMatch(family) {
  if (!family.visualBoundsReference) return;
  const [orange, red] = await Promise.all([
    readVisibleBounds(family.visualBoundsReference), readVisibleBounds(family.preparedSource),
  ]);
  const tolerance = family.visualBoundsTolerance ?? 2;
  const ratioTolerance = family.visualBoundsRatioTolerance ?? 0.04;
  const orangeWidth = orange.right - orange.left;
  const orangeHeight = orange.bottom - orange.top;
  const redWidth = red.right - red.left;
  const redHeight = red.bottom - red.top;
  const widthDifference = Math.abs(redWidth - orangeWidth) / orangeWidth;
  const heightDifference = Math.abs(redHeight - orangeHeight) / orangeHeight;
  const centerDifference = Math.abs((red.left + red.right - orange.left - orange.right) / 2);
  const bottomDifference = Math.abs(red.bottom - orange.bottom);
  if (widthDifference > ratioTolerance || heightDifference > ratioTolerance ||
      centerDifference > tolerance || bottomDifference > tolerance) {
    throw new Error('El derivado Red ' + family.preparedSource + ' no coincide con la escala visual de Orange: ' +
      'Orange=' + JSON.stringify(orange) + '; Red=' + JSON.stringify(red) +
      '; diferencia ancho=' + (widthDifference * 100).toFixed(2) + '%' +
      '; diferencia alto=' + (heightDifference * 100).toFixed(2) + '%' +
      '; centro=' + centerDifference + ' px; línea de pies=' + bottomDifference + ' px.');
  }
}

async function main() {
  let changed = 0;
  const artwork = standards.categories.characterArtwork;

  for (const [gender, family] of Object.entries(artwork.families)) {
    await assertMasterCanvas(family.reference, family.width, family.height, 'Master Super Axem ' + gender);
    if (!(gender === 'male' && family.result.toLowerCase().endsWith('/male/orange/super-axem-ranger-orange.png'))) {
      changed += Number(await ensureCanvas(family.result, family.width, family.height, 'Artwork Super Axem ' + gender));
    }
    changed += Number(await ensureCanvas(family.preparedSource, family.width, family.height, 'Fuente preparada Super Axem ' + gender));
    await assertVisualBoundsMatch(family);
  }

  for (const relativePath of standards.categories.combatTexture.outputs) {
    changed += Number(await ensureCanvas(relativePath, standards.categories.combatTexture.width, standards.categories.combatTexture.height, 'Textura de combate ' + path.basename(relativePath)));
  }

  for (const relativePath of standards.categories.menuPortrait.outputs) {
    changed += Number(await ensureCanvas(relativePath, standards.categories.menuPortrait.width, standards.categories.menuPortrait.height, 'Retrato de menú ' + path.basename(relativePath)));
  }

  console.log('Estandarización de lienzos completada: ' + changed + ' archivo(s) ajustado(s). No se aplicó resize ni crop.');
}

main().catch((error) => {
  console.error('No se pudieron estandarizar los lienzos gráficos:', error);
  process.exitCode = 1;
});
