# Registro de cierre técnico

Fecha de actualización: 2 de septiembre de 2026

## Alcance del cierre

Este documento consolida el estado técnico verificable de la plataforma Property Partners sobre el baseline productivo actual. La aceptación contractual final sigue siendo una actividad distinta y requiere UAT con usuarios Property Partners.

## Baseline validado

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`.
- Rama operativa: `main`.
- Producción: `https://ppartnersgroup.app`.
- Commit productivo verificado: `067870537c3e8b897f2f07359dd45b9776ea8095`.
- Deployment Vercel: `READY`.
- Errores runtime observados en las últimas 24 horas durante esta revisión: 0.

## Gate técnico confirmado

Sobre el baseline productivo se verificaron exitosamente los siguientes gates automatizados:

- `Contractual modules CI`: PASS.
- `Authenticated role QA`: PASS.
- `Authenticated visual QA`: PASS.
- `N3uralia IP Boundaries`: PASS.

Este estado reemplaza la nota histórica que mantenía el QA visual autenticado como diferido.

## Estado técnico

- Matriz central de capacidades y alcance aplicada a páginas y APIs críticas.
- RLS autenticada validada para los perfiles contemplados por el producto.
- Escrituras cruzadas entre oficinas bloqueadas.
- Flujos de valorización, tareas, correcciones, comparables y decisiones conectados.
- Aprobación y emisión de valorizaciones protegidas por rol y MFA/AAL2.
- Reporte imprimible con evidencia, snapshot e historial disponible.
- Configuración y destinatarios protegidos por capacidades específicas.
- Edición personal de `team` y `role` bloqueada.
- Regresiones reproducibles versionadas.
- Cola operativa de revisión live separada de la revisión histórica de duplicados.
- CTAs operativos de atención alineados a la cola correcta.
- Paquete contractual, manuales y plan UAT disponibles en `docs/`.

## Mejora complementaria candidata — Cotizador público

El PR `#181` agrega un cotizador público referencial como mejora complementaria para visitantes externos. No forma parte de los tres pilares contractuales ni modifica el Valorizador Profesional.

Candidato verificado:

- rama: `public-valuation-estimator-v1`;
- head funcional validado: `363eafff6358f5b67f5b5662775eb1f43b8b1740`;
- preview Vercel: `READY`;
- `N3uralia IP Boundaries`: PASS;
- `Contractual modules CI`: PASS;
- 28/28 tests de valorización PASS durante el build, incluyendo regresiones del estimador;
- `/dashboard` continúa protegido por sesión/rol;
- endpoint público limitado a agregados;
- no solicita ni persiste datos personales.

Cobertura observada en la validación: Club de Polo 6, La Llavería 7 y Santa María 11 observaciones utilizables. El piso mínimo de publicación es 5.

La metodología pública deriva UF/m² construido desde precio UF y superficie construida y publica mediana más rango intercuartil. No usa directamente el UF/m² histórico del feed cuando éste corresponde a otra definición de superficie.

Estado de esta mejora: **PASS técnico en preview / pendiente merge y verificación productiva**.

No debe utilizarse este PR para declarar UAT contractual completado ni para sustituir un caso real del Valorizador Profesional.

Detalle: `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md`.

## Pendientes excluidos del cierre técnico

### UAT / aceptación cliente

- validar con usuarios Property Partners la suficiencia operacional de los tres pilares;
- confirmar nomenclatura, filtros, barrios y lectura de inteligencia de mercado;
- ejecutar un caso real de valorización punta a punta con los roles correspondientes;
- revisar PDFs sobre casos reales de UAT;
- registrar PASS/FAIL/BLOCKED_EXTERNAL y defectos P0-P3;
- obtener aceptación por módulo o lista cerrada de correcciones.

### Definiciones de negocio externas

- diccionario KPI oficial;
- metas, umbrales y ranking definitivos;
- calendario, destinatarios y reglas finales de reportes;
- cualquier política o fuente adicional que Property Partners deba aprobar o proporcionar.

Estas dependencias no deben sustituirse por fixtures, datos inventados ni reglas inferidas presentadas como oficiales.

## Criterio de cierre técnico

El cierre técnico se considera PASS porque:

1. el baseline productivo tiene gates automatizados críticos verdes;
2. el deployment productivo está `READY`;
3. no se observaron errores runtime asociados al release durante la revisión;
4. las regresiones críticas están versionadas;
5. los pendientes externos están separados de los defectos técnicos;
6. el producto mantiene comportamiento fail-closed donde faltan definiciones de negocio.

La mejora pública del PR #181 no cambia este criterio: mientras no esté mergeada, se registra como candidato separado; si se incorpora al release final, el SHA resultante debe volver a pasar el gate técnico y la validación productiva.

## Restricciones de aceptación

Este documento sí declara el gate técnico automatizado como PASS, pero no declara:

- aceptación comercial definitiva;
- UAT Property Partners completado;
- aprobación de reglas de negocio aún no definidas;
- existencia de datos fuente que actualmente no estén disponibles;
- cotizador público PR #181 desplegado en producción antes de su merge y validación del SHA final.

## Siguiente gate

Ejecutar `docs/UAT_PROPERTY_PARTNERS.md` con Pedro Pablo y/o usuarios autorizados. Sólo después de esa ejecución corresponde cerrar defectos, repetir el gate técnico si hubo cambios y congelar el baseline final de entrega.

En paralelo, si se aprueba la incorporación del cotizador público, corresponde mergear PR #181, verificar el deployment productivo resultante y actualizar `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md` con el SHA definitivo.
