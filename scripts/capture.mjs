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
await tap('Enter');
await tap('Enter'); // Definitivo → primer selector
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

// Comprueba que la carrera terrestre está disponible desde el menú y que las animaciones responden.
await tap('Escape'); // Combate → menú
await wait(180);
await tap('Enter'); // Inicio → JUGAR
await tap('ArrowDown'); // JUGAR → CARRERA
await tap('Enter'); // Abrir modalidades de carrera
await tap('ArrowDown'); // CARRERA TERRESTRE
await tap('Enter');
await wait(3200); // Cuenta regresiva
await hold('d', 620); // Sprint
await tap('w'); // Salto de la primera valla
await wait(500);
await hold('d', 300);
await hold('d', 200); // Ajusta la distancia antes de la barra baja
await tap('s'); // Rodada ante el siguiente obstáculo
await hold('d', 650);
await shot('29-carrera-terrestre');
await tap('Escape');
await wait(150);

// Comprueba la carrera de motos: cuatro carriles, tres IA, obstáculos y nitro.
await tap('Enter'); // Inicio → JUGAR
await tap('ArrowDown'); // JUGAR → CARRERA
await tap('Enter'); // Abrir modalidades de carrera
await tap('Enter'); // CARRERA AXEM
await tap('ArrowRight'); // J1 elige Axem Naranja masculino
await shot('30-seleccion-axem-carrera-motos');
await tap('Enter'); // Confirmar personaje elegido
await wait(3200); // Cuenta regresiva
await hold('ArrowRight', 900); // Acelerar
await tap('ArrowDown'); // Cambiar al carril inferior
await hold('Space', 700); // Nitro
await tap('ArrowUp'); // Volver al carril superior
await hold('ArrowRight', 700);
await shot('31-carrera-motos-cuatro-carriles');
await tap('Escape');
await wait(150);

await context.close();
await browser.close();

if (errors.length) {
  console.error('Errores en la página (' + errors.length + '):\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Captura completa.');
