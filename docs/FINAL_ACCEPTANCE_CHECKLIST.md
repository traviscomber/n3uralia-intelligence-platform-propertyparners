# Checklist final de aceptación contractual

Última actualización: 3 de septiembre de 2026

## Criterio de estado

- **PASS técnico:** implementación disponible y evidencia reproducible mediante código, SQL, RLS, verificadores, QA autenticado, navegador o deployment.
- **Pendiente UAT cliente:** requiere ejecución y aceptación por usuarios autorizados de Property Partners.
- **Dependencia cliente:** requiere fuente, definición, aprobación, destinatario o criterio formal del Cliente.
- **No disponible en fuente:** la plataforma muestra `n/d`, `—` o estado equivalente y no infiere el dato.

Baseline de aplicación productivo verificado al iniciar este cierre: `92f1ca63ab2c2d606edc40d55aadb250669cd154` en `https://ppartnersgroup.app`, deployment `dpl_4CxmckkJfevb5zMd7GwELLeqt1H3` (`READY`).

PR #202 contiene únicamente una aclaración de copy para declarar el denominador de cobertura territorial. Se mantiene fuera del baseline hasta completar `Contractual modules CI` y `N3uralia IP Boundaries`; al integrarse, corresponde actualizar el SHA final y repetir el gate productivo.

La aceptación técnica automatizada no sustituye `docs/UAT_PROPERTY_PARTNERS.md`.

## 1. Plataforma y seguridad

| Requisito | Estado | Evidencia |
|---|---|---|
| Autenticación y perfil válido | PASS técnico | guards, post-login por rol, alcance centralizado y role QA |
| Alcance CEO global | PASS técnico | capacidades, rutas protegidas y RLS |
| Alcance dirección/subdirección por oficina | PASS técnico | matriz de capacidades, RLS y pruebas negativas |
| Alcance Ejecutivo personal | PASS técnico | alcance personal y RLS |
| Protección de APIs críticas | PASS técnico | guards de servidor y autorización interna de RPC críticas |
| MFA para aprobación/emisión de valorizaciones | PASS técnico | AAL2 y guard de operación crítica |
| Recorrido autenticado automatizado | PASS técnico | Auth/RLS QA + visual QA del baseline productivo |
| Aceptación humana de recorridos por perfil | Pendiente UAT cliente | casos UAT por rol y pilar |
| Protección de contraseñas filtradas de Supabase Auth | Pendiente administración | advisor vigente; activar en configuración Auth cuando corresponda |

PR #201 corrigió la lista de ejecutivas para asignación mediante una RPC acotada al predicado central de alcance; no se amplió la política self-only de `profiles`.

## 2. Pilar I — Inteligencia de Mercado

Estado global: **PASS técnico / READY para UAT**.

| Requisito | Estado | Evidencia |
|---|---|---|
| Ingestión y trazabilidad de fuentes | PASS técnico | runs/raw records/manifiestos y UI de fuentes |
| Separación publicación vs venta confirmada | PASS técnico | listings/transactions y copy fail-closed |
| Identidad canónica revisable | PASS técnico | 50 casas live; 11 vinculadas, 39 sin vínculo; 1 candidato fuerte y 1 colisión |
| KML Vitacura | PASS técnico | 19 barrios canónicos |
| Cobertura territorial operativa | PASS técnico con deuda de datos visible | 84,2%; 50 de 317 propiedades operativas sin barrio |
| Asignaciones comerciales V1 | PASS técnico | sólo casas cuya dirección acredita Vitacura; ejecutivas visibles según alcance |
| Ventas CBRS publicables actuales | No disponible en fuente validada | no se convierte una fila registral en venta residencial sin validación |
| Suficiencia de filtros, barrios y nomenclatura | Pendiente UAT cliente | UAT-MKT-01 a UAT-MKT-05 |

Nota de interpretación: las **50 propiedades sin barrio** pertenecen al universo de **317 propiedades operativas/históricas**, no al universo de **50 casas live**. PR #202 hace explícito ese denominador en la UI.

## 3. Pilar II — Valorización de Propiedades

Estado global: **PASS técnico / READY para UAT**.

| Requisito | Estado | Evidencia |
|---|---|---|
| Expediente y sujeto | PASS técnico | caso persistido y trazable |
| Comparables aceptados/excluidos | PASS técnico | decisiones y evidencia por comparable |
| Ajustes con límites | PASS técnico | controles deterministas y auditoría |
| Valor sugerido, rango y confianza | PASS técnico | cálculo/modelo y validaciones |
| Mínimo 3 comparables antes de avanzar | PASS técnico | guard de workflow |
| Revisión/devolución/reenvío | PASS técnico | transición atómica e historial |
| Aprobación/emisión exclusiva CEO | PASS técnico | capability + MFA/AAL2 |
| Versiones y decision log | PASS técnico | snapshots e historial |
| Reporte/PDF | PASS técnico automatizado | snapshot y verificadores |
| Caso real completo punta a punta | Pendiente UAT cliente | UAT-VAL-01 a UAT-VAL-07 |
| Inspección humana del PDF emitido | Pendiente UAT cliente | UAT-VAL-07 |

Expediente UAT observado en producción: `LA PEROUSSE 5214`, Casa/Jardín del Este, versión 3, `EN REVISIÓN`, UF 46.978 preliminar, confianza Media, 5 comparables CBRS aceptados y 0 alertas visibles. No se declara emitido ni aprobado antes de completar el flujo humano.

## 4. Pilar III — Control de Gestión Comercial

Estado global: **PASS técnico / READY para UAT**, con dependencias de negocio explícitas.

| Requisito | Estado | Evidencia |
|---|---|---|
| Vista CEO | PASS técnico | julio 2026 como último período con evidencia |
| Vista dirección/oficina | PASS técnico | alcance centralizado |
| Vista Ejecutivo | PASS técnico | alcance personal |
| Ventas reales julio 2026 | PASS técnico/canónico | 11 |
| Meta corporativa mensual | PASS técnico/canónico | 8 ventas |
| Cumplimiento julio | PASS técnico/canónico | 137,5% |
| Créditos de gestión separados de ventas | PASS técnico | 9,5 corporativo como dimensión de atribución, no venta real |
| Metas y alertas | PASS técnico como infraestructura | almacenamiento, edición y evaluación |
| Reportes manuales | PASS técnico | persistencia, artefacto y trazabilidad |
| Programación fail-closed | PASS técnico | bloqueos por definiciones/destinatarios pendientes |
| Fórmula oficial de productividad/ranking/umbrales finales | Dependencia cliente | no se inventan reglas contractuales |
| Calendario y destinatarios definitivos | Dependencia cliente | distribución recurrente bloqueada hasta aprobación |

Esta revisión no generó ni envió un nuevo reporte a destinatarios externos.

## 5. Cotizador público complementario

Estado: **productivo / no bloqueante**.

| Control | Estado | Evidencia |
|---|---|---|
| Landing pública `/` | PASS técnico productivo | verificación directa 3-sep-2026 |
| Casas en Vitacura | PASS técnico | scope del endpoint y UI |
| 19 sectores KML seleccionables | PASS técnico productivo | PR #183 mergeado |
| Piso mínimo de 5 observaciones | PASS técnico | regresiones y UI |
| Fallback general Vitacura cuando falta muestra sectorial | PASS técnico productivo | explícito, sin falsa precisión |
| Sin PII | PASS técnico | no solicita ni almacena datos de contacto |
| Separación del Valorizador Profesional | PASS técnico | flujos, permisos y metodología independientes |

PR #181 y PR #183 fueron mergeados el 2 de septiembre de 2026. Ya no corresponden a estado “candidato”.

## 6. Informes y trazabilidad

| Requisito | Estado | Evidencia |
|---|---|---|
| Directorio de informes canónicos | PASS técnico | `/dashboard/reportes/canonicos` |
| Operación de reportes | PASS técnico | `/dashboard/reportes/operacion` |
| Snapshot persistido | PASS técnico | documentos/artefactos auditables |
| N/D preservado | PASS técnico | no se publica cero por ausencia |
| Modelo/prompt/costo/fuentes cuando existen | PASS técnico | metadata canónica |
| Distribución recurrente definitiva | Dependencia cliente/configuración | calendario/audiencia/destinatarios aprobados |

## 7. QA y release reproducible

El baseline productivo previo a PR #202 tiene evidencia verde para:

1. `Contractual modules CI`;
2. QA autenticado por roles;
3. QA visual autenticado;
4. `N3uralia IP Boundaries`;
5. Vercel producción `READY`;
6. navegación real de Mercado, Gestión, Valorización y cartera;
7. cotizador público productivo.

PR #202 tiene preview Vercel `READY` y build completo, pero no se integra hasta que sus dos jobs de GitHub Actions dejen el estado `queued` y concluyan correctamente.

Si se modifica código después del UAT, este gate debe repetirse antes de congelar el release final.

## 8. Higiene de ramas y PRs

El 3 de septiembre se cerraron sin merge por estar superseded u obsoletos: #78, #79, #121, #140, #143, #144 y #184.

Las capacidades útiles de #140/#143/#144 ya están materializadas en versiones posteriores en producción; no se reintroducen ramas antiguas para “cerrar” deuda administrativa.

## 9. Pendientes UAT

Plan ejecutable: `docs/UAT_PROPERTY_PARTNERS.md`.

Pendiente de aceptación humana:

- Mercado: inventario live, barrios/KML, identidad/reconciliación, oferta vs evidencia registral y estados sin datos;
- Valorización: caso real, comparables, devolución, corrección, reenvío, aprobación CEO con MFA, emisión e inspección PDF;
- Gestión: vistas por rol, procedencia de métricas, reporte manual y bloqueo correcto de recurrencia;
- distribución controlada sólo cuando existan destinatarios aprobados.

Salida aceptable: P0 = 0, P1 = 0; P2/P3 corregidos, aceptados o programados sin bloquear el flujo contractual.

## 10. Dependencias exclusivas del Cliente

- fuentes/datasets adicionales que Property Partners determine como oficiales;
- definición definitiva de captaciones/productividad/ranking/umbrales cuando aún esté pendiente;
- calendario, audiencias y destinatarios de informes;
- representantes y aprobación funcional de UAT;
- políticas adicionales de retención, privacidad o integración cuando correspondan.

Ninguna de estas dependencias autoriza datos ficticios, reglas inventadas o inferencias presentadas como hechos.

## 11. Estado de listo para entrega técnica

A fecha 3 de septiembre de 2026, el estado correcto es:

**PASS técnico / READY para UAT**.

La entrega contractual definitiva requiere:

1. completar cualquier gate pendiente del último cambio funcional antes de mergearlo;
2. ejecutar los casos READY de UAT con usuarios autorizados;
3. cerrar P0/P1 y repetir gates cuando haya cambios;
4. registrar P2/P3 y dependencias externas;
5. ejecutar capacitación;
6. consolidar acta/minuta de aceptación;
7. congelar SHA y deployment finales.

No se declara aceptación contractual final antes de esos pasos.
