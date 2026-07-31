# Ejecución automatizada de QA visual autenticado

Estado: preparada, no ejecutada desde este entorno.

## Objetivo

Capturar evidencia reproducible por perfil y viewport sin almacenar credenciales en el repositorio.

## Variables requeridas

- `QA_PASSWORD`
- al menos una de:
  - `QA_CEO_EMAIL`
  - `QA_DIRECTOR_EMAIL`
  - `QA_LO_BELTRAN_EMAIL`
  - `QA_NUEVA_COSTANERA_EMAIL`
  - `QA_SANTA_MARIA_EMAIL`

Variables opcionales:

- `QA_BASE_URL`, por defecto producción.
- `QA_OUTPUT_DIR`, por defecto `artifacts/visual-qa`.

## Ejecución

```bash
pnpm qa:visual
```

Las credenciales deben inyectarse mediante secretos del entorno o CI. No deben escribirse en archivos versionados, logs ni argumentos visibles del proceso.

## Evidencia producida

Por perfil:

- captura desktop 1440×1000;
- captura tablet 820×1180;
- captura móvil 390×844;
- observación de foco después de navegación con Tab;
- PDF del primer reporte accesible, cuando existe un enlace visible;
- señales estructurales: título, número de `h1`, controles sin nombre y overflow horizontal.

Salida general:

- `manifest.json` con fecha, URL, comprobaciones y fallos.

## Límites

La automatización no reemplaza:

- revisión humana del diseño;
- lector de pantalla real;
- medición manual de contraste contextual;
- validación del significado de cifras;
- aceptación de negocio;
- confirmación de que el PDF conserva correctamente toda la composición visual.

Los resultados sólo deben marcarse como ejecutados después de revisar los archivos generados y completar `docs/VISUAL_QA_EXECUTION_LOG.md`.
