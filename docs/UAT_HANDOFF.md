# Handoff UAT — Property Partners · Vitacura

**Fecha:** 2026-09-22
**Entorno:** https://ppartnersgroup.app
**Versión:** `main` @ `ff3d6b21`
**Alcance:** venta de casas en Vitacura. Departamentos y arriendos quedan fuera de los criterios de aceptación.

---

## 1. Qué se entrega

Una plataforma que responde a tres preguntas de negocio, una por pilar:

| Pilar | Pregunta de negocio | Aprobador |
|---|---|---|
| **1. Inteligencia de Mercado** | ¿Qué está pasando en el mercado de casas en Vitacura? | Pedro Pablo |
| **2. Valorización** | ¿Cuánto vale esta propiedad y con qué evidencia? | Pedro Pablo (con MFA) |
| **3. Control de Gestión y Reportes** | ¿Cómo está la operación y qué le llega a cada quién? | Pedro Pablo |

Cadena de decisión: **Ejecutivo → Director → Pedro Pablo.** N3uralia ya validó software, seguridad, permisos y regresión; este UAT valida resultado de negocio.

**Estado del producto:** plataforma 100 % lista para UAT (19 checks funcionales en verde, 2 rondas). Finalización ponderada del proyecto ≈ **79 %**; si el UAT se aprueba en su totalidad, salta a ≈ 94 %. Lo que falta es mayoritariamente del lado del cliente (ver §7).

## 2. Reglas de aceptación

- Cada caso registra: ID, participante y rol, fecha/hora, resultado (`PASS` / `FAIL` / `BLOCKED_EXTERNAL`), evidencia e ID del registro afectado.
- No vale `PASS` si el caso no lo ejecutó el rol requerido. Sin cuentas compartidas.
- Severidades: **P0** corrupción/bypass/inutilizable · **P1** flujo contractual roto · **P2** degradación con workaround · **P3** detalle menor.
- **Salida aceptable:** P0 = 0, P1 = 0; P2/P3 documentados y aceptados o con corrección acordada.
- Un `BLOCKED_EXTERNAL` se vincula a una dependencia explícita del Cliente; no es defecto del producto.
- El sistema nunca inventa datos: lo faltante se muestra como N/D o estado vacío. Eso es comportamiento correcto, no un defecto.

## 3. Pilar 1 — Inteligencia de Mercado

**Validación final de Pedro Pablo:** que fuentes, lectura y conclusiones representen la realidad comercial de Property Partners.

| Caso | Rol | Se acepta cuando… |
|---|---|---|
| UAT-MKT-01 Inventario actual | CEO/Director | La fecha de corte es visible y el inventario vivo se distingue de la referencia histórica Portal. |
| UAT-MKT-02 Casas en venta en Vitacura | Director/Ejecutivo | 3 registros reales con dirección, barrio, UF, superficies y fuente trazable; lo desconocido queda N/D. |
| UAT-MKT-03 Barrios y KML | CEO/Director | 3 propiedades conocidas caen en la zona correcta; sin evidencia no hay asignación geográfica. |
| UAT-MKT-04 Oferta vs ventas CBRS | CEO/Director | La UI nunca presenta oferta como venta cerrada; CBRS queda identificado con período y unidad. |
| UAT-MKT-05 Sin datos / desactualizado | Director | El estado vacío es explícito y accionable; no se fabrican métricas. |

## 4. Pilar 2 — Valorización

**Validación final de Pedro Pablo:** revisa el expediente ya revisado por Director, aprueba con AAL2/MFA y emite el PDF final.

| Caso | Rol | Se acepta cuando… |
|---|---|---|
| UAT-VAL-01 Identificación de propiedad | Ejecutivo | La casa real de Vitacura se identifica; nada inventado; el flujo pide sólo los mínimos. |
| UAT-VAL-02 Comparables y decisión profesional | Ejecutivo | Selección humana de ≥3 comparables trazables; exclusiones con motivo; la tasa se confirma, no se adopta sola. |
| UAT-VAL-03 Guardado y envío a revisión | Ejecutivo | Expediente con ID estable e historial; el Ejecutivo no puede aprobar. |
| UAT-VAL-04 Devolución por Dirección | Director | Sólo rol autorizado devuelve, con motivo obligatorio y auditoría. |
| UAT-VAL-05 Corrección y reenvío | Ejecutivo | La versión anterior se conserva; la nueva vuelve a revisión con trazabilidad. |
| UAT-VAL-06 Aprobación CEO con MFA | CEO | Sin AAL2 se bloquea; con AAL2 y evidencia válida aprueba; queda actor, fecha y versión. |
| UAT-VAL-07 Emisión, PDF e historial | CEO | El PDF sale del snapshot emitido; datos vivos posteriores no lo alteran; historial completo. |

## 5. Pilar 3 — Control de Gestión y Automatización de Reportes

**Validación final de Pedro Pablo:** que métricas, prioridades, rankings, alertas y reportes respondan al criterio que él definió. Ninguna definición provisional se vuelve oficial sin su aprobación.

| Caso | Rol | Se acepta cuando… |
|---|---|---|
| UAT-GES-01 Visibilidad por rol | CEO/Director/Ejecutivo | Cada rol ve sólo su alcance; Admin no es rol organizacional del Cliente. |
| UAT-GES-02 Métricas y procedencia | CEO/Director | Un KPI provisional se ve provisional, nunca como definición contractual; fuente/período/unidad trazables. |
| UAT-GES-03 Reporte manual | CEO/Director | El PDF coincide con el snapshot persistido; no recalcula datos vivos; errores sin secretos ni trazas. |
| UAT-GES-04 Programación bloqueada | CEO | Con `kpi-dictionary`/`reporting-approval` pendientes, los controles siguen deshabilitados. **PASS esperado = bloqueado.** |
| UAT-GES-05 Distribución controlada | CEO/Admin | `BLOCKED_EXTERNAL` hasta aprobar destinatarios y reglas; luego: sólo aprobados reciben, con evidencia y sin duplicar envíos. |

## 6. Matriz de ejecución

17 casos: 14 `READY`, 2 `READY con cuenta autorizada` (UAT-VAL-06/07, requieren MFA de Pedro Pablo), 1 `BLOCKED_EXTERNAL` (UAT-GES-05, depende del Cliente).

**Datos UAT:** valorización con una casa real de Vitacura marcada como caso UAT; mercado sólo lectura; gestión sin metas ficticias; reportes sin emails no aprobados.

## 7. Qué falta para el 100 % (y de quién depende)

| Ítem | Dueño | Impacto |
|---|---|---|
| Ejecutar y aprobar UAT-02/03/04/05/06 (pendientes) | **Cliente** — ventana UAT y validaciones de Pedro Pablo | Desbloquea el 25 % ponderado con mayor peso |
| Diccionario KPI oficial, metas, rankings y alertas | **Cliente** | Condiciona UAT-GES-02 y la programación |
| Calendario, destinatarios y canal de reportes | **Cliente** | Desbloquea UAT-GES-05 |
| Migración `xlsx`→`exceljs` (CVE documentada) | N3uralia — post-UAT | No bloquea UAT; excepción en `docs/SECURITY_EXCEPTIONS.md` |
| #52 leaked password protection, #217 restore drill | N3uralia — requieren autorización administrativa/costo | Continuidad operativa |
| Transferencia y capacitación | Compartido | Cierre contractual |

## 8. Acta de resultado por pilar (una por pilar)

```text
Pilar:
Casos ejecutados:    PASS:    FAIL:    BLOCKED_EXTERNAL:
P0/P1 abiertos:      P2/P3 aceptados:
Resultado: ACCEPTED / CORRECTIONS_REQUIRED / NOT_EXECUTED
Aprobador Property Partners: Pedro Pablo
Fecha:
```

## 9. Cierre de Fase 3

La fase cierra cuando: los casos READY están ejecutados por roles autorizados; P0 = 0 y P1 = 0; P2/P3 corregidos o aceptados; cada pilar tiene acta; y Pedro Pablo validó los tres pilares de negocio. Esa validación es la condición contractual de aceptación.

---

**Evidencia primaria:** `docs/UAT_PROPERTY_PARTNERS.md` (plan contractual) · `docs/PROJECT_FINAL_STATUS.md` (% reales) · `config/uat-case-status.json` · `docs/REGRESSION_CHECKLIST.md` (23 checks) · `docs/SECURITY_EXCEPTIONS.md`.
**Defectos:** formato en §7 del plan UAT (`ID / Caso / Severidad / Rol / Pasos / Esperado / Actual / Evidencia / Estado`).
