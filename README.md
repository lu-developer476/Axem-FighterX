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

Controles: **J1** WASD (Axem Violet) · **J2** flechas (Axem Orange).

## Arquitectura

Clean Architecture con la regla de dependencia apuntando hacia adentro:
`presentation → infrastructure → application → domain`.

```
src/
├── domain/            Reglas puras. Sin Phaser ni DOM.
│   ├── entities/      Fighter (posición, orientación, levitación)
│   └── rangers/       Catálogo de personajes y fábrica
├── application/       Casos de uso y puertos
│   ├── ports/         InputPort (contrato de entrada)
│   └── useCases/      UpdateFighter
├── infrastructure/    Adaptadores a tecnologías concretas
│   ├── input/         PhaserKeyboardInput (implementa InputPort)
│   └── assets/        Manifiesto de sprites
├── presentation/      Todo lo que dibuja
│   ├── scenes/        PreloadScene, FightScene
│   └── views/         FighterView (sprite + sombra)
├── config/            Resolución y configuración de Phaser
└── main.js            Composición: arma el juego
```

Para agregar un personaje: sumarlo a `rangerCatalog.js`, registrar su PNG en
`assetManifest.js` y colocar el archivo en `public/assets/sprites/rangers/`.
Para cambiar el control (gamepad, táctil), basta con otro adaptador que implemente `InputPort`.

## Arte

- `art/source/`: PNG originales, sin modificar.
- `public/assets/sprites/rangers/`: versiones con fondo transparente que usa el juego.

## Despliegue en Vercel

1. Subir el repo a GitHub.
2. En Vercel: **Add New → Project** e importar `Axem-FighterX`.
3. Vercel detecta Vite; `vercel.json` ya fija `npm run build` y `dist`.


