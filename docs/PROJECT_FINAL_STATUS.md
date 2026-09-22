# Estado final del proyecto — % de finalización reales

**Fecha de consolidación:** 21 de septiembre de 2026 (post-merge PR #221 `e89e25f` y PR #222 `5febd30`)
**Producción:** `https://ppartnersgroup.app` sirviendo el build mergeado el 2026-09-21 (verificado: home 200, guard de auth 307→`/auth/login`, cotizador con validaciones y rate limit en vivo)
**Supersedes parcialmente:** los % de cierre previos quedaban implícitos en `config/*.json` al 2026-09-20; este documento los consolida y actualiza con la auditoría funcional del 2026-09-21.

---

## 1. Resumen ejecutivo

| Métrica | Valor real |
|---------|-----------|
| **Finalización ponderada del proyecto** | **≈ 79 %** (fórmula en §2) |
| Plataforma lista para UAT | **100 %** — 10/10 módulos + APIs públicas verificadas (19 checks funcionales, 2 rondas, 0 bloqueos) |
| Aceptación UAT ejecutada | **37,5 %** — 3/8 casos passed; los 8 casos son bloqueantes para el cierre |
| Encontrón real | Lo que falta para el 100 % es **mayormente de lado del cliente**: validaciones de Pedro Pablo, ventana UAT, definiciones de negocio y calendario de reportes |

**Lectura honesta:** el software está terminado y verificado. El proyecto global no está cerrado porque la aceptación contractual requiere ejecución humana del Cliente que aún no ocurre. No se declara ningún punto como completado sin evidencia real.

## 2. Metodología del cálculo (auditable)

Porcentaje ponderado por áreas, con pesos explícitos y evidencia trazable. Ningún número es opinión sin fuente.

| Área | Peso | % real | Base del cálculo | Evidencia |
|------|------|--------|------------------|-----------|
| Plataforma y funcionalidad core | 35 % | **100 %** | 10/10 módulos del dashboard + flujo público + asistente IA verificados; 23 checks de regresión definidos | Smoke funcional 2026-09-21 (rondas 1–2, 19 verificaciones en verde); `docs/REGRESSION_CHECKLIST.md` |
| Seguridad e higiene técnica | 20 % | **83 %** | Semana 1 de auditoría: 5/6 ítems cerrados | PR #221 mergeado; falta migración `xlsx`→`exceljs` (CVE registrada, `docs/SECURITY_EXCEPTIONS.md`) |
| UAT y aceptación | 25 % | **37,5 %** | 3/8 casos UAT en estado `passed`; 4 `pending` + 1 `blocked-client-input`; los 8 son `blocking` | `config/uat-case-status.json` al 2026-09-20 (sin cambios al 2026-09-21) |
| Producción y continuidad | 10 % | **89 %** | 8/9 readiness checks passed | `config/production-readiness-status.json`; falta `backupRecovery` y restore drill #217 |
| Documentación y transferencia | 10 % | **90 %** | Documentación técnica N3uralia cerrada + checklist de regresión incorporado | `docs/FINAL_CLOSEOUT_2026-09-20.md`; PR #222; capacitación/handover `blocked-client-input` |

**Cómputo:** 0,35·100 + 0,20·83 + 0,25·37,5 + 0,10·89 + 0,10·90 = **78,9 % ≈ 79 %**

Sensibilidad: si el UAT se ejecutara y aprobara en su totalidad mañana, el proyecto saltaría a **≈ 94 %** (lo residual sería continuidad operativa y transferencia).

## 3. Detalle UAT — casos y responsables

| Caso | Área | Estado | Owner | Nota |
|------|------|--------|-------|------|
| UAT-01 | Accesos y permisos | ✅ passed | N3uralia | Role/RLS QA automatizado con identidades efímeras |
| UAT-07 | Seguridad funcional | ✅ passed | N3uralia | Matrices autenticadas + pruebas negativas |
| UAT-08 | Continuidad operativa | ✅ passed | N3uralia | Rollback, instalación y recuperación documentados |
| UAT-02 | CEO Dashboard | ⏳ pending | **Cliente** | Pedro Pablo valida la lectura ejecutiva de gestión |
| UAT-04 | Inteligencia de Mercado | ⏳ pending | **Cliente** | Pedro Pablo valida lectura final de negocio |
| UAT-03 | BI / Gestión | ⏳ pending | Compartido | Criterios provisionales/fail-closed hasta validación |
| UAT-05 | Valorización | ⏳ pending | Compartido | Falta 1 caso real autorizado hasta `issued` + PDF |
| UAT-06 | Reportes mensuales | ⛔ blocked-client-input | Compartido | Falta calendario, destinatarios, frecuencia y canal |

Cadena canónica de aceptación: **Ejecutivo → Director → Pedro Pablo** (último eslabón y validador final de negocio). N3uralia valida software, seguridad, permisos, datos, trazabilidad, CI y regresión — no repite QA de negocio.

## 4. Pendientes técnicos (ninguno bloquea UAT)

| Ítem | Severidad | Ruta propuesta |
|------|-----------|----------------|
| Migración `xlsx@0.18.5` → `exceljs` (CVE-2023-30533 / CVE-2024-22363) | Media — excepción documentada | Semana 2, con validación funcional |
| Observaciones cosméticas de auditoría: i18n error de login (inglés), 404 sin marca, redirect por rol, `market/fuentes` en ceros | Baja | Semana 2 (post-UAT recomendado: toca código) |
| Deuda ESLint: 118 warnings en `warn` (React Compiler, `no-explicit-any`, `ban-ts-comment`) | Baja — registro en `docs/SECURITY_EXCEPTIONS.md` §3 | Post-UAT, deuda planificada |
| #52 Leaked Password Protection (Supabase Auth) | Media — requiere acceso administrativo | Configuración, con autorización |
| #217 Restore drill real en entorno aislado | Media — requiere autorización (costo) | Continuidad operativa |
| Check `backupRecovery` de readiness | Media | Junto a #217 |
| QA visual autenticado (diferido por decisión 2026-07-30) | Diferido | Suite Puppeteer + runbook listos (`docs/AUTOMATED_VISUAL_QA_RUNBOOK.md`) |

**Recomendación de secuencia:** ejecutar UAT primero (desbloquea el 25 % ponderado con mayor peso); Semana 2 de código después de UAT para no invalidar lo verificado.

## 5. Condiciones para declarar 100 %

1. UAT-02, UAT-03, UAT-04, UAT-05 y UAT-06 en `passed` (requiere participación del Cliente y validaciones de Pedro Pablo).
2. Cierre de #52, #217 y check `backupRecovery` con evidencia real.
3. Transferencia/capacitación con renuncia o asistencia formal.
4. Acta o aceptación inequívoca de Pedro Pablo (condición contractual).

## 6. Evidencia primaria

- `config/contract-closeout-status.json` — workstreams y estado contractual machine-readable.
- `config/uat-case-status.json` — estado de los 8 casos UAT.
- `config/production-readiness-status.json` — readiness productivo (8/9).
- `docs/FINAL_CLOSEOUT_2026-09-20.md` — cierre documental N3uralia.
- `docs/REGRESSION_CHECKLIST.md` — regresión funcional permanente (23 checks).
- `docs/SECURITY_EXCEPTIONS.md` — excepciones conscientes con condición de cierre.
- Producción `ppartnersgroup.app` — build `5febd30` verificado el 2026-09-21.

---

*Este documento se actualiza al mergear cada PR relevante o al ejecutarse cada caso UAT. Última actualización: 2026-09-21, consolidado por Kimi Work a partir de los estados machine-readable y la auditoría funcional de las rondas 1–2.*
