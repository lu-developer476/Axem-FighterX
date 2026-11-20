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

| | Mover | Hachazo | Teletransporte |
|---|---|---|---|
| **J1** Axem Violet | `A` / `D` | `F` | `G` |
| **J2** Axem Orange | `←` / `→` | `L` | `K` |

`P` o el botón `[ P ] PAUSA` abre el menú de pausa durante el combate. Desde allí podés continuar, consultar los controles o volver al menú principal. Los controles quedan ocultos mientras jugás. `R` reinicia la serie completa. `ESC` vuelve al menú desde el combate. Cada personaje apunta hacia donde se movió por última vez.

## Flujo de selección de partida

Desde **JUGAR** se elige el tipo de enfrentamiento (**Jugador vs IA**, **Jugador vs Jugador** o **IA vs IA**) y luego el formato (**Definitivo**, **2 rondas**, **5 rondas** o **Entrenamiento**). En **Jugador vs IA**, después de elegir personaje se puede jugar como **J1 desde el lado izquierdo** o **J2 desde el lado derecho**; el rival controlado por IA ocupa el lado contrario y se usan las teclas correspondientes al jugador elegido.

Los formatos respetan la cantidad total indicada: **Definitivo** disputa una ronda, **2 Rondas** disputa exactamente dos y **5 Rondas** disputa exactamente cinco. Entre rondas se muestra el marcador y se espera que el jugador pulse `ENTER` o `ESPACIO` para continuar. Al finalizar la cantidad prevista, gana quien haya obtenido más rondas; un empate en el marcador termina en empate. `ENTRENAMIENTO` permite elegir un fondo completamente sólido, con colores predefinidos o un selector de color personalizado.

En los enfrentamientos de dos participantes se solicitan dos selecciones de personaje; en **Jugador vs IA**, el rival recibe automáticamente el personaje restante.

## Escenarios y cinemáticas

En los formatos normales, el menú permite elegir entre cuatro escenarios. Antes de cada combate se reproduce una cinemática breve con una conversación contextual entre Axem Violet y Axem Orange. Los diálogos presentan la zona y la relación de trabajo entre ambos; se avanza con `ENTER` o `ESPACIO`, y se puede omitir con `ESC`.

| Escenario | Entorno |
|---|---|
| **Ruinas de medianoche** | Murallas antiguas bajo una luna inmóvil |
| **Cráter del exilio** | Puente de basalto, respiraderos y lava |
| **Bosque de los ecos** | Árboles gigantes, raíces y luces errantes |
| **Santuario celeste** | Columnas doradas, sellos y arquitectura suspendida |

Los cuatro fondos, relieves, suelos, límites y detalles ambientales se generan como texturas pixel art por código. No requieren imágenes externas adicionales. El fondo de entrenamiento se dibuja como un único color plano y no carga capas ambientales.

## Nitidez y renderizado

El lienzo lógico se mantiene en **480×270** para conservar la identidad pixel art. Phaser utiliza filtrado de vecino más cercano, posiciones redondeadas y zoom entero máximo para evitar escalados fraccionarios que suavizan los píxeles. El CSS del lienzo también fuerza el renderizado pixelado.

## Arquitectura

Clean Architecture con la regla de dependencia apuntando hacia adentro:
`presentation → infrastructure → application → domain`.

```
src/
├── domain/              Reglas puras. Sin Phaser ni DOM.
│   ├── arena/           Dimensiones, escenarios y reglas del escenario
│   ├── entities/        Fighter (estados, vida, hitboxes), Match (golpes, KO, objetos)
│   ├── geometry/        Utilidades de colisión
│   ├── match/           Formatos de combate y marcador de rondas
│   └── rangers/         Catálogo de personajes (stats) y fábrica
├── application/         Casos de uso
│   ├── ports/           InputPort (contrato de entrada)
│   └── useCases/        CreateMatch, UpdateMatch
├── infrastructure/      Adaptadores a tecnologías concretas
│   ├── input/           PhaserKeyboardInput (implementa InputPort)
│   ├── assets/          Manifiesto de sprites y datos de animación
│   └── graphics/        Escenarios, efectos e iconos pixel art generados por código
├── presentation/        Todo lo que dibuja
│   ├── animation/       Animador y registro de animaciones
│   ├── scenes/          PreloadScene, MenuScene, CinematicScene, FightScene
│   └── views/           FighterView, StageView, HudView, FxDirector, PickupView
├── config/              Resolución y configuración de Phaser
└── main.js              Composición: arma el juego
```

Para agregar un personaje: sumarlo a `rangerCatalog.js`, registrar su PNG en
`assetManifest.js` y sus animaciones en `characterAnimationData.js`.
Para cambiar el control (gamepad, táctil), basta con otro adaptador que implemente `InputPort`.

## Combate

- **Vida:** 100 por personaje, con barra y estela de daño en el HUD.
- **Hachazo:** carga (120 ms), fase activa con hitbox delante del personaje (110 ms) y recuperación (190 ms). Un ataque golpea una sola vez.
- **Golpe recibido:** daño, aturdimiento, retroceso y breve invulnerabilidad. Con 0 de vida, KO.
- **Teletransporte:** con el rival cerca reaparece detrás de él; si no, salta hacia adelante. Es invulnerable mientras dura y tiene enfriamiento.
- **Objetos de combate:** aparecen cada tanto y duran 9 segundos. El corazón recupera 25 puntos de vida; Furia aumenta el daño un 50%; Rapidez aumenta el movimiento un 40%; Escudo reduce el daño recibido un 50%. Los tres potenciadores duran 6,5 segundos y su estado se muestra debajo de cada barra de vida.
- **Recolección:** ambos jugadores pueden recoger objetos al tocarlos. El corazón no se consume si el luchador ya tiene toda la vida; los potenciadores se pueden renovar al recoger otro del mismo tipo.

## Variantes de género y atlas de sprites

Cada color jugable (Violet y Orange) tiene variante masculina y femenina. El menú permite elegir
las cuatro combinaciones; en Jugador vs IA, la IA recibe automáticamente el color opuesto con el
mismo género. La identidad de combate sigue siendo Violet/Orange, mientras que el género se
transporta como configuración visual independiente.

Las referencias masculinas usan los materiales disponibles de Axem Red:
`art/source/sprites/references/axem-red/preview.png`,
`preview (2).png` y los GIF `axem-ranger-run.gif`, `axem-ranger-bike.gif` y
`axem-ranger-double-axe.gif`. El atlas masculino original completo ya no está en el repositorio;
el generador conserva las imágenes de referencia disponibles y añade todas las páginas de esos GIF,
sin atribuir a la copia parcial las filas que ya no existen.

Las referencias femeninas usan la spritesheet maestra y las poses de
`art/source/sprites/references/axem-pink/`. La hoja maestra conserva la distribución original
completa; las poses individuales se agregan como material complementario. El proceso genera cuatro atlas PNG con fondo transparente:
`results/male/axem-ranger-violet.png`, `results/male/axem-ranger-orange.png`,
`results/female/axem-ranger-violet.png` y `results/female/axem-ranger-orange.png`.
La transformación conserva la luminosidad y saturación de los píxeles y cambia solo la familia
cromática del traje. Las referencias originales no se sobrescriben.

`npm run prepare:sprites` ejecuta el generador. También se ejecuta automáticamente antes de
`npm test`, `npm run dev` y `npm run build`. Los cuatro retratos de combate y las dos poses masculinas laterales del menú se escriben en
`public/generated/`; Phaser los carga por color y género. Las poses del menú se extraen primero de
`art/source/sprites/results/male/preview (1).png`: el generador detecta dos figuras separadas,
recorta cada pose y aplica la paleta Violet u Orange. Si esa referencia no contiene dos figuras
recortables, usa las hojas originales de Axem Red como respaldo. Los atlas completos
quedan en `art/source/sprites/results/` como hojas de referencia.

La dirección original de cada variante se declara por género en
`characterAnimationData.js`. Combate, cinemática y menú aplican `shouldFlip()` con esa misma
referencia, de modo que cada personaje mira hacia el lado al que se desplaza. El menú principal
agrupa a las femeninas sobre el panel INICIO y ubica a los masculinos en los laterales con dos
poses distintas extraídas de la referencia masculina.

El juego conserva sus estados de combate (reposo, movimiento, ataque, daño, teletransporte y KO)
con las poses procedurales actuales. Para integrar secuencias cuadro a cuadro, cada color tiene
en `results/male/<color>/sequences/` una tira por grupo del atlas Red (idle, walk y attack son
`group-01`, `group-02` y `group-03`) y las hojas femeninas conservan toda la referencia de Pink.
Las coordenadas de cada cuadro, el orden y las zonas excluidas están en
`art/source/sprites/README.md`; se regeneran con `node scripts/analyze-atlas.mjs`.

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
