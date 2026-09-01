# Matriz de cumplimiento de entrega — Property Partners

**Corte:** 2026-09-01  
**Producto:** Property Partners Intelligence Platform  
**Producción:** `https://ppartnersgroup.app`  
**Baseline productivo auditado:** `532126daec82cfdad6f22038781bac27dfdc3c8e`  
**Deployment productivo auditado:** `dpl_DeEMDDjyGpNEBU2g6cdsaSBYputL` — `READY`  

## Criterio

Esta matriz distingue tres estados:

- **PASS técnico:** la capacidad existe, sus gates determinísticos pasan y existe evidencia de producción o de datos canónicos.
- **HOLD de aceptación:** la capacidad está técnicamente entregada, pero falta una validación humana, definición o aceptación que corresponde al Cliente o a una decisión compartida.
- **N/A V1:** capacidad explícitamente fuera del alcance contractual operativo V1 vigente. No bloquea la entrega.

La aceptación contractual definitiva requiere además UAT de negocio, capacitación/trapaso y registro de aceptación. Un `PASS técnico` no se presenta como firma del Cliente.

## Matriz

| Obligación / entrega | Implementación y evidencia | Estado | Pendiente real para cierre |
|---|---|---|---|
| Plataforma web productiva | Next.js/React en Vercel; producción `READY`; build de producción incluido en aceptación técnica; sin errores/fatales ni 5xx en la ventana runtime auditada del 2026-09-01 | **PASS técnico** | Ninguno técnico |
| Base PostgreSQL / Supabase | Esquema PostgreSQL/Supabase operativo; RLS y controles de alcance; datos canónicos y migraciones versionadas | **PASS técnico** | Handover operativo/documental en fase 3 |
| Autenticación y roles | Límites CEO/admin/director/subdirector/seller verificados por `access:verify`; producción contiene perfiles CEO, admin, director y sellers | **PASS técnico / HOLD UAT** | Ejecutar prueba autenticada por roles con participantes UAT; los secretos QA de GitHub no están configurados y no se fabrican credenciales |
| Dashboard CEO | Ruta y permisos presentes; gates de Control de Gestión y reportes pasan; deployment productivo activo | **PASS técnico / HOLD UAT** | Validación visual y de negocio por participante CEO designado |
| Dashboard Director | Ruta, alcance de oficina/equipo y reportes verificados por gates de acceso y Control de Gestión | **PASS técnico / HOLD UAT** | Validación autenticada por director designado |
| Dashboard Agente / Ejecutivo | Ruta y alcance seller verificados por gates de acceso; directorio productivo incluye sellers | **PASS técnico / HOLD UAT** | Validación autenticada por ejecutivo designado |
| Control de Gestión | Scoring canónico, persistencia, reconciliación, comparaciones, fuentes y entrega de reportes pasan gates determinísticos | **PASS técnico** | Diccionario oficial de KPI aún pendiente para métricas que deban declararse “oficiales” |
| Inteligencia de Mercado V1 | Alcance operativo V1 explícito: casas en venta en Vitacura; cron diario de Portal; CBRS canónico; capa territorial KML; contrato de importación y reconciliación verificados | **PASS técnico / HOLD UAT** | Validación de lectura/uso por usuario de negocio |
| CBRS / ventas | `market_cbrs_reference_transactions`: 17.581 registros en producción al corte; fuente entregada e integrada | **PASS técnico** | Ninguno para V1 |
| Barrios Property Partners | 19 polígonos territoriales canónicos integrados desde KML entregado | **PASS técnico** | Ninguno para V1 |
| Portal Inmobiliario V1 | Casas: refresh productivo diario; últimas ejecuciones observadas completadas con 12 aceptadas y 0 rechazadas; pipeline falla cerrado ante errores/skips | **PASS técnico** | Mantener monitoreo operativo |
| Portal — departamentos/proyectos | Código conserva datasets históricos/referencia, pero `market-refresh` declara expresamente departamentos y proyectos como V2 | **N/A V1** | Backlog V2; no usar como blocker de esta entrega |
| Identidad/reconciliación de propiedades | Motor de identidad validado; conflicto de barrio ya no puede quedar en `candidate_high`; contradicción de ROL rechaza match | **PASS técnico** | Ninguno técnico |
| Valorizador | Modelo determinístico, evidencia canónica, condición, flujo, comparables y guardrails pasan; 25/25 tests de regresión pasan; exige mínimo 3 comparables humanos | **PASS técnico / HOLD UAT** | Producción tiene 10 casos (2 draft, 8 review) y 0 `issued`; falta ejecutar/aceptar un ciclo real hasta emisión con usuarios autorizados |
| Revisión / aprobación de valorización | Transiciones atómicas, review por alcance, aprobación sólo CEO, snapshots emitidos inmutables y trazables verificados | **PASS técnico / HOLD UAT** | No emitir un caso real sólo para satisfacer QA; usar caso autorizado durante UAT |
| Reportes inteligentes / ejecutivos | Reporte canónico PDF, preview, generación, programación y delivery pasan verificadores técnicos | **PASS técnico / HOLD definición** | Cliente debe aprobar calendario, destinatarios, frecuencia y formato/canal final |
| Automatizaciones de reportes | Rutas y reglas de programación/entrega protegidas, cron disponible, validación de destinatarios y períodos cerrados | **PASS técnico / HOLD definición** | `reporting-approval` pendiente |
| Seguridad de aplicación | RLS, límites de credenciales/IP/tenant, MFA route, autorización por capacidades y hardening de APIs forman parte de gates | **PASS técnico condicionado a gate final** | Cerrar dos respuestas de error crudas detectadas por QA de entrega y confirmar gate verde |
| Trazabilidad y documentos | Tests de evidencia documental y 10/10 tests de trazabilidad pasan; 27 documentos contractuales clasificados por el gate de closeout | **PASS técnico** | Incorporar manuales definitivos en fase 3 |
| Soporte / continuidad | Producción `READY`, rollback documentado, sin errores/fatales observados en ventana auditada | **PASS técnico** | Formalizar contactos/escalamiento y operación en handover |
| Documentación técnica completa | Existe paquete canónico de arquitectura, UAT, operación, seguridad, rollback y delivery manifest | **PASS parcial** | Consolidar manual ejecutivo + manual administrador en fase 3 |
| Capacitación inicial | Plan de capacitación y handover existe | **HOLD cliente** | Participantes/fecha, sesiones y evidencia de asistencia en fase 4 |
| Aceptación final | Plan y estados UAT existen | **HOLD cliente** | Participantes UAT, ejecución humana de casos compartidos y acta/registro de aceptación |
| Titularidad/costos de terceros | Dependencia identificada y documentada | **HOLD compartido** | Definir titularidad final de Vercel/Supabase/Resend y receptor técnico autorizado |

## Fuentes y evidencia de cierre

- `CONTRATO_TRABAJO.md`
- `docs/canonical/UAT_ACCEPTANCE_PLAN.md`
- `docs/canonical/DELIVERY_PACKAGE_MANIFEST.md`
- `docs/canonical/TRAINING_AND_HANDOVER_PLAN.md`
- `config/client-dependencies-status.json`
- `config/uat-case-status.json`
- `config/contract-closeout-status.json`
- GitHub Actions `Delivery closeout QA` — aceptación técnica del 2026-09-01
- Vercel deployment `dpl_DeEMDDjyGpNEBU2g6cdsaSBYputL`
- Supabase producción `orfncinmhymhhoxbxgjb`

## Veredicto de entrega al corte

**Producto: técnicamente entregable.**  
**Aceptación contractual final: HOLD.**

Los blockers que quedan no justifican ampliar el producto. Se concentran en:

1. UAT autenticado de negocio y ciclo final de Valorizador hasta `issued` con autorización real.
2. Definiciones compartidas aún pendientes: KPI oficiales y reporting.
3. Manuales / handover.
4. Capacitación y aceptación del Cliente.

Cualquier funcionalidad nueva fuera de esos cuatro frentes debe tratarse como post-entrega/V2 salvo defecto crítico de producción.
