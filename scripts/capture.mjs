// Abre el juego compilado en Chromium, valida los selectores y recorre los escenarios.
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

// Comprueba el modal de selección doble para Jugador vs Jugador.
await tap('Enter'); // Inicio → tipo de enfrentamiento
await tap('ArrowDown'); // Jugador vs Jugador
await tap('Enter');
await tap('Enter'); // Definitivo → primer selector
await shot('02-modal-seleccion-personaje');
await tap('Enter'); // Axem Violet → segundo selector
await wait(120);
await shot('03-modal-segundo-personaje');
await tap('ArrowDown');
await tap('Enter'); // Axem Orange → selección de escenario
await tap('Escape'); // Escenario → selector del segundo personaje
await tap('Escape'); // Personajes → formatos
await tap('Escape'); // Formatos → tipo de enfrentamiento
await tap('Escape'); // Tipo de enfrentamiento → inicio

// Comprueba también el modal de dos participantes para IA vs IA.
await tap('Enter');
await tap('ArrowDown');
await tap('ArrowDown');
await tap('Enter'); // IA vs IA
await tap('Enter'); // Definitivo → primer selector
await shot('04-modal-ia-uno');
await tap('Enter'); // Primer personaje → segundo selector
await shot('05-modal-ia-dos');
await tap('ArrowDown');
await tap('Enter'); // Segundo personaje → escenarios
await tap('Escape');
await tap('Escape');
await tap('Escape');
await tap('Escape');

// Recorre los cuatro escenarios con diferentes formatos de combate.
const stageShots = [
  '06-cinematica-ruinas',
  '07-cinematica-volcan',
  '08-cinematica-bosque',
  '09-cinematica-santuario',
];

for (let index = 0; index < stageShots.length; index++) {
  await tap('Enter'); // Inicio → tipo de enfrentamiento
  await tap('Enter'); // Jugador vs IA
  for (let down = 0; down < index; down++) await tap('ArrowDown');
  await tap('Enter'); // Formato → modal de personajes
  if (index === 0) await shot('10-modal-jugador-vs-ia');
  await tap('Enter'); // Elegir personaje; el rival recibe el otro ranger
  for (let down = 0; down < index; down++) await tap('ArrowDown');
  await tap('Enter'); // Escenario → cinemática
  await wait(450);
  await shot(stageShots[index]);
  for (let line = 0; line < 7; line++) {
    await tap('Enter'); // Avanzar diálogo hasta entrar al combate
    await wait(210);
  }
  await wait(180);
  await tap('Escape'); // Combate → menú
  await wait(180);
}

// Inicia una partida completa en Ruinas de medianoche.
await tap('Enter');
await tap('Enter');
await tap('Enter');
await tap('Enter');
await tap('Enter');
await wait(450);
await shot('11-cinematica-dialogo');
for (let line = 0; line < 7; line++) {
  await tap('Enter');
  await wait(70);
}
await wait(500);
await shot('12-combate-ruinas');

// La pausa debe detener el combate y mostrar los controles solo cuando se solicitan.
await tap('p');
await wait(120);
await shot('13-menu-pausa');
await tap('ArrowDown');
await tap('Enter'); // PAUSA → CONTROLES
await wait(100);
await shot('14-controles-dentro-de-pausa');
await tap('Escape'); // Controles → menú de pausa
await wait(80);
await tap('Enter'); // CONTINUAR → combate
await wait(150);

// Escenario y parallax: J1 camina hacia la derecha, J2 hacia la izquierda.
await Promise.all([hold('d', 700), hold('ArrowRight', 1500)]);
await shot('15-parallax-derecha');
await hold('ArrowLeft', 2500);
await shot('16-parallax-izquierda');

// Pelea: J1 se acerca y ataca.
await Promise.all([hold('a', 1800), hold('ArrowRight', 1800)]);
await hold('d', 900);
await tap('f');
await wait(150);
await shot('17-ataque');
await wait(120);
await shot('18-golpe-explosion');
await wait(600);

// Teletransporte de J2.
await tap('k');
await wait(70);
await shot('19-teletransporte');
await wait(500);

// J1 se gira hacia el rival y lo vence a hachazos.
await hold('a', 120);
for (let i = 0; i < 14; i++) {
  await tap('f');
  await wait(520);
  if (i === 6) await shot('20-combate');
}
await wait(400);
await shot('21-ko');
await wait(1500);

// Reinicio.
await tap('r');
await wait(600);
await shot('22-reinicio');

await context.close();
await browser.close();

if (errors.length) {
  console.error('Errores en la página (' + errors.length + '):\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Captura completa.');
