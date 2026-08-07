# Checklist final de aceptación contractual

Última actualización: 6 de agosto de 2026

## Criterio de estado

- **Verificado técnico:** implementación disponible y evidencia reproducible mediante código, SQL, RLS, verificadores o build.
- **Pendiente visual/UAT:** requiere sesión autenticada y revisión humana en navegador real.
- **Dependencia cliente:** requiere fuente, definición, aprobación, destinatario o criterio formal del Cliente.
- **No disponible en fuente:** la plataforma debe mostrar `n/d`, `—` o estado equivalente y no inferir el dato.

La aceptación técnica se ejecuta con `pnpm qa:technical`. El recorrido visual permanece separado mediante los procedimientos de QA autenticado.

## 1. Plataforma y seguridad

| Requisito | Estado | Evidencia |
|---|---|---|
| Autenticación y perfil válido | Verificado técnico | guards, post-login por rol y alcance centralizado |
| Alcance CEO global | Verificado técnico | capacidades, rutas protegidas y RLS |
| Alcance dirección por oficina | Verificado técnico | RLS y pruebas negativas entre oficinas |
| Alcance Partner personal | Verificado técnico | alcance personal y RLS |
| Protección de APIs críticas | Verificado técnico | guards de servidor y autorización en RPC críticas |
| MFA para aprobación/emisión de valorizaciones | Verificado técnico | `/auth/mfa`, AAL2 y guard de operación crítica |
| Recorrido autenticado de perfiles | Pendiente visual/UAT | requiere navegador autenticado |
| Protección de contraseñas filtradas de Supabase Auth | Pendiente administración | requiere activación en configuración Auth |

## 2. Pilar I — Inteligencia de Mercado

| Requisito | Estado | Evidencia |
|---|---|---|
| Ingestión canónica con raw records | Verificado técnico | `market_ingestion_runs`, `market_raw_records` y RPC de ingestión |
| Normalización y validación | Verificado técnico | normalizadores de Portal, CBRS y agregados |
| Deduplicación de propiedades/publicaciones/transacciones | Verificado técnico | claves y constraints; auditoría productiva sin duplicados |
| Historial de publicaciones | Verificado técnico | versiones por `observed_at` y control de cambios |
| Persistencia de fallos | Verificado técnico | ejecución `failed` fuera de la transacción revertida |
| Cuarentena de fuente fallida | Verificado técnico | estado `quarantined` y error persistido |
| Estado/frescura/error visible por fuente | Verificado técnico | `/dashboard/market/fuentes` |
| Publicación no presentada como venta confirmada | Verificado técnico | separación listings/transactions e identidad |
| Identidad canónica auditada | Verificado técnico | decisión con evidencia y trazabilidad |
| Fuente CBRS real de compraventas | Dependencia cliente/fuente | pipeline disponible; hoy no existen transacciones canónicas cargadas |
| KML/microbarrios definitivo | Dependencia cliente/fuente | no se inventa geometría final |
| Scraping Portal en Vercel | Parcial técnico | error de Chromium controlado; fuente no se declara activa si falla |

## 3. Pilar II — Valorización de Propiedades

| Requisito | Estado | Evidencia |
|---|---|---|
| Expediente y propiedad sujeto | Verificado técnico | caso persistido y origen trazable |
| Comparables aceptados/excluidos | Verificado técnico | decisiones y evidencia por comparable |
| Ajustes con límites | Verificado técnico | controles de ajuste y cálculo |
| Valor sugerido, rango y confianza | Verificado técnico | cálculo determinista y validaciones |
| Mínimo de comparables antes de avanzar | Verificado técnico | guard de workflow en base |
| Revisión, devolución y reenvío | Verificado técnico | transición atómica e historial |
| Aprobación/emisión exclusiva CEO | Verificado técnico | capability + RPC + MFA/AAL2 |
| Versiones y decision log | Verificado técnico | snapshots e historial inmutable |
| Reporte imprimible/PDF | Verificado técnico; pendiente visual | ruta de reporte y verificador; falta inspección humana final |
| Caso real completo de punta a punta | Dependencia de datos reales | no se crea fixture ni valorización ficticia |

## 4. Pilar III — Control de Gestión Comercial

| Requisito | Estado | Evidencia |
|---|---|---|
| Vista CEO | Verificado técnico | consolidado global y período |
| Vista dirección/oficina | Verificado técnico | alcance de oficina |
| Vista Partner | Verificado técnico | alcance personal |
| Metas y alertas | Verificado técnico como infraestructura | almacenamiento, edición y evaluación |
| Acción, responsable, plazo y seguimiento | Verificado técnico | tareas y control operativo |
| Informes por alcance | Verificado técnico | rutas global/oficina/personal |
| Fuente y período visibles | Verificado técnico | modelo de métricas y estados de datos |
| Captaciones brutas oficiales | No disponible en fuente | se mantiene `n/d`; no se sustituye por stock |
| Fórmula oficial de productividad | Dependencia cliente | no se declara definitiva sin aprobación |
| Ranking y desempates oficiales | Dependencia cliente | reglas derivadas no sustituyen definición oficial |
| Umbrales/escalamiento oficiales | Dependencia cliente | infraestructura preparada para parametrización |

## 5. Informes y trazabilidad

| Requisito | Estado | Evidencia |
|---|---|---|
| Directorio de informes canónicos | Verificado técnico | `/dashboard/reportes/canonicos` |
| Generación/entrega operativa | Verificado técnico | `/dashboard/reportes/operacion` |
| Acción de generación sin ruta rota | Verificado técnico | CTA canónico enlazado al centro operativo |
| Exclusión de fixtures/pruebas de vista cliente | Verificado técnico | tags `reportin-test`, `qa`, `mock`, `demo`, `fixture` filtrados |
| Modelo/prompt/costo/fuentes visibles cuando existen | Verificado técnico | trazabilidad leída desde metadata canónica; ausencia se muestra `—` |
| PDF vinculado | Parcial según documento | cobertura visible; nunca se afirma PDF si no existe artefacto |
| Generador IA heredado no auditado | Retirado | `/api/reports/generate` devuelve `409 retired` |
| Calendario y destinatarios definitivos | Dependencia cliente | requiere definición/aprobación |
| Distribución final por correo | Dependencia cliente/configuración | requiere destinatarios y configuración definitiva |

## 6. QA técnico reproducible

El comando `pnpm qa:technical` agrupa los verificadores existentes y detiene la ejecución ante el primer fallo. Debe cubrir, como mínimo:

1. acceso y cierre contractual;
2. Mercado;
3. Valorización;
4. Control de Gestión;
5. trazabilidad/documentos;
6. build de producción.

Un resultado técnico sólo se marca como aprobado cuando el comando y el deployment correspondiente terminan correctamente. No sustituye la inspección visual.

## 7. Pendientes visuales/UAT

- recorrido CEO, dirección/subdirección y Partner con sesión real;
- móvil 320–430 px;
- tableta 768–1024 px;
- escritorio 1280 px o superior;
- navegación sólo con teclado y foco;
- contraste medido;
- impresión/PDF de informes y valorizaciones;
- confirmación de estados vacíos, error, éxito y recuperación.

## 8. Dependencias exclusivas del Cliente

- dataset oficial/adicional de compraventas;
- KML/microbarrios definitivo, si corresponde;
- definición de captaciones;
- fórmula oficial de productividad;
- ranking, desempates y umbrales;
- metas oficiales faltantes;
- calendario, audiencias y destinatarios de informes;
- aprobación funcional y UAT final.

Ninguna de estas dependencias autoriza datos ficticios, reglas inventadas o inferencias presentadas como hechos.

## 9. Criterio de listo para entrega técnica

La parte bajo control de N3uralia queda lista cuando simultáneamente:

1. `pnpm qa:technical` termina sin errores;
2. el último deployment productivo está `READY`;
3. no existen errores fatales de runtime asociados al release;
4. las tablas/RPC críticas mantienen RLS y autorización verificadas;
5. los tres pilares tienen sus flujos técnicos disponibles sin mocks;
6. los informes de prueba no aparecen como canónicos del cliente;
7. todos los faltantes externos están clasificados como dependencia y no como dato disponible.

La aceptación contractual definitiva sigue requiriendo los puntos de UAT y las definiciones del Cliente indicadas arriba.
