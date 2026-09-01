# Matriz de cumplimiento de entrega — Property Partners

**Corte:** 2026-09-01  
**Producto:** Property Partners Intelligence Platform  
**Producción:** `https://ppartnersgroup.app`  
**Baseline productivo auditado:** `532126daec82cfdad6f22038781bac27dfdc3c8e`  
**Deployment productivo auditado:** `dpl_DeEMDDjyGpNEBU2g6cdsaSBYputL` — `READY`  

## Criterio y alcance

Esta matriz contrasta la entrega contra el alcance de aceptación vigente en `docs/UAT_PROPERTY_PARTNERS.md`: **Inteligencia de Mercado, Valorización y Control de Gestión / Automatización de Reportes, con alcance de ventas de casas en Vitacura**. `CONTRATO_TRABAJO.md` se conserva como documento contractual amplio/de trabajo y contiene campos aún por completar; no se usa para inventar funcionalidades V1 que el UAT canónico excluye expresamente.

Estados:

- **PASS técnico:** la capacidad existe, sus gates determinísticos pasan y existe evidencia de producción o datos canónicos.
- **HOLD de aceptación:** la capacidad está técnicamente entregada, pero falta validación humana, definición compartida o aceptación del Cliente.
- **HOLD evidencia operativa:** existe la capacidad o configuración, pero aún falta evidencia formal suficiente para afirmar una obligación operacional contractual.
- **N/A V1:** capacidad explícitamente fuera del alcance operativo V1 vigente. No bloquea la entrega.

Un `PASS técnico` no equivale a una firma del Cliente. La aceptación contractual definitiva requiere UAT de negocio, capacitación/traspaso y registro de aceptación.

## Matriz

| Obligación / entrega | Implementación y evidencia | Estado | Pendiente real para cierre |
|---|---|---|---|
| Plataforma web productiva | Next.js/React en Vercel; producción `READY`; build de producción incluido en aceptación técnica; sin errores/fatales ni 5xx en la ventana runtime auditada del 2026-09-01 | **PASS técnico** | Ninguno técnico |
| Base PostgreSQL / Supabase | Esquema PostgreSQL/Supabase operativo; RLS y controles de alcance; datos canónicos y migraciones versionadas | **PASS técnico** | Handover operativo/documental en fase 3 |
| Autenticación y roles | Límites CEO/admin/director/subdirector/seller verificados por código/gates; producción contiene perfiles CEO, admin, director y sellers | **PASS técnico / HOLD UAT** | Ejecutar prueba autenticada por roles con participantes UAT; los secretos QA de GitHub no están configurados y no se fabrican credenciales |
| Dashboard CEO | Ruta y permisos presentes; gates de Control de Gestión y reportes pasan; deployment productivo activo | **PASS técnico / HOLD UAT** | Validación visual y de negocio por participante CEO designado |
| Dashboard Director | Ruta, alcance de oficina/equipo y reportes verificados por gates de acceso y Control de Gestión | **PASS técnico / HOLD UAT** | Validación autenticada por director designado |
| Dashboard Agente / Ejecutivo | Ruta y alcance seller verificados por gates de acceso; directorio productivo incluye sellers | **PASS técnico / HOLD UAT** | Validación autenticada por ejecutivo designado |
| Control de Gestión | Scoring canónico, persistencia, reconciliación, comparaciones, fuentes y entrega de reportes pasan gates determinísticos | **PASS técnico / HOLD definición** | Diccionario oficial de KPI pendiente para cualquier métrica que deba declararse “oficial” |
| Inteligencia de Mercado V1 | Alcance canónico: casas en venta en Vitacura; cron diario de Portal; CBRS; 19 barrios KML; contrato de importación y reconciliación verificados | **PASS técnico / HOLD UAT** | Validación de lectura/uso por usuario de negocio |
| CBRS / ventas | `market_cbrs_reference_transactions`: 17.581 registros en producción al corte; fuente entregada e integrada | **PASS técnico** | Ninguno para V1 |
| Barrios Property Partners | 19 polígonos territoriales canónicos integrados desde KML entregado | **PASS técnico** | Ninguno para V1 |
| Portal Inmobiliario V1 | Casas: refresh productivo diario; últimas ejecuciones observadas completadas con 12 aceptadas y 0 rechazadas; pipeline falla cerrado ante errores/skips | **PASS técnico** | Mantener monitoreo operativo |
| Portal — departamentos/proyectos | `market-refresh` declara expresamente departamentos y proyectos como V2 | **N/A V1** | Backlog V2; no usar como blocker de esta entrega |
| Identidad/reconciliación de propiedades | Motor de identidad validado; conflicto de barrio ya no puede quedar en `candidate_high`; contradicción de ROL rechaza match | **PASS técnico** | Ninguno técnico |
| Valorizador | Modelo determinístico, evidencia canónica, condición, flujo, comparables y guardrails pasan; 25/25 tests de regresión; mínimo 3 comparables humanos | **PASS técnico / HOLD UAT** | Producción tiene 10 casos: 2 `draft`, 8 `review`, 0 `issued`; falta ejecutar/aceptar un ciclo real hasta emisión con usuarios autorizados |
| Revisión / aprobación de valorización | Transiciones atómicas, review por alcance, aprobación sólo CEO, snapshots emitidos inmutables y trazables verificados | **PASS técnico / HOLD UAT** | No emitir un caso real sólo para satisfacer QA; usar caso autorizado durante UAT |
| Reportes inteligentes / ejecutivos | Reporte canónico PDF, preview, generación, programación y delivery pasan verificadores técnicos | **PASS técnico / HOLD definición** | Cliente debe aprobar calendario, destinatarios, frecuencia y formato/canal final |
| Automatizaciones de reportes | Rutas y reglas de programación/entrega protegidas, cron disponible, validación de destinatarios y períodos cerrados | **PASS técnico / HOLD definición** | `reporting-approval` pendiente |
| Seguridad RLS / autorización | Límites de credenciales, IP, exposición y tenant; políticas productivas de revisión de barrio limitan SELECT a admin/CEO y UPDATE a admin/CEO + AAL2; service role separado | **PASS técnico condicionado a cierre CI** | Confirmar el rerun final del gate de aislamiento después de registrar la revisión histórica |
| Sanitización de errores API | Dos respuestas crudas detectadas durante closeout fueron corregidas en la rama de entrega; errores quedan sólo en logs de servidor | **PASS corrección / pendiente merge** | Mergear sólo con gates verdes |
| MFA / AAL2 | AAL2 está aplicado en operaciones sensibles verificadas, incluida revisión de barrio y aprobación protegida | **PASS parcial / HOLD evidencia** | Documentar en handover qué acciones exigen MFA y verificar la experiencia autenticada durante UAT |
| Trazabilidad de negocio | `management_change_log` 16, `valuation_decision_log` 53 y `report_directory_audit_log` 1 al corte; tests de trazabilidad 10/10 | **PASS técnico** | Ninguno técnico |
| Auditoría genérica de accesos | Existe tabla `audit_logs`, pero estaba en 0 registros al corte auditado | **HOLD evidencia operativa** | No afirmar auditoría completa de accesos hasta documentar mecanismo y evidencia de eventos reales |
| Disponibilidad 99,5% | Producción actual `READY` y sin errores críticos en la ventana auditada | **HOLD evidencia operativa** | Un snapshot puntual no prueba SLA histórico; incorporar reporte/medición contractual si se exige acreditar el 99,5% |
| Backups diarios / retención | Supabase es la base operacional, pero este closeout no ha obtenido evidencia directa suficiente de política efectiva de backup/retención | **HOLD evidencia operativa** | Documentar plan/configuración real y recuperación en handover; no afirmar 30 días sin evidencia |
| Soporte / continuidad | Producción `READY`, rollback documentado, sin errores/fatales observados en ventana auditada | **PASS técnico / HOLD operación** | Formalizar contactos, severidades y escalamiento en handover |
| Documentación técnica | Arquitectura, UAT, operación, seguridad, rollback y delivery manifest ya existen | **PASS parcial** | Consolidar manual ejecutivo + manual administrador en fase 3 |
| Capacitación inicial | Plan de capacitación y handover existe | **HOLD cliente** | Participantes/fecha, sesiones y evidencia de asistencia en fase 4 |
| Aceptación final | Plan y estados UAT existen | **HOLD cliente** | Participantes UAT, ejecución humana de casos compartidos y acta/registro de aceptación |
| Titularidad/costos de terceros | Dependencia identificada y documentada | **HOLD compartido** | Definir titularidad final de Vercel/Supabase/Resend y receptor técnico autorizado |

## Fuentes y evidencia de cierre

- `docs/UAT_PROPERTY_PARTNERS.md` — alcance canónico de aceptación V1.
- `CONTRATO_TRABAJO.md` — marco contractual amplio/de trabajo; contiene campos pendientes y no sustituye el alcance UAT aprobado.
- `docs/canonical/UAT_ACCEPTANCE_PLAN.md`
- `docs/canonical/DELIVERY_PACKAGE_MANIFEST.md`
- `docs/canonical/TRAINING_AND_HANDOVER_PLAN.md`
- `config/client-dependencies-status.json`
- `config/uat-case-status.json`
- `config/contract-closeout-status.json`
- GitHub Actions `Delivery closeout QA` — aceptación técnica del 2026-09-01.
- Vercel deployment `dpl_DeEMDDjyGpNEBU2g6cdsaSBYputL`.
- Supabase producción `orfncinmhymhhoxbxgjb`.

## Veredicto de entrega al corte

**Producto: técnicamente entregable.**  
**Aceptación contractual final: HOLD.**

Los pendientes no justifican ampliar el producto. Se concentran en:

1. UAT autenticado de negocio y ciclo final de Valorizador hasta `issued` con autorización real.
2. Definiciones compartidas: KPI oficiales y reporting.
3. Evidencia operacional que deba formar parte del handover: backups, SLA, MFA y soporte.
4. Manuales / handover.
5. Capacitación y aceptación del Cliente.

Cualquier funcionalidad nueva fuera de estos frentes debe tratarse como post-entrega/V2 salvo defecto crítico de producción.
