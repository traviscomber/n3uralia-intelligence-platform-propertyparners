# Property Partners Intelligence Platform — Roadmap canónico

Actualizado: 2026-08-06

## Tesis operativa

El producto debe convertir datos canónicos en una cadena verificable:

`dato → señal → acción → responsable → decisión → resultado → informe`

No se agregan nuevas capacidades si la evidencia, los permisos, la trazabilidad o la experiencia base todavía no están cerrados.

## Estado consolidado

### Completado

- Vista CEO orientada a resultados, acciones, oficinas y período.
- Informes canónicos simplificados para selección de período, generación, apertura y descarga.
- Mercado, Propiedades, Metas, Control de gestión y Valorizaciones reducidos a datos y acciones.
- Navegación centralizada por rol y capacidad.
- Componentes base de workspace: shell, header, métricas, estados operativos y estado de datos.
- Adopción del sistema común en CEO, Mercado, Propiedades, Informes, Valorizaciones, Metas y Control.
- Valorizaciones sin mocks, con comparables evidenciados, workflow atómico, permisos y PDF preliminar marcado.
- Restricción inicial de RPC privilegiadas de Valorizaciones.
- Deployments productivos verificados en Vercel.

### En curso

- Auditoría completa de funciones SECURITY DEFINER y permisos RPC.
- Corrección de tablas expuestas sin política RLS explícita.
- Consolidación de rutas legacy y redirects.
- Formalización del modelo de autoridad, alcance y capacidad.

### Dependencias reales

- Existen publicaciones de mercado, pero no una cobertura suficiente de identidades confirmadas.
- No existen transacciones canónicas suficientes para validar inteligencia transaccional y absorción real.
- La prueba integral de Valorizaciones requiere una propiedad real, identidad confirmada y evidencia suficiente.
- La generación de informes necesita observabilidad de modelo, latencia, costo y versión de prompt.

## Bloque completado — Sistema común y verdad de datos

Objetivo: que todas las vistas compartan estructura y comuniquen claramente qué está respaldado por datos.

- [x] Registro canónico de navegación.
- [x] WorkspaceShell, WorkspaceHeader, MetricStrip y DataStatusBar.
- [x] Mercado adopta componentes comunes y muestra cobertura de identidad.
- [x] Propiedades adopta componentes comunes y muestra identidad/vigencia.
- [x] CEO adopta formalmente componentes comunes sin perder su composición ejecutiva.
- [x] Informes adopta DataStatusBar y estado documental.
- [x] Valorizaciones adopta DataStatusBar y preparación metodológica.
- [x] Metas adopta componentes comunes y muestra cobertura por entidad.
- [x] Control adopta componentes comunes y muestra integridad de importación.

Señal de cierre alcanzada: las vistas principales comparten encabezado, acciones, métricas, estados empty/error/loading y estado de datos sin depender de patrones visuales paralelos.

## Bloque actual — Seguridad e integridad global

Objetivo: reducir la superficie privilegiada y alinear frontend, API, RLS y RPC.

1. Auditar todas las funciones SECURITY DEFINER.
2. Revocar ejecución pública innecesaria.
3. Clasificar RPC como interna, autenticada o service-role.
4. Corregir `document_recipients` con política RLS explícita o retirar su exposición.
5. Habilitar protección de contraseñas filtradas.
6. Definir MFA obligatorio para CEO y administración.
7. Ejecutar nuevamente Security Advisor hasta eliminar hallazgos altos.

Señal de cierre: cero RPC privilegiadas anónimas, cero tablas expuestas sin política definida y modelo de autorización documentado.

## Bloque siguiente — Consolidación de rutas y flujos

Objetivo: una ruta canónica por trabajo.

1. Consolidar familias de Reportes.
2. Consolidar Fuentes de mercado, importación y propiedades.
3. Crear redirects permanentes desde rutas legacy.
4. Eliminar enlaces internos a destinos antiguos.
5. Añadir prueba automática de rutas duplicadas y navegación por rol.
6. Separar autoridad comercial, alcance y administración técnica.

Señal de cierre: cada tarea principal tiene un solo destino visible y verificable por rol.

## Bloque de datos — Identidad y evidencia

Objetivo: convertir publicaciones en un activo inmobiliario canónico.

1. Priorizar cola de propiedades sin identidad.
2. Definir criterios de confirmación y evidencia mínima.
3. Registrar fuente, fecha, dirección normalizada y vínculo de identidad.
4. Incorporar transacciones reales cuando exista una fuente autorizada.
5. Definir cobertura mínima por zona y tipo de propiedad.
6. Ejecutar primera Valorización real completa.
7. Generar primer informe integral basado únicamente en datos validados.

Señal de cierre: cobertura medible de identidad, al menos una valorización emitida con evidencia real y trazabilidad completa.

## Bloque de operación — Informes y proveedores

Objetivo: hacer confiables y medibles las operaciones costosas o lentas.

1. Registrar modelo real, prompt version, latencia, tokens y costo por informe.
2. Persistir estados queued, generating, validating, ready y failed.
3. Mostrar progreso de generación al usuario.
4. Implementar idempotencia por período y versión de datos.
5. Bloquear publicación con datos insuficientes.
6. Resolver el scraper incompatible con el runtime de Vercel o moverlo a un worker adecuado.
7. Añadir alertas para fallos de ingestión, informes y PDFs.

Señal de cierre: cada informe tiene trazabilidad técnica y de datos; no existen trabajos pesados sin estado persistido.

## Bloque visual — Cierre Ciclope

Objetivo: que el producto se perciba como un sistema único.

1. Formalizar el brandbook actual de Property Partners/N3uralia.
2. Eliminar el bridge de estilos legacy pantalla por pantalla.
3. Unificar tablas, filtros, formularios, acciones y estados.
4. Reemplazar el menú móvil basado en details por un drawer accesible.
5. Verificar desktop y móvil autenticados.
6. Ejecutar revisión de contraste, teclado, overflow y lectura rápida.

Señal de cierre: cero patrones visuales paralelos en los flujos principales y validación visual real en producción.

## Orden recomendado

1. Cerrar seguridad e integridad global.
2. Consolidar rutas y permisos.
3. Aumentar identidad y evidencia de datos.
4. Cerrar operación de informes y scrapers.
5. Ejecutar pulido visual final.

## Regla de planificación

Cada bloque se implementa en grupos de tres vistas o tres riesgos relacionados. No se inicia un bloque nuevo mientras queden hallazgos P0 abiertos en el anterior.
