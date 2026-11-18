// Abre el juego compilado en Chromium, mueve a los dos personajes y guarda
// capturas y un video en ./artifacts. Uso: node scripts/capture.mjs [url]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = 'artifacts';
const size = { width: 960, height: 540 };

await mkdir(`${out}/video`, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: size,
  recordVideo: { dir: `${out}/video`, size },
});
const page = await context.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(url);
await page.waitForSelector('canvas', { timeout: 15_000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/01-inicio.png` });

const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};

// J1 (WASD) y J2 (flechas) se mueven a la vez.
await Promise.all([hold('d', 1200), hold('ArrowLeft', 1200)]);
await page.screenshot({ path: `${out}/02-acercamiento.png` });

await Promise.all([hold('w', 700), hold('ArrowUp', 700)]);
await page.screenshot({ path: `${out}/03-arriba.png` });

await Promise.all([hold('a', 1500), hold('ArrowRight', 1500)]);
await page.screenshot({ path: `${out}/04-separados.png` });

await page.waitForTimeout(800); // levitación en reposo
await context.close();
await browser.close();

if (errors.length) {
  console.error('Errores en la página:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Captura completa.');
