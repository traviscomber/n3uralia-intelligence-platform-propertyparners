# Registro de cierre técnico

Fecha de actualización: 3 de septiembre de 2026

## Estado

**PASS técnico / READY para UAT**.

Este estado no equivale a aceptación contractual final. UAT, capacitación, destinatarios/calendario de reportes, backup/recovery probado, checksum de entrega y aceptación del cliente continúan como gates separados.

El alcance V1 de aceptación sigue restringido a **casas en venta en Vitacura**.

## Baseline funcional verificado

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`.
- Rama: `main`.
- SHA funcional: `dbb9ae7717e9152858d2e989a36691f6ab03b765`.
- Producción: `https://ppartnersgroup.app`.
- Deployment: `dpl_4vk2HRhNZQiKZ3sikeQ2qir69n49` — `READY`.
- PR #202: mergeado después de `Contractual modules CI` PASS, `N3uralia IP Boundaries` PASS y preview Vercel READY.
- Verificación posterior al deploy: producción muestra `50 de 317 propiedades operativas sin barrio · no corresponde al universo de 50 casas live`.
- Runtime posterior al deploy: sin logs `error`/`fatal` encontrados en la ventana revisada.

PR #202 sólo aclara el denominador de cobertura territorial; no modifica datos, cálculos, auth, RLS ni alcance contractual.

## Pilar I — Inteligencia de Mercado

Estado: **PASS técnico / READY para UAT**.

Evidencia productiva:

- 5 archivos fuente auditados;
- 5.197 publicaciones Portal con ID válido;
- 5.190 elegibles para venta según contrato de fuente;
- 40.843 filas CBRS disponibles como evidencia registral;
- 19 barrios KML;
- 50 casas live;
- 11 vinculadas y 39 sin vínculo canónico;
- 1 candidato fuerte y 1 colisión externa;
- cobertura live de identidad: 22,0%;
- 317 propiedades operativas/históricas;
- cobertura territorial operativa: 84,2%, con 50 de 317 todavía sin barrio.

Una publicación Portal no equivale a una venta. Una fila CBRS no se publica como venta residencial comparable sin validación tipológica, temporal, de activo y territorial. Las identidades candidatas requieren revisión humana.

## Pilar II — Valorización

Estado: **PASS técnico / READY para UAT**.

Caso UAT observado en producción: `LA PEROUSSE 5214`, Casa/Jardín del Este, versión 3, `EN REVISIÓN`, UF 46.978 preliminar, confianza Media, 5 comparables CBRS aceptados y 0 alertas visibles.

El workflow mantiene mínimo de tres comparables, decisiones auditables, revisión/devolución, snapshots/versiones y aprobación/emisión CEO con MFA/AAL2. No se avanza artificialmente un caso para fabricar aceptación.

## Pilar III — Gestión y Reportes

Estado: **PASS técnico / READY para UAT**, con dependencias de negocio explícitas.

Julio 2026 permanece como último período operativo con evidencia:

- ventas reales: 11;
- meta corporativa aprobada: 8;
- cumplimiento: 137,5%;
- crédito de gestión corporativo: 9,5, separado de ventas reales.

Reportes y recurrencia permanecen fail-closed cuando faltan definiciones, destinatarios o aprobaciones. Esta revisión no envió reportes externos.

## Cotizador público

Estado: **productivo / complementario / no bloqueante**.

PR #181 y PR #183 están mergeados. Producción ofrece casas de Vitacura, 19 sectores KML, mínimo de cinco observaciones, fallback explícito a referencia general de Vitacura cuando falta muestra sectorial, sin captura de PII y separado del Valorizador Profesional.

## Seguridad

- PR #201 restauró sellers visibles mediante RPC acotada sin ampliar la política self-only de `profiles`.
- Las RPC `SECURITY DEFINER` críticas revisadas contienen guards de rol/alcance/estado; operaciones críticas usan MFA/AAL2 donde corresponde.
- No hay hallazgo abierto P0/P1 de aplicación identificado en este cierre.
- Hardening administrativo pendiente: protección contra contraseñas filtradas en Supabase Auth.
- `backupRecovery` permanece `pending`: no se ejecutó un restore drill vigente y no se infiere PASS desde documentación de rollback.

## Higiene de release

Se cerraron sin merge por estar superseded u obsoletos: #78, #79, #121, #140, #143, #144 y #184. No se reintrodujo código antiguo ni se eliminó historia.

## Pendientes reales para aceptación contractual

1. UAT humano por roles y pilares, incluido un caso real de valorización hasta `issued`.
2. Definición/aprobación cliente de KPI todavía pendientes.
3. Calendario, frecuencia, canal y destinatarios definitivos de reportes.
4. Capacitación y registro de asistencia/cierre.
5. Evidencia actual de backup/recovery o restore drill.
6. Titularidad/receptor técnico autorizado de servicios de terceros.
7. Artefacto final, checksum y autorización de entrega.
8. Acta o registro de aceptación del cliente.

Ninguna dependencia pendiente autoriza datos ficticios, reglas inventadas, envío automático o una falsa declaración de aceptación.
