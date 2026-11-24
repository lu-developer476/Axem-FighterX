import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = path.join(ROOT, 'haxeflixel');
const OUTPUT = path.join(PROJECT, 'export', 'html5', 'bin');
const PUBLIC_OUTPUT = path.join(ROOT, 'public', 'minigames');

const BOOTSTRAP = [
  '(function () {',
  '  window.addEventListener("touchmove", function (event) {',
  '    event.preventDefault();',
  '  }, { capture: false, passive: false });',
  '',
  '  if (typeof window.devicePixelRatio !== "undefined" && window.devicePixelRatio > 2) {',
  '    var viewport = document.getElementById("viewport");',
  '    if (viewport) {',
  '      viewport.setAttribute("content",',
  '        "width=device-width, initial-scale=" + (2 / window.devicePixelRatio) + ", user-scalable=no");',
  '    }',
  '  }',
  '',
  '  lime.embed("index", "openfl-content", 480, 270, { parameters: {} });',
  '}());',
  '',
].join('\n');

async function prepareCspCompatibleHtml() {
  const htmlPath = path.join(OUTPUT, 'index.html');
  let html = await fs.readFile(htmlPath, 'utf8');

  if (!/id=["']openfl-content["']/.test(html)) {
    throw new Error('La plantilla HTML5 de Lime no contiene el contenedor #openfl-content esperado.');
  }
  if (!/<script\b[^>]*\bsrc=["']\.\/index\.js["'][^>]*><\/script>/i.test(html)) {
    throw new Error('La plantilla HTML5 de Lime no referencia ./index.js.');
  }

  // Lime inserta scripts inline para viewport/touch y lime.embed. Vercel usa
  // script-src 'self', por lo que se externalizan sin relajar la CSP.
  html = html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (script, attributes) => (
    /\bsrc\s*=/.test(attributes) ? script : ''
  ));

  if (/<script\b(?![^>]*\bsrc\s*=)[^>]*>/i.test(html)) {
    throw new Error('La página HTML5 conserva scripts inline no permitidos por la CSP.');
  }
  if (!/<script\b[^>]*\bsrc=["']\.\/index\.js["'][^>]*><\/script>/i.test(html)) {
    throw new Error('Se eliminó accidentalmente el script principal de HaxeFlixel.');
  }

  html = html.replace(
    /<\/body>/i,
    '  <script type="text/javascript" src="./minigame-bootstrap.js"></script>\n</body>',
  );
  await fs.writeFile(htmlPath, html);
  await fs.writeFile(path.join(OUTPUT, 'minigame-bootstrap.js'), BOOTSTRAP);
}

async function main() {
  const result = spawnSync('haxelib', ['run', 'lime', 'build', 'html5', '-release'], {
    cwd: PROJECT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw new Error('No se pudo ejecutar Haxe/Lime. Instalá Haxe, Lime, OpenFL y HaxeFlixel antes de compilar.');
  }
  if (result.status !== 0) {
    throw new Error('Falló la compilación HTML5 de HaxeFlixel (código ' + result.status + ').');
  }

  try {
    await fs.access(path.join(OUTPUT, 'index.html'));
  } catch {
    throw new Error('Lime terminó sin generar export/html5/bin/index.html.');
  }

  await prepareCspCompatibleHtml();
  await fs.rm(PUBLIC_OUTPUT, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_OUTPUT, { recursive: true });
  await fs.cp(OUTPUT, PUBLIC_OUTPUT, { recursive: true });
  console.log('HaxeFlixel compilado y externalizado para CSP en public/minigames/.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
