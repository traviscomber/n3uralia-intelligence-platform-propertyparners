> **Checklist de cierre vigente — 18 de septiembre de 2026:** ver `docs/FINAL_CLOSEOUT_2026-09-18.md`. Baseline de cierre: `002805a52c660155b8a71cb90528ee78725e9067`; los valores históricos de este archivo se mantienen como evidencia de revisiones previas.

# Checklist final de aceptación contractual

Última actualización: 3 de septiembre de 2026

## Estado ejecutivo

**PASS técnico / READY para UAT**.

Baseline funcional productivo:
- SHA `dbb9ae7717e9152858d2e989a36691f6ab03b765`;
- producción `https://ppartnersgroup.app`;
- deployment `dpl_4vk2HRhNZQiKZ3sikeQ2qir69n49` — `READY`;
- PR #202 integrado después de Contractual CI PASS, N3uralia IP Boundaries PASS y preview READY;
- producción verificada en navegador y sin `error`/`fatal` en la ventana runtime posterior al deploy.

La aceptación técnica no sustituye `docs/UAT_PROPERTY_PARTNERS.md` ni el acta del Cliente.

## 1. Plataforma y seguridad

| Requisito | Estado |
|---|---|
| Autenticación, perfiles y alcance por rol | PASS técnico |
| RLS / tenant isolation | PASS técnico |
| APIs y RPC críticas con guards de servidor | PASS técnico |
| MFA/AAL2 para aprobación/emisión crítica | PASS técnico |
| Asignación de cartera sólo dentro de V1 Vitacura | PASS técnico |
| Sellers visibles sin ampliar `profiles` RLS | PASS técnico |
| Protección contra contraseñas filtradas Supabase Auth | Pendiente administración |
| Backup/recovery probado mediante restore drill actual | Pendiente técnico de gobernanza |
| Aceptación humana por roles | Pendiente UAT cliente |

## 2. Mercado

Estado: **PASS técnico / READY para UAT**.

| Requisito | Estado / evidencia |
|---|---|
| Fuentes y trazabilidad | PASS; Portal, CBRS y KML separados |
| Casas live | 50 |
| Identidad live | 11 vinculadas / 39 sin vínculo; 1 candidato fuerte; 1 colisión |
| Barrios KML | 19 |
| Cobertura territorial operativa | 84,2%; 50 de 317 propiedades operativas sin barrio |
| Copy del denominador | PASS productivo; explícitamente separado de las 50 casas live |
| Publicaciones tratadas como ventas | Prohibido / fail-closed |
| Filas CBRS publicadas automáticamente como venta | Prohibido / fail-closed |
| Lectura y suficiencia de negocio | Pendiente UAT cliente |

## 3. Valorización

Estado: **PASS técnico / READY para UAT**.

| Requisito | Estado |
|---|---|
| Expediente, comparables y ajustes auditables | PASS técnico |
| Mínimo 3 comparables antes de avanzar | PASS técnico |
| Revisión/devolución/reenvío | PASS técnico |
| CEO-only aprobación/emisión + MFA | PASS técnico |
| Versiones/snapshots/decision log | PASS técnico |
| PDF/artefacto | PASS automatizado |
| Caso real hasta `issued` | Pendiente UAT cliente |
| Inspección humana del PDF emitido | Pendiente UAT cliente |

Caso UAT observado: `LA PEROUSSE 5214`, Casa/Jardín del Este, versión 3, `EN REVISIÓN`, UF 46.978 preliminar, confianza Media, 5 comparables aceptados y 0 alertas visibles.

## 4. Gestión y reportes

Estado: **PASS técnico / READY para UAT**, con dependencias cliente.

| Requisito | Estado / evidencia |
|---|---|
| Ventas reales julio 2026 | 11 |
| Meta corporativa mensual | 8 |
| Cumplimiento | 137,5% |
| Crédito de gestión corporativo | 9,5, separado de ventas reales |
| Vistas CEO/dirección/ejecutivo | PASS técnico |
| Reportes manuales y trazabilidad | PASS técnico |
| Scheduling / delivery fail-closed | PASS técnico |
| KPI finales aún no aprobados | Dependencia cliente |
| Calendario / destinatarios / frecuencia | Dependencia cliente |

Esta revisión no envió reportes externos.

## 5. Cotizador público

Estado: **productivo / no bloqueante**.

PR #181 y #183 están mergeados. Se verificó alcance Casas/Vitacura, 19 sectores KML, mínimo de cinco observaciones, fallback general Vitacura explícito, ausencia de PII y separación del Valorizador Profesional.

## 6. QA de release

Para el último cambio funcional #202:

- Contractual modules CI: PASS;
- N3uralia IP Boundaries: PASS;
- Vercel preview: READY;
- merge a `main`: PASS;
- deployment productivo: READY;
- navegador productivo: PASS;
- logs `error`/`fatal` post-deploy: ninguno encontrado.

El baseline previo mantiene además QA autenticado por roles y QA visual verdes; #202 fue un cambio de copy sin cambios en autorización, datos o lógica.

## 7. Higiene

Cerrados sin merge por estar superseded/obsoletos: #78, #79, #121, #140, #143, #144 y #184.

## 8. Gates pendientes antes de aceptación final

- UAT del Cliente con participantes designados;
- caso real de valorización hasta `issued` e inspección PDF;
- aprobación de KPI pendientes;
- calendario, canal y destinatarios de reporting;
- capacitación y evidencia de asistencia;
- restore drill / evidencia de backup-recovery vigente;
- receptor técnico/titularidad de servicios de terceros;
- artefacto final + checksum + autorización de entrega;
- acta de aceptación.

No se declara `accepted` mientras estos gates sigan abiertos.
