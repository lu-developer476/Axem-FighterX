# Clasificación de escenarios

Los mapas se organizan por modalidad. Agregar una imagen compatible a la carpeta correspondiente basta para incorporarla al catálogo durante el siguiente build; no hace falta editar un manifiesto ni registrar el nombre del archivo manualmente.

- `combat/`: mapas jugables del modo combate. Aparecen automáticamente en el selector de escenarios.
- `training/`: escenarios de entrenamiento, también disponibles en la selección de escenarios del modo combate.
- `minigames/terrestrial/`: escenarios seleccionables de Carrera Terrestre.
- `minigames/racing/`: escenarios seleccionables de Carrera Axem.

Formatos admitidos: PNG, WebP, JPG y JPEG. El nombre del archivo se usa como nombre visible; los subdirectorios, cuando existan, se conservan para evitar colisiones entre mapas con el mismo nombre.

Vite descubre automáticamente los mapas de combate y entrenamiento. Los minijuegos enumeran sus mapas embebidos al iniciar la pantalla de selección; HaxeFlixel incluye recursivamente las imágenes de ambas carpetas.
