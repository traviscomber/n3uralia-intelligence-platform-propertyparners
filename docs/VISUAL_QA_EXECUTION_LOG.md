# Registro de ejecución QA visual autenticado

Estado: preparado, ejecución bloqueada por secretos no configurables desde el conector disponible.

Este archivo registra evidencia visual real. No debe marcarse un caso como aprobado sin sesión autenticada, viewport indicado y evidencia adjunta.

## Datos de ejecución

- Fecha de preparación: 30 de julio de 2026
- Ejecutor técnico: automatización GitHub Actions `Authenticated visual QA`
- Deployment objetivo: `https://n3uralia-intelligence-platform.vercel.app`
- Navegador previsto: Chromium provisto por Puppeteer
- Sistema operativo previsto: Ubuntu GitHub-hosted runner
- Estado de secretos: pendiente de configuración manual en GitHub Actions
- Evidencia preflight: `artifacts/visual-qa/preflight.json`, generada incluso cuando faltan secretos

## Bloqueo actual

El conector GitHub disponible permite leer y modificar archivos, revisar runs y descargar artefactos, pero no expone funciones para crear Actions Secrets ni despachar manualmente un workflow. Por esta razón:

- no se almacenaron credenciales en el repositorio;
- no se intentó simular una corrida autenticada;
- no se marcaron capturas, PDF o recorridos como aprobados;
- el workflow ahora produce un artefacto de preflight sin valores secretos y falla de forma explícita cuando falta alguna variable.

## Secretos requeridos

- `QA_CEO_EMAIL`
- `QA_CEO_PASSWORD`
- `QA_DIRECTOR_EMAIL`
- `QA_DIRECTOR_PASSWORD`
- `QA_LO_BELTRAN_EMAIL`
- `QA_LO_BELTRAN_PASSWORD`
- `QA_NUEVA_COSTANERA_EMAIL`
- `QA_NUEVA_COSTANERA_PASSWORD`
- `QA_SANTA_MARIA_EMAIL`
- `QA_SANTA_MARIA_PASSWORD`

## Matriz por perfil

| Perfil | Cuenta QA | Login | Ruta inicial | Aislamiento | Resultado | Evidencia |
|---|---|---:|---:|---:|---|---|
| CEO | Cuenta QA autorizada | Pendiente | Pendiente | Pendiente | No ejecutado | — |
| Dirección Lo Beltrán | director.lo.beltran.qa@n3uralia.com | Pendiente | Pendiente | Pendiente | No ejecutado | — |
| Ejecutiva Lo Beltrán | francisca.rossetti@ppartnersgroup.com | Pendiente | Pendiente | Pendiente | No ejecutado | — |
| Ejecutiva Nueva Costanera | alejandra.montt@ppartnersgroup.com | Pendiente | Pendiente | Pendiente | No ejecutado | — |
| Ejecutiva Santa María | alejandra.cambiaso@ppartnersgroup.com | Pendiente | Pendiente | Pendiente | No ejecutado | — |

## Viewports

| Superficie | 390×844 | 820×1180 | 1440×1000 | Resultado | Evidencia |
|---|---:|---:|---:|---|---|
| Dashboard personal | Pendiente | Pendiente | Pendiente | No ejecutado | — |
| Dashboard dirección | Pendiente | Pendiente | Pendiente | No ejecutado | — |
| Centro CEO | Pendiente | Pendiente | Pendiente | No ejecutado | — |
| Administración de propiedades | Pendiente | Pendiente | Pendiente | No ejecutado | — |
| Expediente de valorización | Pendiente | Pendiente | Pendiente | No ejecutado | — |
| Reporte imprimible | Pendiente | Pendiente | Pendiente | No ejecutado | — |

## Accesibilidad

| Prueba | Resultado | Evidencia / incidencia |
|---|---|---|
| Recorrido completo con teclado | No ejecutado | — |
| Orden de foco lógico | No ejecutado | — |
| Foco visible | No ejecutado | — |
| Nombres accesibles | No ejecutado | — |
| Lectura con lector de pantalla | No ejecutado | — |
| Contraste medido | No ejecutado | — |
| Zoom 200% | No ejecutado | — |

## PDF e impresión

| Reporte | Vista previa | Paginación | Tablas | Sin controles UI | Archivo adjunto |
|---|---:|---:|---:|---:|---|
| Valorización | Pendiente | Pendiente | Pendiente | Pendiente | — |
| Dirección | Pendiente | Pendiente | Pendiente | Pendiente | — |
| CEO | Pendiente | Pendiente | Pendiente | Pendiente | — |

## Ciclos funcionales visuales

1. Ejecutiva: propiedad asignada → valorización → comparable → revisión.
2. Dirección: revisión → devolución con motivo → tarea de corrección.
3. Ejecutiva: corrección → reenvío.
4. Dirección: aprobación → emisión → reporte.
5. CEO: oficina → responsable → expediente → reporte.

Cada ciclo permanece `No ejecutado` hasta completar el recorrido en navegador autenticado.

## Incidencias

| ID | Severidad | Perfil | Ruta | Descripción | Evidencia | Estado |
|---|---|---|---|---|---|---|
| QA-BLOCK-001 | Externa | Todos | GitHub Actions | Faltan configurar Secrets y disparar manualmente el workflow; el conector actual no expone esas operaciones | `preflight.json` cuando se ejecute | Abierta |

## Criterio de cierre

La aceptación visual sólo puede declararse cuando no existan incidencias críticas o altas abiertas, cada perfil complete su recorrido autorizado, los viewports estén revisados, el teclado y el lector de pantalla estén validados y los PDF hayan sido inspeccionados desde una sesión autenticada.
