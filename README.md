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

`R` reinicia la partida. Cada personaje apunta hacia donde se movió por última vez.

## Arquitectura

Clean Architecture con la regla de dependencia apuntando hacia adentro:
`presentation → infrastructure → application → domain`.

```
src/
├── domain/              Reglas puras. Sin Phaser ni DOM.
│   ├── arena/           Dimensiones y reglas del escenario
│   ├── entities/        Fighter (estados, vida, hitboxes), Match (golpes, KO, objetos)
│   ├── geometry/        Utilidades de colisión
│   └── rangers/         Catálogo de personajes (stats) y fábrica
├── application/         Casos de uso
│   ├── ports/           InputPort (contrato de entrada)
│   └── useCases/        CreateMatch, UpdateMatch
├── infrastructure/      Adaptadores a tecnologías concretas
│   ├── input/           PhaserKeyboardInput (implementa InputPort)
│   ├── assets/          Manifiesto de sprites y datos de animación
│   └── graphics/        Escenario, efectos e iconos pixel art generados por código
├── presentation/        Todo lo que dibuja
│   ├── animation/       Animador y registro de animaciones
│   ├── scenes/          PreloadScene, FightScene
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

## Animaciones por datos

Cada personaje declara sus estados en `src/infrastructure/assets/characterAnimationData.js`:
`idle`, `walk`, `attack`, `hurt`, `teleport` y `ko`.

Mientras no haya hojas de sprites, el juego usa la pose actual con animaciones por código
(respiración, inclinación al caminar, hachazo, destello al recibir daño, desvanecimiento al teletransportarse, caída en KO).

**Para sumar sprites reales:**

1. Subí una tira horizontal por estado a `art/source/<ranger>/<estado>.png`,
   por ejemplo `art/source/violet/walk.png`.
   Todos los cuadros del mismo tamaño, en una sola fila, con fondo transparente, los pies tocando
   el borde inferior y el personaje mirando hacia el mismo lado que la pose base (hoy, la izquierda;
   si tus tiras miran al otro lado, cambiá `spriteFacing` en `characterAnimationData.js`).
2. En `characterAnimationData.js`, ajustá `frames` a la cantidad real de cuadros de esa tira
   (y `frameRate` en `idle` y `walk`).
3. Listo: el archivo se detecta al compilar (reiniciá el servidor de desarrollo si estaba abierto). Las animaciones de ataque, golpe, teletransporte y KO
   se ajustan solas a la duración de la acción. Si el servidor de desarrollo está abierto, reinicialo.

Los efectos (explosión, chispa de impacto, polvo, onda de KO, teletransporte, tajo del hacha y curación)
se generan por código en `infrastructure/graphics/FxTextureFactory.js`, junto con los iconos de los objetos.

## Arte

- `art/source/`: **los sprites del juego**, sin fondo (transparentes). Vite los importa directamente:
  no hay copias en `public/`. La pose base de cada personaje es `art/source/axem-ranger-<ranger>.png`.
- Esos PNG miden 2617×4096 pero son pixel art de 53×83 ampliado. Al cargar, el juego toma un píxel por
  celda de esa cuadrícula (`nativeSize` en `characterAnimationData.js`) y los dibuja 1:1, con la misma
  densidad de píxeles que el escenario.
- El escenario "Ruinas de medianoche" (cielo, montañas, castillo, pinos, suelo, pilares) está
  dibujado por código en `infrastructure/graphics/StageTextureFactory.js`, con paleta limitada y tramado.

## Despliegue en Vercel

1. Subir el repo a GitHub.
2. En Vercel: **Add New → Project** e importar `Axem-FighterX`.
3. Vercel detecta Vite; `vercel.json` ya fija `npm run build` y `dist`.

## CI y vista previa (GitHub Actions)

Cada push a `main` ejecuta `.github/workflows/ci.yml`:

1. Tests y build.
2. Captura automática con Playwright: mueve a ambos personajes y guarda video y screenshots en el artefacto `capturas-y-video`.
3. Publicación jugable en GitHub Pages.

Requiere **Settings → Pages → Source: GitHub Actions**. Para correr la captura en local: `npm run build && npm run preview` y, en otra terminal, `npm run capture`.
