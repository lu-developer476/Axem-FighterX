# Axem FighterX

Juego de pelea retro hecho con **Phaser 3** y **Vite**, listo para desplegar en **Vercel**.

## Comandos

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # tests de dominio y casos de uso (Vitest)
npm run build    # genera dist/
npm run preview  # sirve dist/ localmente
```

Controles:

| Jugador | Movimiento terrestre | Vuelo | Movimientos |
|---|---|---|---|
| **J1** | Izquierda `A` · Derecha `D` · Arriba `W` · Abajo `S` | Subir `Q` · Bajar `E` | Hachazo `F` · Teletransporte `G` · Dash `C` · Bloquear `V` · Esquivar `X` · Especial `Z` |
| **J2** | Izquierda `←` · Derecha `→` · Arriba `↑` · Abajo `↓` | Subir `I` · Bajar `O` | Hachazo `L` · Teletransporte `K` · Dash `H` · Bloquear `N` · Esquivar `J` · Especial `M` |

`P` o el botón `[ P ] PAUSA` abre el menú de pausa durante el combate. Desde allí podés continuar, consultar los controles o volver al menú principal. Los controles quedan ocultos mientras jugás. `R` reinicia la serie completa. `ESC` vuelve al menú desde el combate. Cada personaje apunta hacia donde se movió por última vez.

## Flujo de selección de partida

Desde **JUGAR** se elige el tipo de enfrentamiento (**Jugador vs IA**, **Jugador vs Jugador** o **IA vs IA**) y luego el formato (**Definitivo**, **2 rondas**, **5 rondas** o **Entrenamiento**). En **Jugador vs Jugador**, cada participante elige de manera independiente su Axem, género y esquina inicial; ambos deben escoger lados opuestos. Los controles J1/J2 siguen a cada jugador aunque empiece desde la izquierda o la derecha: no existe una asociación fija entre un color Axem y un número de jugador. En **Jugador vs IA**, se elige Axem y género para el jugador humano, además de si utiliza el esquema J1 desde la izquierda o J2 desde la derecha; la IA ocupa el lado contrario.

Los formatos respetan la cantidad total indicada: **Definitivo** disputa una ronda, **2 Rondas** disputa exactamente dos y **5 Rondas** disputa exactamente cinco. Entre rondas se muestra el marcador y se espera que el jugador pulse `ENTER` o `ESPACIO` para continuar. Al finalizar la cantidad prevista, gana quien haya obtenido más rondas; un empate en el marcador termina en empate. `ENTRENAMIENTO` permite elegir un fondo completamente sólido, con colores predefinidos o un selector de color personalizado.

El selector de personajes ofrece únicamente **Axem Naranja masculino** mientras las demás spritesheets no estén listas. En **Jugador vs Jugador**, ambos participantes usan esa variante y mantienen sus respectivos esquemas de teclado y esquinas. En **Jugador vs IA**, el rival controlado por IA también utiliza Axem Naranja masculino.

## Escenarios y cinemáticas

En los formatos normales, el menú presenta directamente los escenarios descubiertos en las carpetas de recursos. Se retiró el catálogo fijo de arenas que se había definido al comienzo del juego: cada mapa y cada tileset existente pasa a ser una opción independiente.

Los mapas se descubren en `art/source/environments/maps/`. El inventario actual incluye `castle.png`, `cave-1.png`, `cave-2.png`, `practice-zone.png` y `sidescroll-1.png` a `sidescroll-4.png`. Los tilesets se descubren en `art/source/environments/maps/tilesets/` y generan fondos procedurales reproducibles; hoy se incluyen `cave1-tileset.png`, `cave2-tileset.png`, `darknes-tileset.png`, `sidescroll-tileset.png` y `space-merc-tileset.png`.

La selección se pagina automáticamente cuando el inventario supera ocho opciones. Los mapas usan su imagen como fondo y los tilesets generan un escenario visual a partir de sus celdas. Ninguno modifica hitboxes, el plano del suelo ni las reglas de combate. Cada escenario conserva una cinemática contextual genérica y los diálogos de resultado.

### Recursos automáticos de mapas, tilesets y música

El descubrimiento usa `import.meta.glob` de Vite: al incorporar un mapa compatible en `art/source/environments/maps/` o un tileset en `maps/tilesets/` y ejecutar el siguiente build, aparece como escenario seleccionable sin modificar manifiestos ni código. Los mapas admiten PNG, WebP, JPG y JPEG. Cada tileset genera una variante ambiental mediante composición determinista de sus celdas; el tamaño predeterminado es 32×32 y se puede sobrescribir con un JSON del mismo nombre base. Las piezas generadas son decoración, no plataformas ni colisiones.

La música también se descubre automáticamente en `art/source/effects/music/`. Se admiten OGG, MP3, WAV, M4A, AAC y WebM. Si hay varias codificaciones con el mismo nombre base, se prioriza OGG y se utiliza otra compatible cuando el navegador no puede reproducirlo. `menu.ogg` se reserva para el menú; `<stage-id>--<nombre>.ogg` identifica música de un escenario; las pistas sin etiqueta alimentan una rotación global determinista. La reproducción es en bucle, bajo demanda y sujeta a la política de interacción del navegador. El modo entrenamiento conserva su fondo sólido.

## Nitidez y renderizado

El lienzo lógico se mantiene en **480×270** para conservar la identidad pixel art. Phaser utiliza filtrado de vecino más cercano, posiciones redondeadas y zoom entero máximo para evitar escalados fraccionarios que suavizan los píxeles. El CSS del lienzo también fuerza el renderizado pixelado.

## Arquitectura

Clean Architecture con la regla de dependencia apuntando hacia adentro:
`presentation → infrastructure → application → domain`.

```
src/
├── domain/              Reglas puras. Sin Phaser ni DOM.
│   ├── arena/           Dimensiones y reglas físicas del combate
│   ├── entities/        Fighter (estados, vida, hitboxes), Match (golpes, KO, objetos)
│   ├── geometry/        Utilidades de colisión
│   ├── match/           Formatos de combate y marcador de rondas
│   └── rangers/         Catálogo de personajes (stats) y fábrica
├── application/         Casos de uso
│   ├── ports/           InputPort (contrato de entrada)
│   └── useCases/        CreateMatch, UpdateMatch
├── infrastructure/      Adaptadores a tecnologías concretas
│   ├── input/           PhaserKeyboardInput (implementa InputPort)
│   ├── assets/          Descubrimiento de mapas, tilesets, sprites y animaciones
│   └── graphics/        Fondos procedurales desde tilesets, efectos e iconos pixel art
├── presentation/        Todo lo que dibuja
│   ├── animation/       Animador y registro de animaciones
│   ├── scenes/          PreloadScene, MenuScene, CinematicScene, FightScene
│   └── views/           FighterView, StageView, HudView, FxDirector, PickupView
├── config/              Resolución y configuración de Phaser
└── main.js              Composición: arma el juego
```

Para agregar un personaje: sumarlo a `rangerCatalog.js`, registrar su PNG en
`assetManifest.js` y sus animaciones en `characterAnimationData.js`.
Para agregar un escenario, colocar un PNG, WebP, JPG o JPEG en `art/source/environments/maps/`, o un tileset compatible en `art/source/environments/maps/tilesets/`. El siguiente build lo agrega automáticamente al selector. Se admiten subcarpetas; las imágenes de `tilesets/` se procesan como recursos procedurales y no como mapas directos.
Para cambiar el control (gamepad, táctil), basta con otro adaptador que implemente `InputPort`.

## Minijuegos (HaxeFlixel)

Los dos minijuegos se ejecutan en **HaxeFlixel compilado a HTML5**. Phaser conserva el menú, las cinemáticas y todo el combate; las carreras se montan en un iframe aislado y regresan al menú mediante un mensaje entre ventanas. No se comparten objetos de escena ni instancias de motor.

- **Carrera Axem:** carrera de motos de dos carriles, con un rival controlado por IA, aceleración, frenado, nitro y objetos de impulso o ralentización. Se puede elegir 7 km o 25 km.
- **Carrera terrestre:** carrera de resistencia de 5 km contra un rival IA, con aceleración, frenado y recuperación de resistencia.

Controles de Carrera Axem: D acelera, A frena, flechas izquierda/derecha mueven lateralmente, flechas arriba/abajo cambian de carril, N activa nitro, P pausa y ESC vuelve al menú. Carrera terrestre: D/→ corre, A/← frena, P pausa, R reinicia y ESC vuelve al menú.

Se necesita Haxe, Haxelib, Lime, OpenFL y HaxeFlixel. El proyecto está en `haxeflixel/`; `npm run prepare:haxe-assets && npm run build:haxe` genera el HTML5 en `public/minigames/`. `npm run dev` lo compila antes de iniciar Vite. CI también lo compila y versiona junto con los sprites; el build de Vercel consume el HTML5 ya generado desde el repositorio.

## Combate

- **Vida:** 100 por personaje, con barra y estela de daño en el HUD.
- **Hachazo:** carga (120 ms), fase activa con hitbox delante del personaje (110 ms) y recuperación (190 ms). Un ataque golpea una sola vez.
- **Golpe recibido:** daño, aturdimiento, retroceso y breve invulnerabilidad. Con 0 de vida, KO.
- **Teletransporte:** con el rival cerca reaparece detrás de él; si no, salta hacia adelante. Es invulnerable mientras dura y tiene enfriamiento.
- **IA táctica:** estima la trayectoria del rival, comprueba alcance y carril antes de atacar, esquiva golpes anunciados y busca objetos que realmente le sirvan. Registra la cadencia del oponente y ajusta sus ventanas de respuesta.
- **Progresión:** en series de varias rondas la IA pasa del nivel 1 hasta el nivel 5, con ataques más frecuentes, mayor anticipación y mejores respuestas defensivas. Reiniciar la serie restablece el nivel.
- **Plano de suelo:** una única coordenada en `ARENA.groundY` gobierna el spawn, los pies de los luchadores, las barreras, los apoyos del escenario y los objetos; el carril jugable se compactó para acercar la acción al piso.
- **Objetos de combate:** aparecen cada tanto y duran 9 segundos. El corazón recupera 25 puntos de vida; Furia aumenta el daño un 50%; Rapidez aumenta el movimiento un 40%; Escudo reduce el daño recibido un 50%. Los tres potenciadores duran 6,5 segundos y su estado se muestra debajo de cada barra de vida.
- **Recolección:** ambos jugadores pueden recoger objetos al tocarlos. El corazón no se consume si el luchador ya tiene toda la vida; los potenciadores se pueden renovar al recoger otro del mismo tipo.

## Sprites y animaciones

La variante seleccionable actual es **Axem Naranja masculino**. Sus recursos de combate se generan desde las referencias originales de Axem Red en `art/source/sprites/references/axem-red/`. El pipeline conserva los fotogramas fuente y genera tiras PNG transparentes con un pivote común para el combate.

El combate reproduce secuencias cuadro a cuadro de reposo, carrera, hachazo doble, carga, guardia, daño, rodada, salto, teletransporte, victoria y KO. Las hojas que todavía no están terminadas no se ofrecen en los selectores ni se cargan en las pantallas de juego. Las referencias Pink se conservan como material fuente, sin publicar una variante jugable incompleta.

`npm run prepare:sprites` regenera los recursos. También se ejecuta automáticamente antes de los tests y del build de Vite.

## Despliegue en Vercel

1. Subir el repo a GitHub.
2. En Vercel: **Add New → Project** e importar `Axem-FighterX`.
3. Vercel detecta Vite; `vercel.json` ya fija `npm run build` y `dist`.

## CI y vista previa (GitHub Actions)

Cada push a `main` ejecuta `.github/workflows/ci.yml`:

1. Tests y build.
2. Captura automática con Playwright: menú, cinemática, combate, movimiento, golpes, teletransporte y reinicio; guarda video y screenshots en el artefacto `capturas-y-video`.
3. Publicación jugable en GitHub Pages.

Requiere **Settings → Pages → Source: GitHub Actions**. Para correr la captura en local: `npm run build && npm run preview` y, en otra terminal, `npm run capture`.

## Movimiento y efectos visuales ampliados

- **Dash:** J1 activa el impulso con `C`; J2 con `H`. Dura 180 ms y tiene un enfriamiento de 900 ms. No concede invulnerabilidad ni altera el daño.
- **Defensa:** J1 mantiene el bloqueo con `V`; J2 con `N`. Solo reduce el daño cuando el luchador mira hacia el atacante; el golpe bloqueado conserva daño residual y una breve reacción.
- **Esquiva:** J1 pulsa `X`; J2 pulsa `J`. Ejecuta una rodada diferenciada del dash, con una ventana corta de evasión y enfriamiento propio.
- **Ataque especial:** J1 pulsa `Z`; J2 pulsa `M`. Tiene anticipación, impacto y recuperación más largos; inflige más daño y requiere esperar su enfriamiento.
- **Aterrizaje y resultado:** el contacto con el suelo reproduce una animación breve; el KO y la victoria usan secuencias de cierre independientes.
- **Carrera:** durante la cuenta regresiva el ciclista usa una espera lenta; aceleración, frenado y nitro modifican la cadencia y la inclinación. La meta activa animaciones distintas para victoria y derrota.
- **Escenarios:** cada mapa disponible se utiliza como fondo de combate y cada tileset genera un entorno procedural reproducible. Los nuevos recursos compatibles se incorporan automáticamente al selector.
- **Música:** pistas WAV contextuales con carga diferida y reproducción en bucle.
- **Efectos contextuales:** polvo y estela al hacer dash, nube de aterrizaje, chispas eléctricas, ráfagas de impacto, explosiones, humo, escombros y partículas que cambian según el material de cada escenario.

## Personaje disponible

La selección ofrece temporalmente solo **Axem Naranja masculino**. Hasta que estén listas las demás spritesheets, el rival IA utiliza la misma variante, sin mostrar retratos ni nombres de personajes incompletos.

## Carrera de motos

La carrera de motos usa HaxeFlixel y mantiene cuatro participantes: J1 y tres rivales controlados por IA. El jugador compite con la variante Orange actual; los otros rivales se distinguen por el tinte de sus sprites. Tiene dos carriles, cambio lateral, aceleración, frenado, nitro y objetos de impulso/ralentización.

## Música

- Menú: `menu--cathedral`.
- Combates: `combat--dark-music-final`.
- Carrera de motos: `race--mecha-collection`.
- Carrera terrestre: `race--slow-dark-music`.

Los roles se asignan de forma explícita en `src/infrastructure/audio/GameMusic.js`; los archivos originales permanecen en la carpeta común de música para no duplicar audio.

## Backend, SEO y seguridad

- `GET /api/health` expone una comprobación mínima y sin secretos mediante Vercel Functions.
- `index.html` declara metadatos SEO, Open Graph, Twitter Card y datos estructurados de VideoGame; `public/robots.txt` habilita rastreo.
- `vercel.json` configura CSP y cabeceras HTTP de seguridad.
- El alcance actual no requiere base de datos ni autenticación. La evolución segura prevista está documentada en `docs/SECURITY-ROADMAP.md`.
