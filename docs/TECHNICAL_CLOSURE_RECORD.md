# Registro de cierre técnico

Fecha de actualización: 3 de septiembre de 2026

## Alcance del cierre

Este documento consolida el estado técnico verificable de Property Partners. La aceptación contractual final sigue siendo una actividad distinta y requiere UAT con usuarios autorizados de Property Partners.

El alcance V1 de aceptación permanece restringido a **casas en venta en Vitacura**. Departamentos, arriendos y otras comunas no se incorporan al criterio contractual por conveniencia técnica.

## Baseline validado

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`.
- Rama operativa: `main`.
- Producción: `https://ppartnersgroup.app`.
- Baseline de aplicación productivo verificado al iniciar este cierre: `92f1ca63ab2c2d606edc40d55aadb250669cd154`.
- Deployment productivo asociado: `dpl_4CxmckkJfevb5zMd7GwELLeqt1H3`, `READY`.
- El baseline corresponde al merge de PR #201, que restauró la visibilidad acotada de ejecutivas para asignación de cartera sin ampliar RLS.
- Un ajuste de copy de Mercado, PR #202, se mantiene fuera de este baseline hasta completar sus gates de GitHub Actions. No cambia cálculos, datos, RLS ni lógica contractual.

Cuando PR #202 se integre, este documento debe registrar el nuevo SHA productivo como baseline funcional final antes de congelar la entrega.

## Gate técnico verificado sobre producción

El release productivo previo a PR #202 había completado satisfactoriamente:

- `Contractual modules CI`: PASS;
- `Authenticated role QA`: PASS;
- `Authenticated visual QA`: PASS;
- `N3uralia IP Boundaries`: PASS;
- Vercel producción: `READY`;
- flujo de cartera Vitacura y ejecutivas: verificado en navegador;
- dashboard CEO/gestión: verificado en navegador;
- expediente UAT de valorización: verificado en navegador;
- cotizador público: verificado en navegador.

La revisión del 3 de septiembre no observó un defecto runtime que invalide el release actual.

## Estado técnico por pilar

### Pilar I — Inteligencia de Mercado

Estado: **PASS técnico / READY para UAT**.

Evidencia vigente observada:

- 5 archivos fuente auditados;
- 5.197 publicaciones Portal con ID válido;
- 5.190 elegibles para venta según el contrato de fuente;
- 40.843 filas CBRS disponibles como evidencia registral, no como ventas confirmadas automáticas;
- 19 barrios KML canónicos;
- 50 casas live;
- 11 casas live vinculadas a identidad canónica y 39 sin vínculo;
- 1 candidato fuerte y 1 colisión externa pendientes de revisión humana;
- cobertura live de identidad: 22,0%;
- 317 propiedades operativas/históricas en la base materializada;
- cobertura territorial operativa: 84,2%, con 50 de 317 propiedades operativas aún sin barrio.

El último punto no significa que las 50 casas live carezcan de barrio. PR #202 corrige ese copy para declarar explícitamente el denominador y evitar esa lectura errónea.

Las publicaciones Portal no se presentan como ventas cerradas. Las filas CBRS requieren validación tipológica, temporal, de activo y territorial antes de convertirse en comparables/ventas publicables.

### Pilar II — Valorización de Propiedades

Estado: **PASS técnico / READY para UAT**.

El expediente UAT `9ef24a29-7ca7-46c7-b088-cada5f3ccdb0` fue verificado en producción:

- sujeto: `LA PEROUSSE 5214`;
- tipo: Casa;
- barrio: Jardín del Este;
- estado: `EN REVISIÓN`;
- versión: 3;
- valor preliminar: UF 46.978;
- confianza: Media;
- 5 comparables CBRS aceptados;
- 0 alertas de evidencia visibles;
- no publicable hasta aprobación/emisión.

El flujo mantiene selección humana de comparables, mínimo de tres antes de avanzar, ajustes auditables, historial/versiones, aprobación/emisión CEO y MFA/AAL2 para operaciones críticas.

No corresponde avanzar artificialmente este caso para declarar UAT aprobado. La revisión, eventual devolución, aprobación CEO, emisión e inspección humana del PDF son pasos de aceptación del cliente.

### Pilar III — Control de Gestión y Reportes

Estado: **PASS técnico / READY para UAT**, con dependencias de negocio explícitas.

Evidencia canónica de julio de 2026:

- ventas reales: 11;
- meta corporativa aprobada: 8 ventas/mes;
- cumplimiento: 137,5%;
- crédito de gestión corporativo: 9,5, mantenido como dimensión separada de las ventas reales;
- período operativo más reciente con evidencia: julio 2026.

La plataforma no sustituye ventas reales por créditos de gestión ni reconstruye metas con valores documentales legacy. Reportes y recurrencia permanecen fail-closed cuando faltan definiciones, destinatarios o aprobaciones.

El informe mensual observado en Operaciones está persistido y disponible como artefacto; esta revisión no generó ni envió reportes a clientes.

## Cotizador público complementario

Estado: **productivo / no bloqueante para el contrato**.

- PR #181 fue mergeado el 2 de septiembre de 2026.
- PR #183, hardening responsive y de cobertura territorial, también fue mergeado el 2 de septiembre de 2026 (`4dacae91757d1f67d14a3ac443dded212a14fa0d`).
- La raíz `/` está disponible públicamente.
- Los 19 sectores KML de Vitacura son seleccionables.
- Sectores con evidencia suficiente usan muestra sectorial; los demás usan referencia general de Vitacura sin bajar el mínimo de cinco observaciones.
- No solicita nombre, email, teléfono ni dirección exacta.
- Se mantiene separado del Valorizador Profesional.

Detalle: `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md`.

## Seguridad y autorización

La revisión de funciones `SECURITY DEFINER` de mayor impacto confirmó guards internos para alcance, rol, estado y, donde corresponde, MFA/AAL2. No se amplió RLS para resolver problemas de UI.

PR #201 usa una RPC acotada para retornar sólo perfiles seller ya autorizados por el predicado central de alcance; la política `profiles` permanece self-only.

Pendiente administrativo no funcional: Supabase Auth mantiene desactivada la protección contra contraseñas filtradas. Debe activarse como hardening de cuenta si el plan/configuración del proyecto lo permite. No es una justificación para relajar controles de aplicación.

## Higiene de release

El 3 de septiembre se cerraron sin merge por estar superseded u obsoletos los PR #78, #79, #121, #140, #143, #144 y #184.

Razones principales:

- Reportin/canon inicial reemplazado por implementaciones posteriores;
- primeras capas houses/KML reemplazadas por el modelo actual;
- confiabilidad champion v5 ya materializada y evolucionada en producción;
- quality gate CBRS ya materializado en una versión posterior;
- propuesta PRC histórica sustituida por la capa productiva actual;
- documentación #184 congelada en un baseline de 44 casas y deployment anterior.

No se borró historia ni se reintrodujo código antiguo.

## Pendientes excluidos del cierre técnico

### UAT / aceptación cliente

- ejecutar los casos READY de `docs/UAT_PROPERTY_PARTNERS.md` con roles autorizados;
- confirmar suficiencia operacional de Mercado y nomenclatura territorial;
- completar un caso real de valorización punta a punta;
- revisar aprobación/emisión y PDF con CEO + MFA;
- validar vistas, métricas y reporte manual de Gestión;
- registrar PASS/FAIL/BLOCKED_EXTERNAL y defectos P0–P3;
- obtener aceptación por pilar o lista cerrada de correcciones.

### Dependencias cliente

- definiciones KPI pendientes;
- metas/umbrales/rankings que Property Partners aún no haya aprobado;
- calendario, audiencias y destinatarios finales de reportes;
- fuentes adicionales que el cliente determine como oficiales;
- aprobación funcional y capacitación.

Ninguna dependencia externa autoriza datos ficticios, reglas inventadas ni una falsa declaración de aceptación.

## Criterio de cierre

El estado correcto del producto es:

**PASS técnico / READY para UAT**.

No significa:

- aceptación comercial definitiva;
- UAT Property Partners completado;
- aprobación de reglas de negocio aún pendientes;
- autorización para enviar reportes sin destinatarios aprobados.

El cierre contractual final requiere UAT humano y acta de aceptación. Si PR #202 o cualquier otro cambio funcional entra a `main`, deben repetirse los gates de release y actualizarse aquí el SHA/deployment productivos antes de congelar el baseline final.
