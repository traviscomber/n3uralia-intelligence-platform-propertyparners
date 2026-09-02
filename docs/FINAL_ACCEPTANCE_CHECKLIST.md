# Checklist final de aceptación contractual

Última actualización: 2 de septiembre de 2026

## Criterio de estado

- **PASS técnico:** implementación disponible y evidencia reproducible mediante código, SQL, RLS, verificadores, QA autenticado o build/deployment.
- **Pendiente UAT cliente:** requiere ejecución y aceptación por usuarios autorizados de Property Partners.
- **Dependencia cliente:** requiere fuente, definición, aprobación, destinatario o criterio formal del Cliente.
- **No disponible en fuente:** la plataforma debe mostrar `n/d`, `—` o estado equivalente y no inferir el dato.

Baseline productivo verificado: `067870537c3e8b897f2f07359dd45b9776ea8095` en `https://ppartnersgroup.app`.

Gate confirmado el 2 de septiembre de 2026:

- `Contractual modules CI`: PASS;
- `Authenticated role QA`: PASS;
- `Authenticated visual QA`: PASS;
- `N3uralia IP Boundaries`: PASS;
- Vercel producción: `READY`;
- errores runtime observados en las últimas 24 horas: 0.

La aceptación técnica automatizada no sustituye el UAT de negocio definido en `docs/UAT_PROPERTY_PARTNERS.md`.

## 1. Plataforma y seguridad

| Requisito | Estado | Evidencia |
|---|---|---|
| Autenticación y perfil válido | PASS técnico | guards, post-login por rol, alcance centralizado y role QA verde |
| Alcance CEO global | PASS técnico | capacidades, rutas protegidas y RLS |
| Alcance dirección por oficina | PASS técnico | RLS y pruebas negativas entre oficinas |
| Alcance Partner personal | PASS técnico | alcance personal y RLS |
| Protección de APIs críticas | PASS técnico | guards de servidor y autorización en RPC críticas |
| MFA para aprobación/emisión de valorizaciones | PASS técnico | `/auth/mfa`, AAL2 y guard de operación crítica |
| Recorrido autenticado automatizado de perfiles | PASS técnico | `Authenticated role QA` + `Authenticated visual QA` |
| Aceptación humana de los recorridos por perfil | Pendiente UAT cliente | casos UAT por rol y pilar |
| Protección de contraseñas filtradas de Supabase Auth | Pendiente administración | requiere confirmación/activación en configuración Auth si aún no está aplicada |

## 2. Pilar I — Inteligencia de Mercado

| Requisito | Estado | Evidencia |
|---|---|---|
| Ingestión canónica con raw records | PASS técnico | `market_ingestion_runs`, `market_raw_records` y RPC de ingestión |
| Normalización y validación | PASS técnico | normalizadores de Portal, CBRS y agregados |
| Deduplicación de propiedades/publicaciones/transacciones | PASS técnico | claves, constraints y verificadores |
| Historial de publicaciones | PASS técnico | versiones por `observed_at` y control de cambios |
| Persistencia de fallos | PASS técnico | ejecución `failed` fuera de la transacción revertida |
| Cuarentena de fuente fallida | PASS técnico | estado `quarantined` y error persistido |
| Estado/frescura/error visible por fuente | PASS técnico | `/dashboard/market/fuentes` |
| Publicación no presentada como venta confirmada | PASS técnico | separación listings/transactions e identidad |
| Identidad canónica auditada | PASS técnico | decisión con evidencia y trazabilidad |
| Cola de revisión live separada de duplicados históricos | PASS técnico | flujo operativo live y revisión histórica en Administración |
| CTAs “Qué requiere atención” | PASS técnico | enlaces alineados a la cola operativa correspondiente |
| Suficiencia de filtros, barrios y nomenclatura para operación diaria | Pendiente UAT cliente | UAT-MKT-01 a UAT-MKT-05 |
| Datos/fuentes adicionales no presentes en el canon | Dependencia cliente/fuente | no se inventa cobertura faltante |

## 3. Pilar II — Valorización de Propiedades

| Requisito | Estado | Evidencia |
|---|---|---|
| Expediente y propiedad sujeto | PASS técnico | caso persistido y origen trazable |
| Comparables aceptados/excluidos | PASS técnico | decisiones y evidencia por comparable |
| Ajustes con límites | PASS técnico | controles de ajuste y cálculo |
| Valor sugerido, rango y confianza | PASS técnico | cálculo determinista y validaciones |
| Mínimo de 3 comparables antes de avanzar | PASS técnico | guard de workflow en base |
| Revisión, devolución y reenvío | PASS técnico | transición atómica e historial |
| Aprobación/emisión exclusiva CEO | PASS técnico | capability + RPC + MFA/AAL2 |
| Versiones y decision log | PASS técnico | snapshots e historial inmutable |
| Reporte imprimible/PDF | PASS técnico automatizado | ruta de reporte, snapshot y verificadores |
| Caso real completo punta a punta | Pendiente UAT cliente | UAT-VAL-01 a UAT-VAL-07; no se sustituye por fixture |
| Inspección humana del PDF emitido | Pendiente UAT cliente | UAT-VAL-07 |

## 4. Pilar III — Control de Gestión Comercial

| Requisito | Estado | Evidencia |
|---|---|---|
| Vista CEO | PASS técnico | consolidado global y período |
| Vista dirección/oficina | PASS técnico | alcance de oficina |
| Vista Partner | PASS técnico | alcance personal |
| Metas y alertas | PASS técnico como infraestructura | almacenamiento, edición y evaluación |
| Acción, responsable, plazo y seguimiento | PASS técnico | tareas y control operativo |
| Informes por alcance | PASS técnico | rutas global/oficina/personal |
| Fuente y período visibles | PASS técnico | modelo de métricas y estados de datos |
| Programación fail-closed sin definiciones aprobadas | PASS técnico | scheduling protegido y runtime revalida aprobaciones |
| Captaciones brutas oficiales | No disponible en fuente / dependencia | no se sustituye por stock |
| Fórmula oficial de productividad | Dependencia cliente | no se declara definitiva sin aprobación |
| Ranking y desempates oficiales | Dependencia cliente | reglas derivadas no sustituyen definición oficial |
| Umbrales/escalamiento oficiales | Dependencia cliente | infraestructura preparada para parametrización |
| Calendario y destinatarios finales | Dependencia cliente | recurrencia permanece bloqueada hasta aprobación |

## 5. Informes y trazabilidad

| Requisito | Estado | Evidencia |
|---|---|---|
| Directorio de informes canónicos | PASS técnico | `/dashboard/reportes/canonicos` |
| Generación/entrega operativa | PASS técnico | `/dashboard/reportes/operacion` |
| Acción de generación sin ruta rota | PASS técnico | CTA canónico enlazado al centro operativo |
| Exclusión de fixtures/pruebas de vista cliente | PASS técnico | tags `reportin-test`, `qa`, `mock`, `demo`, `fixture` filtrados |
| Modelo/prompt/costo/fuentes visibles cuando existen | PASS técnico | trazabilidad desde metadata canónica; ausencia se muestra `—` |
| PDF vinculado sólo cuando existe artefacto real | PASS técnico | disponibilidad calculada desde artefacto persistido |
| Generador IA heredado no auditado | Retirado | `/api/reports/generate` devuelve `409 retired` |
| Distribución recurrente definitiva | Dependencia cliente/configuración | requiere calendario, audiencia y destinatarios aprobados |

## 6. QA y release reproducible

La aceptación técnica combina verificadores versionados y evidencia del release. Para el baseline actual quedaron verdes:

1. CI de módulos contractuales;
2. QA autenticado por roles;
3. QA visual autenticado;
4. límites de propiedad intelectual N3uralia;
5. deployment productivo `READY`;
6. runtime scan sin errores observados en la ventana revisada.

Si se modifica código después del UAT, este gate debe repetirse antes de congelar el release final.

## 7. Pendientes UAT

Plan ejecutable: `docs/UAT_PROPERTY_PARTNERS.md`.

Pendiente de aceptación humana:

- Mercado: inventario, casas en venta de Vitacura, barrios/KML, oferta vs ventas y estados sin datos/frescura;
- Valorización: caso real, 3 comparables, devolución, corrección, reenvío, aprobación CEO con MFA, emisión e inspección PDF;
- Gestión: vistas por rol, métricas/procedencia, reporte manual y bloqueo correcto de recurrencia mientras falten definiciones;
- distribución controlada sólo cuando existan destinatarios aprobados.

Salida aceptable: P0 = 0, P1 = 0; P2/P3 corregidos, aceptados o programados sin bloquear el flujo contractual.

## 8. Dependencias exclusivas del Cliente

- fuentes/datasets adicionales que Property Partners determine como oficiales;
- definición de captaciones;
- fórmula oficial de productividad;
- ranking, desempates y umbrales;
- metas oficiales faltantes;
- calendario, audiencias y destinatarios de informes;
- representantes y aprobación funcional de UAT;
- políticas adicionales de retención, privacidad o integración cuando correspondan.

Ninguna de estas dependencias autoriza datos ficticios, reglas inventadas o inferencias presentadas como hechos.

## 9. Estado de listo para entrega técnica

A fecha 2 de septiembre de 2026, la parte bajo control técnico de N3uralia cumple el gate de release verificado sobre `067870537c3e8b897f2f07359dd45b9776ea8095`.

Esto significa **PASS técnico / READY para UAT**, no aceptación contractual final.

La entrega contractual definitiva requiere:

1. ejecutar los casos READY de UAT con usuarios autorizados;
2. cerrar cualquier P0/P1 encontrado y repetir gate si hubo cambios;
3. registrar observaciones P2/P3;
4. ejecutar capacitación;
5. consolidar acta/minuta de aceptación y baseline final;
6. mantener separadas las dependencias externas que continúen fail-closed.
