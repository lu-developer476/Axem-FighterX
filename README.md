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
│   ├── entities/        Fighter (estados, vida, hitboxes), Match (golpes, KO, curación)
│   ├── geometry/        Utilidades de colisión
│   └── rangers/         Catálogo de personajes (stats) y fábrica
├── application/         Casos de uso y puertos
│   ├── ports/           InputPort (contrato de entrada)
│   └── useCases/        CreateMatch, UpdateMatch
├── infrastructure/      Adaptadores a tecnologías concretas
│   ├── input/           PhaserKeyboardInput (implementa InputPort)
│   ├── assets/          Manifiesto de sprites y datos de animación por personaje
│   └── graphics/        Escenario y efectos pixel art generados por código
├── presentation/        Todo lo que dibuja
│   ├── animation/       Animador (hoja de sprites o pose por código), registro de animaciones
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
- **Corazón de curación:** aparece cada tanto en el escenario y cura 25 de vida.

## Animaciones por datos

Cada personaje declara sus estados en `src/infrastructure/assets/characterAnimationData.js`:
`idle`, `walk`, `attack`, `hurt`, `teleport` y `ko`.

Mientras no haya hojas de sprites, el juego usa la pose actual con animaciones por código
(respiración, inclinación al caminar, hachazo, destello al recibir daño, desvanecimiento al teletransportarse, caída en KO).

**Para sumar sprites reales:**

1. Subí una tira horizontal por estado a `public/assets/sprites/rangers/<ranger>/<estado>.png`,
   por ejemplo `public/assets/sprites/rangers/violet/walk.png`.
   Todos los cuadros del mismo tamaño, en una sola fila, con los pies tocando el borde inferior
   y el personaje mirando hacia la derecha.
2. En `characterAnimationData.js`, ajustá `frames` a la cantidad real de cuadros de esa tira
   (y `frameRate` en `idle` y `walk`).
3. Listo: el archivo se detecta al compilar. Las animaciones de ataque, golpe, teletransporte y KO
   se ajustan solas a la duración de la acción. Si el servidor de desarrollo está abierto, reinicialo.

Los efectos (explosión, chispa de impacto, polvo, onda de KO, teletransporte, tajo del hacha y curación)
se generan por código en `infrastructure/graphics/FxTextureFactory.js`.

## Arte

- `art/source/`: PNG originales con fondo, sin modificar.
- `public/assets/sprites/rangers/`: sprites con fondo transparente que usa el juego.
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


