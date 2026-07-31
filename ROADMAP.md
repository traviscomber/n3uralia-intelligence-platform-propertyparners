# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026

## Objetivo

Completar estrictamente el alcance contratado para Property Partners mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

El resultado debe cumplir simultáneamente con autenticación, perfiles, permisos, consistencia de datos, integración entre módulos, dashboards por audiencia, reportes, trazabilidad y seguridad de acceso.

## Regla de ejecución

Este archivo es la fuente operativa única del proyecto.

Después de cada bloque de trabajo se debe:

1. actualizar tareas, porcentaje, evidencias, riesgos y siguiente bloque;
2. realizar commit en `main`;
3. verificar build y TypeScript;
4. confirmar deployment de Vercel en estado `READY`;
5. comprobar que no existan errores críticos de runtime;
6. informar el siguiente trabajo en formato `1 · 2 · 3`.

No se considera completada una tarea únicamente porque exista una interfaz. Deben estar conectados permisos, datos, navegación, operación y pruebas.

## Límites contractuales

### Incluido

- autenticación y perfiles;
- control de acceso por rol y alcance;
- inteligencia de mercado;
- valorización de propiedades;
- control de gestión comercial;
- dashboard CEO;
- dashboard de director y subdirector;
- dashboard personal de ejecutiva;
- metas, evolución, comparaciones, rankings y alertas;
- propiedades y asignaciones necesarias para operar los módulos;
- valorizaciones, comparables, revisión, aprobación y expediente;
- reportes y presentaciones por audiencia;
- integración y consistencia entre módulos;
- trazabilidad de fuentes, períodos y metodología.

### Excluido salvo aprobación formal

- CRM general fuera de los flujos contratados;
- facturación;
- mensajería omnicanal;
- automatizaciones externas no documentadas;
- workflows configurables avanzados;
- funcionalidades marcadas como Versión 2;
- métricas inventadas o proxies no identificados.

## Estado general

**Avance contractual estimado: 63%**

El porcentaje representa implementación técnica disponible y no reemplaza QA autenticado ni aceptación del cliente.

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | En ejecución | 25% |
| 2 | Flujo completo de ejecutiva | Parcialmente implementado | 55% |
| 3 | Director y subdirector | Avanzado parcialmente | 70% |
| 4 | CEO y consolidación ejecutiva | Avanzado | 94% |
| 5 | Integración transversal de módulos | Parcial | 50% |
| 6 | QA contractual, seguridad y aceptación | Inicial | 20% |

## Estado de producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama productiva: `main`
- Producción: `https://n3uralia-intelligence-platform.vercel.app`
- Supabase: `orfncinmhymhhoxbxgjb`
- Último núcleo agregado: `lib/access-control.ts`
- Commit del núcleo inicial: `d47c972d836d8a4cc19ace36ec49d727b75b0467`

---

# Bloque 1 — Perfiles, capacidades y alcance central

**Objetivo:** asegurar que navegación, páginas, APIs, reportes y operaciones utilicen una única definición de permisos y alcance.

**Estado: en ejecución — 25%**

## Completado

- [x] Definir roles canónicos: `ceo`, `admin`, `director`, `subdirector`, `seller`.
- [x] Crear matriz contractual de capacidades en `lib/access-control.ts`.
- [x] Separar alcance `global`, `office` y `self`.
- [x] Definir ruta inicial por rol.

## Pendiente

- [ ] Crear `getUserScope()` para resolver usuario, perfil, oficina, equipo y entidades visibles.
- [ ] Crear guards reutilizables para páginas del servidor.
- [ ] Crear guards reutilizables para APIs.
- [ ] Conectar el sidebar a la matriz de capacidades.
- [ ] Conectar `/dashboard` a la ruta inicial por perfil.
- [ ] Auditar rutas críticas que hoy sólo dependen de UI.
- [ ] Validar correspondencia entre alcance de aplicación y RLS.
- [ ] Crear pruebas unitarias de capacidades.
- [ ] Crear pruebas negativas entre roles.

## Criterio de cierre

- Todas las superficies consumen la misma matriz.
- Una URL manual no permite ampliar acceso.
- CEO ve alcance global.
- Director y subdirector ven únicamente su oficina.
- Ejecutiva ve únicamente información personal o asignada.
- Build, TypeScript y pruebas aprobados.

## Evidencias

- `lib/access-control.ts`
- `components/layout/sidebar.tsx`
- `app/dashboard/layout.tsx`
- políticas RLS relevantes en Supabase.

---

# Bloque 2 — Flujo completo de ejecutiva

**Objetivo:** permitir que una ejecutiva opere resultados, cartera y valorizaciones sin acceder a información ajena.

**Estado: parcialmente implementado — 55%**

## Disponible

- [x] Resumen personal.
- [x] Métricas personales canónicas.
- [x] Cartera asignada.
- [x] Creación de valorizaciones.
- [x] Comparables documentados.
- [x] Envío a revisión.
- [x] Reporte personal.

## Pendiente

- [ ] Aplicar `getUserScope()` en todas las consultas personales.
- [ ] Conectar propiedad asignada con nueva valorización.
- [ ] Mostrar estado e historial de cada valorización.
- [ ] Integrar observaciones de revisión en el expediente.
- [ ] Conectar tareas y alertas personales.
- [ ] Consolidar metas, MoM, YoY, seguimiento y conversión.
- [ ] Validar estados vacíos y errores recuperables.
- [ ] Ejecutar QA con una ejecutiva por oficina.

## Criterio de cierre

Una ejecutiva puede recorrer:

`propiedad asignada → valorización → comparables → revisión → corrección → expediente → seguimiento`

sin visualizar información de otra persona u oficina.

---

# Bloque 3 — Director y subdirector

**Objetivo:** permitir la gestión de oficina y equipo dentro del alcance asignado.

**Estado: avanzado parcialmente — 70%**

## Disponible

- [x] Dashboard de oficina.
- [x] Comparación canónica YoY.
- [x] Equipo y fichas individuales.
- [x] Tareas, comentarios e historial.
- [x] Asignación de propiedades por oficina.
- [x] Reporte imprimible.
- [x] Comparación con promedio de oficina.

## Pendiente

- [ ] Aplicar capacidades centrales en todas las rutas de dirección.
- [ ] Separar formalmente acciones de director y subdirector cuando corresponda.
- [ ] Conectar revisión de valorizaciones con ficha de ejecutiva.
- [ ] Conectar alertas con creación y seguimiento de tareas.
- [ ] Conectar metas y cumplimiento con responsables.
- [ ] Validar reportes exclusivamente por oficina.
- [ ] Ejecutar pruebas negativas entre oficinas.
- [ ] Completar QA autenticado con cuenta de dirección QA.

## Criterio de cierre

Dirección puede revisar resultados, equipo, cartera, valorizaciones, tareas y reportes de su oficina sin acceso a otra oficina.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Objetivo:** entregar al CEO una lectura consolidada y trazable desde el indicador hasta el responsable operativo.

**Estado: avanzado — 94%**

## Disponible

- [x] Dashboard CEO.
- [x] Resultados mensuales y acumulados.
- [x] Metas y cumplimiento.
- [x] MoM y YoY con bases 2025.
- [x] Evolución mensual.
- [x] Comparación de oficinas.
- [x] Ranking de ejecutivas.
- [x] Cartera y variación neta.
- [x] Alertas ejecutivas.
- [x] Centro de decisiones.
- [x] Detalle por oficina.
- [x] Presentación CEO.
- [x] Reporte imprimible.
- [x] Procedencia y metodología.

## Pendiente

- [ ] Aplicar capacidades centrales en páginas y APIs CEO.
- [ ] Conectar cada alerta con oficina, ejecutiva, tarea o valorización concreta.
- [ ] Conectar cola de decisiones con historial y responsable.
- [ ] Confirmar reglas oficiales de ranking y umbrales.
- [ ] Realizar QA visual autenticado con sesión CEO.
- [ ] Validar PDF final en navegador real.

## Nota de datos

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada. La variación neta de cartera no se presenta como captaciones.

## Criterio de cierre

El CEO puede pasar desde un indicador consolidado hasta su evidencia, oficina, responsable y acción pendiente.

---

# Bloque 5 — Integración transversal de módulos

**Objetivo:** asegurar que mercado, propiedades, valorización y control de gestión operen como una sola plataforma.

**Estado: parcial — 50%**

## Flujos obligatorios

- [ ] Mercado → comparable de valorización.
- [ ] Propiedad → asignación a ejecutiva.
- [ ] Propiedad asignada → caso de valorización.
- [ ] Valorización → revisión de dirección.
- [ ] Revisión → expediente y decisión.
- [ ] Alerta → tarea.
- [ ] Tarea → responsable, fecha y seguimiento.
- [ ] Resultados → reporte por audiencia.
- [ ] Reportes → fuente, período y metodología.

## Requisitos técnicos

- [ ] IDs estables entre módulos.
- [ ] Períodos consistentes.
- [ ] Entidades canónicas compartidas.
- [ ] Estados compatibles.
- [ ] Navegación contextual.
- [ ] Errores y vacíos explícitos.
- [ ] No duplicar métricas ni reglas de negocio.

## Criterio de cierre

Los tres módulos contratados comparten datos y contexto sin duplicaciones ni contradicciones.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Objetivo:** demostrar cumplimiento mediante pruebas reproducibles por perfil, módulo y requisito.

**Estado: inicial — 20%**

## Matriz QA mínima

- [ ] CEO.
- [ ] Director Lo Beltrán QA.
- [ ] Ejecutiva Lo Beltrán.
- [ ] Ejecutiva Nueva Costanera.
- [ ] Ejecutiva Santa María.
- [ ] Subdirector QA, cuando exista una definición autorizada.

## Pruebas obligatorias

- [ ] Login y ruta inicial.
- [ ] Navegación visible.
- [ ] Acceso permitido.
- [ ] Acceso denegado.
- [ ] Aislamiento entre oficinas.
- [ ] Aislamiento entre ejecutivas.
- [ ] Lectura de datos.
- [ ] Escrituras autorizadas.
- [ ] Escrituras bloqueadas.
- [ ] Valorización completa.
- [ ] Asignación de propiedades.
- [ ] Tareas y alertas.
- [ ] Reportes y PDF.
- [ ] Responsive.
- [ ] Accesibilidad básica.
- [ ] Build y TypeScript.
- [ ] Logs de producción.
- [ ] RLS.

## Entregables de aceptación

- [ ] Matriz requisito → funcionalidad → evidencia → estado.
- [ ] Registro de incidencias.
- [ ] Checklist de producción.
- [ ] Procedimiento de rollback.
- [ ] Manual de perfiles y permisos.
- [ ] Manual operativo básico.
- [ ] Inventario de fuentes y datos disponibles.

## Criterio de cierre

- No existen errores bloqueantes conocidos.
- Todas las pruebas críticas pasan.
- Producción está en `READY`.
- La documentación coincide con el sistema real.
- El cliente puede validar el alcance contratado de extremo a extremo.

---

# Riesgos activos

1. Algunas rutas todavía aplican permisos localmente y deben migrarse al núcleo central.
2. El sidebar no constituye por sí solo una protección de seguridad.
3. Debe verificarse la correspondencia completa entre lógica de aplicación y RLS.
4. Captaciones brutas no tiene fuente explícita separada.
5. Los umbrales ejecutivos derivados requieren validación de negocio.
6. No existe automatización de navegador autenticado en el entorno actual.
7. No se debe ampliar el alcance con funcionalidades de Versión 2.

# Salvaguardas

- No modificar cuentas reales sin instrucción explícita.
- No inventar datos, roles, oficinas o métricas.
- No presentar proxies como datos canónicos.
- No usar `service_role` como evidencia de RLS.
- No cerrar un bloque sin build y deployment verificados.
- No avanzar dejando producción en error.

# Bloque activo

## Bloque 1 — Perfiles, capacidades y alcance central

### Próximo trabajo 1 · 2 · 3

1. Crear `getUserScope()` y resolver alcance global, oficina o personal desde la sesión autenticada.
2. Crear guards reutilizables para páginas y APIs y aplicarlos primero a rutas críticas.
3. Conectar sidebar y ruta inicial a la matriz central, añadir pruebas y verificar producción.
