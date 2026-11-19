// Abre el juego compilado en Chromium, recorre los cuatro escenarios y juega una partida de prueba.
// Uso: node scripts/capture.mjs [url]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = 'artifacts';
const size = { width: 960, height: 540 };

await mkdir(out + '/video', { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: size,
  recordVideo: { dir: out + '/video', size },
});
const page = await context.newPage();

const errors = [];
const record = (message) => {
  errors.push(message);
  console.log('::error title=Error en el juego::' + message.replaceAll('\n', ' '));
};
page.on('pageerror', (error) => record(error.message));
page.on('console', (msg) => msg.type() === 'error' && record(msg.text()));

const shot = (name) => page.screenshot({ path: out + '/' + name + '.png' });
const wait = (ms) => page.waitForTimeout(ms);
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await wait(ms);
  await page.keyboard.up(key);
};
const tap = async (key) => {
  await page.keyboard.down(key);
  await wait(40);
  await page.keyboard.up(key);
};

await page.goto(url);
await page.waitForSelector('canvas', { timeout: 15_000 });
await wait(1500);
await shot('01-inicio');

// Recorre la introducción de cada escenario y vuelve al menú.
const stageShots = [
  '02-cinematica-ruinas',
  '03-cinematica-volcan',
  '04-cinematica-bosque',
  '05-cinematica-santuario',
];

for (let index = 0; index < stageShots.length; index++) {
  await tap('Enter'); // Inicio → selección de escenarios
  await wait(100);
  for (let down = 0; down < index; down++) await tap('ArrowDown');
  await tap('Enter'); // Escenario → cinemática
  await wait(450);
  await shot(stageShots[index]);
  for (let line = 0; line < 7; line++) {
    await tap('Enter'); // Avanzar una línea del diálogo
    await wait(210);
  }
  await wait(180);
  await tap('Escape'); // Combate → menú
  await wait(180);
}

// Inicia una partida completa en Ruinas de medianoche.
await tap('Enter');
await wait(120);
await tap('Enter');
await wait(450);
await shot('06-cinematica-dialogo');
for (let line = 0; line < 7; line++) {
  await tap('Enter');
  await wait(70);
}
await wait(500);
await shot('07-combate-ruinas');

// Escenario y parallax: J1 camina hacia la derecha, J2 hacia la izquierda.
await Promise.all([hold('d', 700), hold('ArrowRight', 1500)]);
await shot('08-parallax-derecha');
await hold('ArrowLeft', 2500);
await shot('09-parallax-izquierda');

// Pelea: J1 se acerca y ataca.
await Promise.all([hold('a', 1800), hold('ArrowRight', 1800)]);
await hold('d', 900);
await tap('f');
await wait(150);
await shot('10-ataque');
await wait(120);
await shot('11-golpe-explosion');
await wait(600);

// Teletransporte de J2.
await tap('k');
await wait(70);
await shot('12-teletransporte');
await wait(500);

// J1 se gira hacia el rival y lo vence a hachazos.
await hold('a', 120);
for (let i = 0; i < 14; i++) {
  await tap('f');
  await wait(520);
  if (i === 6) await shot('13-combate');
}
await wait(400);
await shot('14-ko');
await wait(1500);

// Reinicio.
await tap('r');
await wait(600);
await shot('15-reinicio');

await context.close();
await browser.close();

if (errors.length) {
  console.error('Errores en la página (' + errors.length + '):\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Captura completa.');
