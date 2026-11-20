# Atlas compartido de Axem Rangers X

El archivo fuente **`axem-rangers-moves-sprites.png`** mide 730 × 804 px. El origen de coordenadas es la esquina superior izquierda. No se modifica el original: el juego recorta los cuadros en memoria, elimina el fondo teal conectado a los bordes y genera dos variantes mediante cambio HSL del tono rojo.

## Secuencias activas

Las celdas se leen de izquierda a derecha, sin cambiar el orden:

| Estado | Primer cuadro (x, y) | Celda (ancho × alto) | Paso X | Cuadros | Reproducción |
|---|---:|---:|---:|---:|---|
| `idle` | (0, 0) | 34 × 52 | 34 | 7 | 6 fps, loop |
| `walk` | (0, 55) | 36 × 54 | 36 | 10 | 10 fps, loop |
| `attack` | (0, 111) | 45 × 54 | 45 | 10 | duración del ataque del dominio |

La misma tabla de coordenadas se aplica a Violet y Orange. Solo cambia el tono HSL de los píxeles rojos: violeta (273°) o naranja (22°). Se conserva la luminosidad, la saturación, la transparencia y los colores no rojos.

## Grupos auxiliares identificados

La columna izquierda continúa con grupos irregulares, no con una única tira uniforme:

| Grupo visual | Región aproximada [x, y, ancho, alto] | Cuadros visibles |
|---|---:|---:|
| 04 | [0, 165, 372, 55] | 9 |
| 05 | [0, 220, 368, 54] | 8 |
| 06 | [0, 277, 246, 54] | 5 |
| 07 | [0, 335, 246, 54] | 5 |
| 08 | [0, 395, 252, 54] | 5 |
| 09 | [0, 455, 258, 54] | 5 |
| 10 | [0, 514, 421, 55] | 11 |
| 11 | [0, 575, 402, 55] | 8 |
| 12 | [0, 630, 590, 55] | 13 |
| 13 | [0, 687, 278, 55] | 6 |
| 14 | [0, 747, 278, 55] | 6 |

Estos bloques se conservan como referencias de inspección. No se agregan a una animación de combate sin clasificar cada cuadro: algunas poses contienen accesorios o efectos y sus límites no mantienen una celda común.

## Elementos excluidos

- La zona derecha del atlas (aprox. x = 520–730) contiene siluetas de referencia, figuras aisladas, un rótulo y pequeños elementos gráficos; no se interpreta como una tira de animación.
- El rótulo ubicado aproximadamente entre y = 185 y 230 se excluye por completo.
- Los efectos o accesorios independientes no se registran como cuadros de personaje.
- Las imágenes de pose individuales y los PNG de Violet/Orange se mantienen intactos como material de referencia; no se cargan como una segunda fuente de movimientos.

Los recortes activos están declarados en `src/infrastructure/assets/sharedAxemAtlas.js`. El procesamiento de fondo y paleta está en `src/infrastructure/graphics/prepareSharedAxemTextures.js`.
