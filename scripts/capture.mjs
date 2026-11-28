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

// Comprueba los submenús JUGAR y CARRERA antes de iniciar el combate.
await tap('Enter'); // Inicio → JUGAR
await shot('01b-menu-jugar');
await tap('ArrowDown'); // JUGAR → CARRERA
await tap('Enter');
await shot('01c-menu-carrera');
await tap('Escape'); // CARRERA → JUGAR
await tap('Enter'); // JUGAR → COMBATE
await tap('ArrowDown'); // Jugador vs Jugador
await tap('Enter'); // Abrir el menú de formatos
await tap('ArrowDown'); // DEFINITIVO → RONDAS
await tap('Enter'); // Abrir el modal independiente de rondas
await shot('01d-modal-rondas');
await tap('Escape'); // RONDAS → MODO
await tap('Enter'); // DEFINITIVO → primer selector
await shot('02-modal-seleccion-personaje');
await tap('Enter'); // J1 elige Axem → selector de J2
await wait(120);
await shot('03-modal-segundo-personaje');
await tap('Enter'); // J2 elige el mismo Axem: combate espejo
await shot('03b-modal-esquinas');
await tap('ArrowDown');
await tap('Enter'); // J1 elige la esquina derecha
await tap('ArrowDown');
await tap('ArrowDown');
await tap('Enter'); // J2 elige la esquina izquierda
for (let down = 0; down < 5; down++) await tap('ArrowDown');
await tap('Enter'); // Confirmar esquinas opuestas → escenarios
await tap('Enter'); // Primer escenario → cinemática
await tap('Escape'); // Iniciar combate espejo con J1 a la derecha
await wait(500);
await shot('03c-combate-espejo-j1-derecha');
await tap('Escape'); // Volver al menú

// Comprueba también el modal de dos participantes para IA vs IA.
await tap('Enter'); // Inicio → JUGAR
await tap('Enter'); // JUGAR → COMBATE
await tap('ArrowDown');
await tap('ArrowDown');
await tap('Enter'); // IA vs IA
await tap('Enter'); // Definitivo → primer selector
await shot('04-modal-ia-uno');
await tap('Enter'); // Primer personaje → segundo selector
await shot('05-modal-ia-dos');
await tap('ArrowDown');
await tap('Enter'); // Segundo Axem
await tap('Escape'); // Escenario → segundo personaje
await tap('Escape'); // Segundo personaje → primero
await tap('Escape'); // Primer personaje → formato
await tap('Escape'); // Formato → tipo de enfrentamiento
await tap('Escape'); // Tipo de enfrentamiento → JUGAR
await tap('Escape'); // JUGAR → inicio

// Recorre los cuatro escenarios con diferentes formatos de combate.
const stageShots = [
  '06-cinematica-ruinas-masculino',
  '07-cinematica-volcan',
  '08-cinematica-bosque',
  '09-cinematica-santuario',
  '24-cinematica-avenida-apagon',
  '25-cinematica-llanura-torre-rota',
  '26-cinematica-fauces-obsidiana',
];

for (let index = 0; index < stageShots.length; index++) {
  await tap('Enter'); // Inicio → JUGAR
  await tap('Enter'); // JUGAR → COMBATE
  await tap('Enter'); // Jugador vs IA
  const combatModeIndex = index % 3;
  for (let down = 0; down < combatModeIndex; down++) await tap('ArrowDown');
  await tap('Enter'); // Formato → modal de personajes
  if (index === 0) await shot('27-modal-jugador-vs-ia');
  await tap('Enter'); // Elegir Axem
  await tap('Enter'); // Elegir controles J1 y esquina izquierda
  for (let down = 0; down < 3; down++) await tap('ArrowDown');
  await tap('Enter'); // Confirmar controles y abrir la selección de escenario
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

// Comprueba el modo de entrenamiento y el fondo sólido predeterminado.
await tap('Enter'); // Inicio → JUGAR
await tap('Enter'); // JUGAR → COMBATE
await tap('Enter'); // Jugador vs IA
await tap('ArrowDown');
await tap('ArrowDown');
await tap('ArrowDown');
await tap('Enter'); // Entrenamiento → selección de personaje
await tap('Enter'); // Elegir Axem → esquema de teclas
await tap('Enter'); // Elegir J1 / izquierda
for (let down = 0; down < 3; down++) await tap('ArrowDown');
await tap('Enter'); // Continuar → paleta de entrenamiento
await shot('10-entrenamiento-colores');
for (let down = 0; down < 12; down++) await tap('ArrowDown');
await tap('Enter'); // COMENZAR con el color sólido seleccionado
await wait(450);
await shot('11-entrenamiento-fondo');
await tap('Escape'); // Entrenamiento → menú
await wait(180);

// Inicia una partida completa en Ruinas de medianoche.
await tap('Enter'); // Inicio → JUGAR
await tap('Enter'); // JUGAR → COMBATE
await tap('Enter'); // Jugador vs IA
await tap('Enter'); // Definitivo
await tap('Enter'); // Elegir Axem
await tap('Enter'); // Elegir J1 / izquierda
for (let down = 0; down < 3; down++) await tap('ArrowDown');
await tap('Enter'); // Continuar → escenarios
await tap('Enter'); // Elegir primer escenario
await wait(450);
await shot('12-cinematica-dialogo');
for (let line = 0; line < 7; line++) {
  await tap('Enter');
  await wait(70);
}
await wait(500);
await shot('28-combate-ruinas');

// La pausa debe detener el combate y mostrar los controles solo cuando se solicitan.
await tap('p');
await wait(120);
await shot('14-menu-pausa');
await tap('ArrowDown');
await tap('Enter'); // PAUSA → CONTROLES
await wait(100);
await shot('15-controles-dentro-de-pausa');
await tap('Escape'); // Controles → menú de pausa
await wait(80);
await tap('Enter'); // CONTINUAR → combate
await wait(150);

// Escenario y parallax: J1 camina hacia la derecha, J2 hacia la izquierda.
await Promise.all([hold('d', 700), hold('ArrowRight', 1500)]);
await shot('16-parallax-derecha');
await hold('ArrowLeft', 2500);
await shot('17-parallax-izquierda');

// Pelea: J1 se acerca y ataca.
await Promise.all([hold('a', 1800), hold('ArrowRight', 1800)]);
await hold('d', 900);
await tap('f');
await wait(150);
await shot('18-ataque');
await wait(120);
await shot('19-golpe-explosion');
await wait(600);

// Teletransporte de J2.
await tap('k');
await wait(70);
await shot('20-teletransporte');
await wait(500);

// J1 se gira hacia el rival y lo vence a hachazos.
await hold('a', 120);
for (let i = 0; i < 14; i++) {
  await tap('f');
  await wait(520);
  if (i === 6) await shot('21-combate');
}
await wait(400);
await shot('22-ko');
await wait(1500);

// Reinicio.
await tap('r');
await wait(600);
await shot('23-reinicio');

// Smoke tests reales de las carreras. El teclado se enfoca en el canvas del iframe
// y Haxe confirma el cambio de estado al recibir ENTER.
const focusGameFrame = async (mode) => {
  const frame = page.frames().find((candidate) =>
    candidate.url().includes('/minigames/index.html?mode=' + mode)
  );
  if (!frame) throw new Error('No se encontró el documento HaxeFlixel de la carrera ' + mode + '.');

  const canvas = frame.locator('#openfl-content canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 20_000 });
  await canvas.evaluate((element) => {
    element.setAttribute('tabindex', '0');
    element.focus();
  });

  const focus = await frame.evaluate(() => document.activeElement?.tagName ?? null);
  if (focus !== 'CANVAS') {
    throw new Error('El canvas HaxeFlixel no recibió el foco de teclado (' + focus + ').');
  }
  return frame;
};

const gameTap = async (frame, key) => {
  await frame.locator('#openfl-content canvas').first().focus();
  await page.keyboard.down(key);
  await wait(45);
  await page.keyboard.up(key);
};
const gameHold = async (frame, key, ms) => {
  await frame.locator('#openfl-content canvas').first().focus();
  await page.keyboard.down(key);
  await wait(ms);
  await page.keyboard.up(key);
};

const startRaceFromMenu = async (land) => {
  const mode = land ? 'land' : 'axem';
  await page.goto(url);
  await page.waitForSelector('canvas', { timeout: 15_000 });
  await wait(900);
  await page.evaluate(() => {
    window.__axemMinigameReady = null;
    window.__axemMinigameStarted = null;
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'axem-minigame-ready') {
        window.__axemMinigameReady = event.data;
      }
      if (event.data?.type === 'axem-minigame-started') {
        window.__axemMinigameStarted = event.data;
      }
    });
  });

  await tap('Enter'); // Inicio → JUGAR
  await tap('ArrowDown'); // JUGAR → CARRERA
  await tap('Enter'); // Modal de modalidades
  if (land) await tap('ArrowDown'); // CARRERA TERRESTRE
  await tap('Enter'); // Abrir minijuego

  await page.waitForSelector('iframe[title]', { timeout: 10_000 });
  const frame = await focusGameFrame(mode);
  await page.waitForFunction(
    (expectedMode) => window.__axemMinigameReady?.mode === expectedMode,
    mode,
    { timeout: 20_000 },
  );

  const ready = await page.evaluate(() => window.__axemMinigameReady);
  const expectedMaps = land ? 2 : 3;
  if (ready.mapCount !== expectedMaps) {
    throw new Error('HaxeFlixel inició ' + mode + ' con ' + ready.mapCount
      + ' mapas; se esperaban ' + expectedMaps + '.');
  }
  console.log('Minijuego ' + mode + ' listo; mapas detectados: ' + ready.mapCount);

  await gameTap(frame, 'Enter');
  await page.waitForFunction(
    (expectedMode) => window.__axemMinigameStarted?.mode === expectedMode,
    mode,
    { timeout: 5_000 },
  );
  console.log('HaxeFlixel recibió ENTER e inició la carrera ' + mode + '.');
  return frame;
};

const landFrame = await startRaceFromMenu(true);
await shot('29-carrera-terrestre-selector');
await wait(3400); // Cuenta regresiva
await gameHold(landFrame, 'ArrowRight', 600); // Correr hacia la derecha
await gameTap(landFrame, 'ArrowUp'); // Saltar
await wait(250);
await gameTap(landFrame, 'ArrowDown'); // Rodar
await gameHold(landFrame, 'd', 450); // Dash
await shot('30-carrera-terrestre-en-juego');
await gameTap(landFrame, 'Escape');
await page.waitForSelector('iframe[title]', { state: 'detached', timeout: 5_000 });

// Carrera Axem: aceleración, freno, disparo/carga, salto y dirección lateral.
const axemFrame = await startRaceFromMenu(false);
await shot('31-carrera-axem-selector');
await gameTap(axemFrame, 'ArrowRight'); // Cambiar distancia
await gameHold(axemFrame, 'a', 650); // Acelerar
await gameTap(axemFrame, 'ArrowDown'); // Cambiar carril
await gameTap(axemFrame, 'Space'); // Saltar
await gameHold(axemFrame, 's', 260); // Cargar disparo especial
await gameTap(axemFrame, 'ArrowLeft'); // Desplazamiento lateral
await gameHold(axemFrame, 'b', 250); // Frenar
await shot('32-carrera-axem-en-juego');
await gameTap(axemFrame, 'Escape');
await page.waitForSelector('iframe[title]', { state: 'detached', timeout: 5_000 });

// Verifica que el favicon principal realmente apunta al GIF animado.
await page.goto(url);
await page.waitForSelector('canvas', { timeout: 15_000 });
const favicon = await page.locator('link[rel="icon"][type="image/gif"]').first().getAttribute('href');
if (!favicon) record('No se registró favicon GIF en la aplicación principal.');
else {
  const response = await page.request.get(new URL(favicon, url).href);
  if (!response.ok() || !response.headers()['content-type']?.includes('image/gif')) {
    record('El favicon GIF no responde con HTTP correcto y MIME image/gif.');
  }
}
await context.close();
await browser.close();

if (errors.length) {
  console.error('Errores en la página (' + errors.length + '):\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Captura completa.');
