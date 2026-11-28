# Estándar de pickups

Todos los iconos de `art/source/pickups/` deben cumplir esta regla:

## Archivo fuente

- **Lienzo:** 128 × 128 px.
- **Formato:** PNG RGBA de 8 bits (4 canales).
- **Fondo:** transparencia alfa real; no se aceptan fondos planos.
- **Área máxima del dibujo:** 112 × 112 px.
- **Margen:** mínimo 8 px completamente transparentes en los cuatro lados.
- **Alineación:** centrado horizontal y verticalmente.
- **Proporción:** mantener la silueta original; nunca estirar el ancho y el alto por separado.
- **Escalado:** nearest-neighbor para preservar los píxeles.

El normalizador delimita el arte con alfa igual o superior a 16. Los píxeles aislados o casi transparentes fuera de esa región no se arrastran al lienzo final. El script no intenta borrar fondos opacos: exige que el PNG ya tenga transparencia para evitar eliminar partes del objeto.

## Visualización en combate

El arte visible tiene un tamaño máximo de **32 × 32 px** en el juego. Se calcula la escala usando el área máxima del dibujo (112 px), no el lienzo de 128 px. Así, el margen transparente no hace que un pickup parezca más pequeño. Se conserva la proporción y Phaser usa filtrado NEAREST.

## Incorporar un pickup nuevo

1. Colocar el PNG con un nombre descriptivo en esta carpeta.
2. Ejecutar `npm run standardize:pickups`.
3. Ejecutar `npm run validate:pickups` para verificar dimensiones, alfa, margen y centrado.
4. El manifiesto y la precarga incorporan automáticamente todos los archivos `*.png`; no hace falta registrarlos manualmente.

La normalización también se ejecuta antes de las pruebas y de la compilación. La prueba de `pickupAssetManifest` valida todos los PNG de esta carpeta, incluidos los que se agreguen en el futuro.
