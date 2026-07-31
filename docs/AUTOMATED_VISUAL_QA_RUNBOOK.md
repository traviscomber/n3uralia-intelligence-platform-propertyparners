# Ejecución automatizada de QA visual autenticado

Estado: preparada, no ejecutada desde este entorno.

## Objetivo

Capturar evidencia reproducible por perfil y viewport sin almacenar credenciales, cookies ni sesiones en el repositorio.

## Variables requeridas

Cada perfil usa correo y contraseña independientes:

- `QA_CEO_EMAIL` y `QA_CEO_PASSWORD`
- `QA_DIRECTOR_EMAIL` y `QA_DIRECTOR_PASSWORD`
- `QA_LO_BELTRAN_EMAIL` y `QA_LO_BELTRAN_PASSWORD`
- `QA_NUEVA_COSTANERA_EMAIL` y `QA_NUEVA_COSTANERA_PASSWORD`
- `QA_SANTA_MARIA_EMAIL` y `QA_SANTA_MARIA_PASSWORD`

Para una ejecución parcial basta configurar uno o más pares completos. `QA_PASSWORD` puede usarse como contraseña compartida sólo en entornos locales controlados.

Variables opcionales:

- `QA_BASE_URL`, por defecto producción.
- `QA_OUTPUT_DIR`, por defecto `artifacts/visual-qa`.

## Ejecución local

```bash
pnpm qa:visual
```

Las credenciales deben inyectarse mediante secretos del entorno. No deben escribirse en archivos versionados, logs ni argumentos visibles del proceso.

## Ejecución en GitHub Actions

Workflow:

`.github/workflows/authenticated-visual-qa.yml`

1. Crear los diez secretos QA en la configuración del repositorio.
2. Abrir Actions → Authenticated visual QA → Run workflow.
3. Mantener la URL productiva predeterminada o indicar un deployment de preview.
4. Descargar el artefacto `authenticated-visual-qa-<run_id>`.
5. Revisar `manifest.json`, capturas y PDF antes de completar el registro formal.

El workflow:

- valida que todos los secretos estén presentes;
- instala con `pnpm install --frozen-lockfile`;
- ejecuta `pnpm qa:visual`;
- conserva artefactos durante 14 días;
- intenta publicar evidencia incluso cuando una comprobación falla.

## Evidencia producida

Por perfil:

- captura desktop 1440×1000;
- captura tablet 820×1180;
- captura móvil 390×844;
- observación de una secuencia de foco de doce pasos con `Tab`;
- PDF del primer reporte accesible, cuando existe un enlace visible;
- señales estructurales: título, `h1`, `main`, controles sin nombre y overflow horizontal;
- errores de consola y de página detectados durante el recorrido.

Salida general:

- `manifest.json` con fecha, URL, perfiles, comprobaciones, fallos y elementos que requieren revisión.

Estados automáticos:

- `captured` o `clean`: evidencia sin señales automáticas adversas;
- `review`: requiere inspección humana;
- `failed`: la comprobación no pudo completarse;
- `not-available-on-start-page`: el recurso no estaba enlazado desde la vista inicial.

## Límites

La automatización no reemplaza:

- revisión humana del diseño;
- lector de pantalla real;
- medición manual de contraste contextual;
- validación del significado de cifras;
- aceptación de negocio;
- confirmación de que el PDF conserva correctamente toda la composición visual.

Los resultados sólo deben marcarse como ejecutados después de revisar los archivos generados y completar `docs/VISUAL_QA_EXECUTION_LOG.md`.
