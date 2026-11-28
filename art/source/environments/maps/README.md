# Clasificación de escenarios

Los mapas se organizan por modalidad. Agregar una imagen compatible a la carpeta correspondiente basta para incorporarla al catálogo de escenarios durante el siguiente build; no hace falta editar un manifiesto ni registrar el nombre del archivo manualmente.

- `campaign/`: mapas reservados para el modo campaña.
- `training/`: escenarios del modo combate/entrenamiento. Se descubren mediante Vite y aparecen en la selección de escenarios.
- `minigames/terrestrial/`: escenarios seleccionables de Carrera Terrestre.
- `minigames/racing/`: escenarios seleccionables de Carrera Axem.

Formatos admitidos: PNG, WebP, JPG y JPEG. El nombre del archivo se usa como nombre visible; los subdirectorios, cuando existan, se conservan para evitar colisiones entre mapas con el mismo nombre.

Los dos minijuegos de carrera enumeran sus mapas embebidos al iniciar la pantalla de selección. El build HaxeFlixel incluye recursivamente las imágenes de ambas carpetas de minijuegos.
