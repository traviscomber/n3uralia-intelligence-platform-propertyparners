# Checklist final de aceptación contractual — Property Partners

Última actualización: 2 de septiembre de 2026

## 1. Cómo interpretar este checklist

Estados válidos:

- **PASS técnico** — implementación verificada con evidencia reproducible.
- **Pendiente UAT cliente** — requiere ejecución por usuario autorizado y validación de negocio.
- **Dependencia cliente** — requiere definición, fuente, destinatario o aprobación formal del Cliente.
- **No disponible en fuente** — debe mostrarse como N/D, `—` o estado equivalente; no se infiere.
- **N/A contractual** — mejora complementaria o capacidad fuera del criterio de aceptación.

La aceptación técnica no sustituye el UAT.

## 2. Baseline productivo actual

- producción: `https://ppartnersgroup.app`;
- rama: `main`;
- commit: `4dacae91757d1f67d14a3ac443dded212a14fa0d`;
- Vercel deployment: `dpl_9CtkvZ3LXXtRms9a9RccPHkb5TH8`;
- deployment: `READY`;
- QA visual desktop: PASS;
- QA visual móvil estrecho: PASS;
- `Contractual modules CI`: PASS;
- `N3uralia IP Boundaries`: PASS.

Cualquier cambio de código posterior a este baseline debe volver a pasar el gate técnico antes de congelar aceptación.

## 3. Plataforma, seguridad y acceso

| Requisito | Estado | Criterio |
|---|---|---|
| Autenticación | PASS técnico | sesión válida y guards de acceso |
| Scope CEO global | PASS técnico | capability + RLS |
| Scope Dirección por oficina | PASS técnico | capability + RLS + aislamiento |
| Scope Partner/Ejecutivo personal | PASS técnico | capability + RLS |
| Admin técnico separado de rol organizacional | PASS técnico | permisos explícitos |
| APIs críticas protegidas | PASS técnico | server guards / RLS |
| MFA/AAL2 para aprobación y emisión | PASS técnico | operación crítica bloqueada sin AAL2 |
| QA autenticada desktop | PASS técnico | navegación y superficies principales |
| QA responsive móvil | PASS técnico | navegación colapsada, controles y layouts |
| Aceptación humana por rol | Pendiente UAT cliente | `docs/UAT_PROPERTY_PARTNERS.md` |

## 4. Pilar I — Inteligencia de Mercado

| Requisito | Estado | Criterio |
|---|---|---|
| Oferta activa separada de ventas CBRS | PASS técnico | semántica y fuentes separadas |
| Listing live separado de property canónica | PASS técnico | identidad y observación no confundidas |
| Cola live separada de duplicados históricos | PASS técnico | flujos distintos |
| Territorialidad KML Vitacura | PASS técnico | resolución canónica |
| Frescura/fuente visibles | PASS técnico | procedencia disponible |
| Datos faltantes no convertidos a cero | PASS técnico | estados N/D/partial |
| UF/m² de casas sobre superficie construida | PASS técnico | precio UF / built area |
| Suficiencia de filtros/nomenclatura | Pendiente UAT cliente | UAT-MKT |
| Nuevas fuentes no entregadas | Dependencia cliente | no inventar cobertura |

Snapshot de auditoría del 2 de septiembre de 2026:

- 44 casas activas;
- 44/44 con barrio KML resoluble;
- 41/44 utilizables para UF/m² construido.

Estos valores son snapshot, no requisitos fijos de aceptación.

## 5. Pilar II — Valorización de Propiedades

| Requisito | Estado | Criterio |
|---|---|---|
| Identificación de propiedad sujeto | PASS técnico | expediente trazable |
| Mínimo 3 comparables | PASS técnico | guard de workflow |
| Selección humana de comparables | PASS técnico | decisiones persistidas |
| Cálculo determinístico | PASS técnico | metodología reproducible |
| Justificación profesional | PASS técnico | persistida en expediente |
| Revisión/devolución/reenvío | PASS técnico | transición e historial |
| Aprobación exclusiva CEO | PASS técnico | capability + MFA/AAL2 |
| Emisión desde snapshot | PASS técnico | documento no recalculado con live data |
| Historial/versiones | PASS técnico | trazabilidad |
| Caso real punta a punta | Pendiente UAT cliente | UAT-VAL-01 a UAT-VAL-07 |
| Inspección humana del PDF | Pendiente UAT cliente | UAT-VAL-07 |

## 6. Pilar III — Control de Gestión y Reportes

| Requisito | Estado | Criterio |
|---|---|---|
| Vista y alcance por rol | PASS técnico | scopes centralizados |
| Métricas persistidas/reconciliadas | PASS técnico | evidencia y estado |
| Tareas y seguimiento | PASS técnico | lifecycle auditable |
| Reportes desde snapshots | PASS técnico | persistencia y trazabilidad |
| PDF | PASS técnico | artefacto real |
| Retries / idempotencia | PASS técnico | no duplicación silenciosa |
| Scheduling protegido | PASS técnico | fail-closed |
| Diccionario KPI oficial | Dependencia cliente | definición pendiente |
| Metas/umbrales/ranking finales | Dependencia cliente | definición pendiente |
| Calendario/report recipients | Dependencia cliente | definición pendiente |
| Distribución real con destinatarios aprobados | Pendiente UAT / dependencia cliente | ejecutar cuando existan datos aprobados |

## 7. Mejora complementaria — Cotizador público

Clasificación contractual: **N/A contractual / mejora productiva complementaria**.

Estado técnico:

| Requisito | Estado |
|---|---|
| Sólo casas en Vitacura | PASS técnico |
| 19 sectores KML | PASS técnico |
| Piso mínimo 5 observaciones | PASS técnico |
| Fallback general Vitacura explícito | PASS técnico |
| No captura datos personales | PASS técnico |
| No expone listings crudos | PASS técnico |
| Responsive desktop/móvil | PASS técnico |
| Separado del Valorizador Profesional | PASS técnico |

Snapshot auditado:

- 41 observaciones utilizables;
- Santa María 12;
- La Llavería 7;
- Club de Polo 6.

Este módulo no se usa para aprobar o rechazar el Pilar II contractual.

## 8. Documentación

| Documento | Estado |
|---|---|
| `docs/README.md` — índice canónico | Preparado |
| `ROADMAP.md` | Actualizado |
| `docs/CONTRACTUAL_DELIVERY_PACKAGE.md` | Actualizado |
| `docs/TECHNICAL_CLOSURE_RECORD.md` | Actualizado |
| `docs/EXECUTIVE_PROJECT_CLOSURE.md` | Actualizado |
| `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md` | Actualizado |
| `docs/UAT_PROPERTY_PARTNERS.md` | Preparado para ejecución |
| `docs/USER_MANUAL.md` | Disponible |
| `docs/ADMIN_MANUAL.md` | Disponible |
| `docs/SECURITY_AUTHORIZATION_MODEL.md` | Disponible |

Los documentos experimentales/históricos no deben interpretarse como autoridad de alcance vigente salvo que el canon los cite explícitamente.

## 9. UAT cliente

Plan canónico: `docs/UAT_PROPERTY_PARTNERS.md`.

Para cerrar UAT:

- ejecutar casos READY con roles autorizados;
- registrar PASS / FAIL / BLOCKED_EXTERNAL;
- P0 = 0;
- P1 = 0;
- P2/P3 corregidos, aceptados o programados;
- resultado por pilar registrado;
- cualquier cambio de producto revalida gate técnico.

Estado actual: **Pendiente UAT cliente**.

## 10. Capacitación

Antes del cierre contractual final registrar capacitación mínima para:

- CEO/administración;
- Dirección/Subdirección;
- Partners/Ejecutivos que operen Mercado y Valorización.

Estado actual: **Pendiente de ejecución/registro**.

## 11. Dependencias externas

No deben bloquear el cierre técnico de módulos que funcionan fail-closed, pero sí deben quedar separadas en el acta final:

- KPI oficiales;
- metas y umbrales;
- ranking/desempates;
- calendario de reportes;
- destinatarios;
- nuevas fuentes/integraciones solicitadas;
- políticas adicionales de privacidad/retención, si aplican.

## 12. Checklist de congelamiento final

Antes de declarar DONE contractual:

- [ ] UAT ejecutado.
- [ ] P0 = 0.
- [ ] P1 = 0.
- [ ] P2/P3 registrados y acordados.
- [ ] Capacitación ejecutada.
- [ ] Dependencias externas documentadas.
- [ ] Commit final identificado.
- [ ] Deployment final `READY`.
- [ ] Runtime final revisado.
- [ ] Rollback disponible/documentado.
- [ ] Acta/minuta de aceptación preparada y registrada.

## 13. Estado actual

**Gate técnico:** PASS.

**Producción:** READY.

**UAT cliente:** pendiente.

**Aceptación contractual final:** pendiente.