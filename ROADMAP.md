# Property Partners — Roadmap contractual de cierre

Última actualización: 2 de septiembre de 2026

## Objetivo

Cerrar y entregar la plataforma contractual de Property Partners sin ampliar alcance ni confundir mejoras complementarias con criterios de aceptación.

Los tres pilares contractuales siguen siendo:

1. Inteligencia de Mercado.
2. Valorización de Propiedades.
3. Control de Gestión y Automatización de Reportes.

Este documento es el roadmap operativo vigente. `docs/PRODUCT_ROADMAP.md` y otros roadmaps experimentales se mantienen sólo como referencia histórica.

## Estado ejecutivo actual

Producción: `https://ppartnersgroup.app`

Baseline productivo verificado:

- `main`: `4dacae91757d1f67d14a3ac443dded212a14fa0d`;
- Vercel deployment: `dpl_9CtkvZ3LXXtRms9a9RccPHkb5TH8`;
- estado: `READY`;
- QA visual desktop: PASS;
- QA visual móvil estrecho: PASS;
- `Contractual modules CI`: PASS;
- `N3uralia IP Boundaries`: PASS.

| Pilar | Estado técnico | Estado de cierre |
|---|---|---|
| Inteligencia de Mercado | PASS | Listo para UAT |
| Valorización de Propiedades | PASS | Listo para UAT |
| Control de Gestión + Reportes | PASS técnico | Listo para UAT; recurrencia depende de definiciones externas |

La plataforma está técnicamente preparada para UAT. La aceptación contractual definitiva sigue pendiente.

## Snapshot de mercado usado para el cierre técnico

Auditoría del 2 de septiembre de 2026:

- 44 casas activas en la fuente dedicada de Vitacura;
- 44/44 con barrio KML resoluble;
- 41/44 utilizables para cálculo UF/m² construido;
- 19 sectores KML canónicos disponibles en el cotizador público;
- muestra sectorial >=5: Santa María 12, La Llavería 7, Club de Polo 6.

Estos valores son snapshot de auditoría. No deben hardcodearse como invariantes de negocio.

---

## Fase 1 — Cierre técnico de los tres pilares — COMPLETADO

### Inteligencia de Mercado — PASS

Validado:

- fuentes y evidencia con procedencia;
- oferta activa separada de ventas CBRS;
- casas activas de Vitacura con territorialidad KML;
- listing live separado de identidad/property canónica;
- cola operativa live separada de revisión histórica de duplicados;
- UF/m² de casas derivado desde precio UF / superficie construida cuando corresponde;
- estados de dato faltante/frescura sin inventar valores;
- QA autenticado y responsive.

Pendiente únicamente de negocio:

- UAT de suficiencia operacional;
- validar nomenclatura, filtros, barrios y lectura con Property Partners.

### Valorización de Propiedades — PASS

Validado:

- identificación canónica de sujeto;
- flujo guiado;
- mínimo de 3 comparables seleccionados por humano;
- cálculo determinístico y trazable;
- revisión/devolución/corrección/reenvío;
- aprobación CEO con MFA/AAL2;
- snapshots históricos e integridad;
- emisión y PDF desde snapshot;
- historial y decisiones auditables.

Pendiente:

- caso UAT real punta a punta con usuarios Property Partners.

### Control de Gestión + Reportes — PASS técnico

Validado:

- métricas persistidas y reconciliación;
- scopes por rol;
- tareas y seguimiento;
- reportes desde snapshots persistidos;
- PDF y delivery trazable;
- retries/idempotencia;
- scheduling protegido;
- fail-closed cuando faltan definiciones aprobadas.

Dependencias externas pendientes:

- diccionario KPI oficial;
- metas y umbrales;
- reglas de ranking/alertas;
- calendario, periodicidad y destinatarios de reportes.

No inventar estas definiciones para declarar cierre.

---

## Fase 2 — Mejora complementaria pública — COMPLETADO

El cotizador público referencial para casas en Vitacura está productivo en `/` y documentado en `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md`.

Estado:

- 19 sectores KML seleccionables;
- sectores con >=5 observaciones utilizables: estimación sectorial;
- sectores con <5: referencia general de Vitacura claramente rotulada;
- mínimo de evidencia no se reduce;
- dormitorios/baños no degradan el cálculo cuando su cobertura es escasa;
- no se capturan datos personales;
- no se exponen listings crudos;
- no reemplaza el Valorizador Profesional;
- no amplía el alcance contractual.

PR #183 fue mergeado y verificado en producción dentro del baseline actual.

---

## Fase 3 — UAT Property Partners — SIGUIENTE GATE

Plan canónico: `docs/UAT_PROPERTY_PARTNERS.md`.

Ejecutar con usuarios autorizados.

### Mercado

- validar inventario actual;
- revisar casas en venta en Vitacura;
- validar barrios/KML;
- comparar oferta vs ventas CBRS;
- revisar fuentes, frescura y estados sin datos.

### Valorización

- crear caso real;
- seleccionar al menos 3 comparables;
- revisar cálculo y justificación;
- devolver y corregir;
- reenviar;
- aprobar con MFA;
- emitir;
- verificar PDF e historial.

### Gestión/Reportes

- validar visibilidad por rol;
- revisar métricas y procedencia;
- generar reporte manual;
- validar PDF;
- confirmar que recurrencia permanezca bloqueada si faltan definiciones;
- probar distribución sólo cuando existan destinatarios aprobados.

Criterio de salida:

- P0 = 0;
- P1 = 0;
- P2/P3 corregidos, aceptados o programados;
- resultado por pilar registrado;
- cualquier cambio de código vuelve a pasar gate técnico completo.

---

## Fase 4 — Definiciones del Cliente

Cerrar únicamente con evidencia formal:

1. diccionario KPI;
2. metas y umbrales;
3. reglas de ranking/desempate/alertas;
4. calendario de reportes;
5. destinatarios y responsables;
6. responsables de aceptación UAT;
7. políticas adicionales de privacidad/retención si aplican;
8. nuevas fuentes o integraciones aprobadas si aplican.

Mientras falten, las funciones dependientes permanecen fail-closed.

---

## Fase 5 — Capacitación y entrega documental

Documentación canónica de entrada: `docs/README.md`.

Antes de aceptación final debe confirmarse:

- manual de usuario por rol;
- manual de administración;
- seguridad/autorización;
- operación/QA y rollback;
- arquitectura y datos relevantes;
- metodología de valorización;
- procedimiento de mercado/reportes;
- registro de capacitación.

Capacitación mínima:

- CEO/administración;
- dirección/subdirección;
- partners/ejecutivos que operen mercado y valorización.

---

## Fase 6 — Paquete final y aceptación

Checklist final:

- baseline final de release identificado;
- `ppartnersgroup.app` estable;
- deployment `READY`;
- rollback disponible;
- P0/P1 = 0;
- UAT completado;
- manuales consolidados;
- capacitación registrada;
- dependencias externas separadas de defectos;
- acta/minuta de aceptación.

## Definición de DONE contractual

La plataforma se considera cerrada contractual y operacionalmente cuando:

1. los tres pilares mantienen gate técnico PASS;
2. no existen P0/P1 abiertos;
3. producción está estable;
4. UAT del Cliente está ejecutado;
5. documentación y capacitación están entregadas;
6. definiciones externas recibidas están aplicadas o quedan explícitamente registradas como pendientes fail-closed;
7. existe evidencia de aceptación/entrega.

## Orden de ejecución desde ahora

1. Ejecutar UAT con usuarios Property Partners.
2. Registrar hallazgos y separar defectos de dependencias externas.
3. Corregir cualquier P0/P1 y repetir gate técnico.
4. Incorporar definiciones KPI/reporting sólo cuando sean formalmente entregadas.
5. Ejecutar capacitación por rol.
6. Consolidar acta/minuta de aceptación.
7. Congelar y documentar el baseline final.