# Matriz canónica de alcance y cumplimiento

Última verificación técnica: 1 de agosto de 2026.

## Jerarquía documental

El cumplimiento se evalúa, en este orden, contra:

1. contrato de servicios tecnológicos FINAL v3;
2. Anexo Comercial y Alcance Funcional;
3. órdenes de cambio aprobadas por ambas partes;
4. evidencia técnica de la versión productiva.

Los porcentajes históricos, roadmaps y presentaciones de avance no sustituyen esta matriz.

## Estados permitidos

- **Completo**: implementado, autorizado, probado y documentado con evidencia reproducible.
- **Parcial**: existe una implementación útil, pero falta una parte del requisito o su prueba final.
- **Sólo estructura**: existen tablas, rutas o componentes, pero no un flujo operacional completo.
- **Pendiente Cliente**: requiere una fuente, definición o aprobación que no ha sido entregada formalmente.
- **Pendiente**: no existe una implementación suficiente.
- **Fuera de V1**: capacidad experimental no exigida por el alcance vigente.

## Módulo I — Inteligencia de Mercado

| ID | Requisito canónico | Estado verificado | Evidencia técnica | Gap o dependencia |
|---|---|---|---|---|
| MKT-01 | Integración CBRS | Parcial | `/api/market/import`, normalizador CBRS, RPC `ingest_cbrs_transaction_snapshot`, raw records y ejecuciones | La operación depende de archivos o payloads autorizados; no existe conexión automática demostrada con el proveedor |
| MKT-02 | Oferta Portal Inmobiliario | Parcial | Importación de snapshots, RPC `ingest_portal_listing_snapshot`, captura viva separada y sin escrituras | La captura viva es una muestra manual de validación y no una integración productiva automática |
| MKT-03 | Deduplicación e identidad de propiedad | Parcial | `market_properties`, `market_property_matches`, estados de identidad y reconciliación | Falta demostrar cobertura y precisión con un universo de aceptación aprobado |
| MKT-04 | Barrios y microbarrios KML | Parcial | Modelo territorial, `neighborhood_id`, importación con fuente `kml` y control de faltantes | Falta evidencia final de carga, excepciones y cobertura contra el archivo oficial del Cliente |
| MKT-05 | Ventas recientes adicionales | Pendiente Cliente | Pipeline acepta fuente `client` y transacciones normalizadas | Falta fuente y periodicidad oficial entregada por el Cliente |
| MKT-06 | Normalización | Parcial | Esquema canónico, validaciones, filas aceptadas/rechazadas, raw payload y metodología | Falta cierre de reglas por cada fuente real y prueba con archivos finales |
| MKT-07 | Historial de propiedades y publicaciones | Parcial | Observaciones, publicaciones actuales, fechas de primera/última observación y estado removido | Falta aceptación del historial completo de cambios de precio y estado |
| MKT-08 | Base única propiedad–publicación–transacción | Parcial | Relaciones `property_id` en listings y transacciones; propiedad canónica separada | Las identidades candidatas requieren conciliación humana antes de considerarse definitivas |
| MKT-09 | Selección de comparables | Parcial | `valuation_candidate_pool`, comparables persistidos, similitud, distancia y decisión | Falta prueba E2E con datos reales y reglas de selección aprobadas |
| MKT-10 | Estadísticas de mercado | Parcial | Snapshots con inventario, ventas, mediana de días, absorción y oferta/ventas | Los indicadores permanecen `n/d` cuando no existe evidencia conciliada del mismo período |
| MKT-11 | Velocidad de venta | Parcial | Campo y presentación operacional con control de ausencia | Requiere ventas confirmadas vinculadas y período suficiente |
| MKT-12 | Absorción | Parcial | Campo y presentación operacional con metodología visible | Requiere inventario y ventas conciliados para el mismo período |
| MKT-13 | Oferta versus ventas | Parcial | `offer_to_sales_ratio` en snapshots canónicos | Falta serie temporal aceptada con cobertura suficiente |
| MKT-14 | Evolución histórica | Parcial | Snapshots por período y fechas observadas | Falta aceptación de continuidad y cortes históricos finales |
| MKT-15 | Exportación CSV/XLSX/PDF | Completo en bloque 1–3 | `/api/market/export`, `/dashboard/market/export` y acciones en la vista de mercado | Debe mantenerse la paridad entre exportación y datos visibles en cada release |

## Módulo II — Valorización de Propiedades

| ID | Requisito canónico | Estado verificado | Evidencia técnica | Gap o dependencia |
|---|---|---|---|---|
| VAL-01 | Variables objetivas del sujeto | Completo en bloque 1–3 | Formulario y persistencia de dirección, barrio, área homogénea, ROL, coordenadas, superficies y características | Requiere QA funcional autenticado con un caso reversible |
| VAL-02 | Variables subjetivas | Completo | Ocho factores configurables, límites agregados y persistencia versionada | Los criterios profesionales deben ser aprobados por el responsable del Cliente |
| VAL-03 | Comparables utilizados | Completo en bloque 1–3 | Fuente, referencia, fecha, distancia, atributos, precio, UF/m², similitud, selección, exclusión y ajuste | Requiere QA con comparables de Portal y CBRS conciliados |
| VAL-04 | Valor comercial sugerido | Completo | Mediana ponderada por similitud, superficie efectiva y ajuste cualitativo | Resultado orientativo sujeto a aprobación humana |
| VAL-05 | Rango de valorización | Completo | Valor inferior, central y superior persistidos y visibles | La banda vigente es metodológica y debe conservar versión |
| VAL-06 | Ajustes efectuados | Completo | Ajuste por comparable, factores cualitativos, actor, estado y evidencia | Requiere recorrido de aceptación con usuario autorizado |
| VAL-07 | Justificación | Completo | Justificación calculada y texto profesional persistido en expediente y versión | Requiere validación editorial del Cliente |
| VAL-08 | Informe exportable | Completo | Vista imprimible/PDF con resultado, ficha, comparables, decisiones y metodología | DOCX no se considera cerrado mientras no exista salida verificada equivalente |
| VAL-09 | Historial de versiones y decisiones | Completo | `valuation_case_versions`, `valuation_decision_log` y estados de workflow | Requiere prueba E2E final de devolución, corrección, reenvío, aprobación y emisión |

## Módulo III — Control de Gestión Comercial

| ID | Requisito canónico | Estado verificado | Evidencia técnica | Gap o dependencia |
|---|---|---|---|---|
| MGT-01 | Dashboard CEO | Parcial, bloque 4–6 | El resumen conserva fallback documental y reemplaza cada KPI equivalente sólo desde `management_approved_metric_values`; incluye procedencia, período, conciliación y versión | Producción aún no contiene valores persistidos aprobados; por eso los KPI visibles continúan en el corte documental 2026 |
| MGT-02 | Dashboard dirección | Parcial, bloque 4–6 | Oficina, equipo, tareas, valorizaciones y asignaciones con RLS; `can_access_management_entity` reconoce oficina por nombre y descendientes | Se verificó la política mediante JWT simulado para el director existente; falta ejecución del workflow con login real y prueba cruzada completa |
| MGT-03 | Dashboard subdirección | Parcial | Comparte capacidades y alcance de oficina; existe caso en matriz de rutas y runner autenticado de QA | No existe perfil subdirector productivo para ejecutar aceptación real; falta aprobación explícita de equivalencia funcional |
| MGT-04 | Dashboard partner/ejecutiva | Parcial, bloque 4–6 | Métricas, propiedades, valorizaciones y tareas propias; el overlay admite una entidad persistida vinculada aunque no exista ficha documental coincidente | Falta una serie aprobada de métricas vivas y QA con todas las cuentas reales autorizadas |
| MGT-05 | Captaciones brutas | Pendiente Cliente | El dashboard sólo presenta captaciones desde la métrica aprobada `listings` y no sustituye por stock o variación neta | Falta definición y fuente separada oficial |
| MGT-06 | Ventas | Parcial | Valores, metas, UF, acumulados y comparación canónica; preparado para valores aprobados persistidos | Falta ingestión operacional periódica y reconciliación desde la fuente comercial oficial |
| MGT-07 | Seguimiento | Parcial | Diccionario y motor canónico, tareas persistentes y sustitución desde valores aprobados | Falta fuente viva aprobada y continuidad mensual |
| MGT-08 | Conversión | Parcial | Fórmulas versionadas, estado no evaluable y valor aprobado cuando exista | Falta definición oficial de numerador, denominador, cohorte y universo operacional |
| MGT-09 | Productividad | Pendiente Cliente | Existe definición técnica, pero no se declara KPI oficial ni se publica sin aprobación | Falta fórmula, ponderación, alcance y aprobación |
| MGT-10 | Cumplimiento de metas | Parcial | Valor y meta se vinculan por entidad, métrica y período; sólo se usa una meta aprobada | Producción no contiene metas aprobadas y falta mantenimiento operacional |
| MGT-11 | Variación MoM | Parcial | El overlay calcula variación desde el período aprobado anterior y mantiene fallback documental | Falta serie mensual aprobada y política para períodos incompletos |
| MGT-12 | Variación YoY | Parcial | El overlay busca período aprobado equivalente del año anterior; fallback recalculado desde bases documentales | Falta continuidad operacional de al menos dos años comparables |
| MGT-13 | Rankings | Pendiente Cliente | Existen ordenamientos de apoyo marcados como provisionales | Falta regla oficial, desempates, vigencia y aprobación |
| MGT-14 | Alertas | Pendiente Cliente | Existen reglas versionables, evaluación persistida y alertas derivadas | Falta umbral, severidad, escalamiento y responsable oficiales |

## Automatizaciones

| ID | Requisito canónico | Estado verificado | Evidencia técnica | Gap o dependencia |
|---|---|---|---|---|
| AUT-01 | Dashboard interactivo | Parcial | Vistas por rol, filtros, navegación, datos con procedencia y workflow manual de QA autenticada | Falta ejecutar y aprobar QA visual, responsive, accesibilidad y RLS con credenciales autorizadas |
| AUT-02 | Presentación ejecutiva | Parcial | Vista de presentación y reportes web estructurados | PowerPoint y archivo editorial final no están verificados |
| AUT-03 | Presentación por oficina | Parcial | Reporte/vista de dirección por alcance | Falta archivo final generado y registrado |
| AUT-04 | Indicadores mensuales | Parcial, bloque 4–6 | El dashboard puede sustituir KPI documentales por valores mensuales reconciliados y aprobados | No existen valores aprobados ni pipeline mensual activo en producción |
| AUT-05 | Indicadores acumulados | Parcial | YTD y comparación anual disponibles para el corte documental | Falta serie persistida acumulada y continuidad automática |
| AUT-06 | Reportes periódicos | Sólo estructura reforzada | Cron y recuperación manual idempotente, schedules, report runs y distribuciones `pending` | `CRON_SECRET` productivo no está verificado; falta proveedor de correo, reintentos, entrega/fallo y evidencia de destinatario |

## Arquitectura y transferencia

| ID | Requisito canónico | Estado verificado | Evidencia técnica | Gap o dependencia |
|---|---|---|---|---|
| ARC-01 | PostgreSQL o equivalente | Completo | Supabase PostgreSQL, migraciones y esquema productivo |
| ARC-02 | ETL | Parcial | Pipelines canónicos con raw records, validación y ejecuciones | Falta automatización de todas las fuentes contractuales |
| ARC-03 | APIs | Parcial | Rutas de mercado, valorización, gestión, reportes y administración | Falta inventario contractual final y pruebas negativas completas |
| ARC-04 | Autenticación | Completo | Supabase Auth y guards de sesión |
| ARC-05 | Perfiles y permisos | Parcial, bloque 4–6 | Guards, RLS, vistas `security_invoker`, privilegios de vistas restringidos y alcance global/oficina/personal; SQL simulado verificó director y seller existentes | Falta workflow autenticado con cuentas reales, subdirección y aislamiento cruzado completo |
| ARC-06 | Infraestructura cloud | Completo | Vercel, Supabase y repositorio privado conectados |
| ARC-07 | Repositorio Git | Completo | Historial, PR, CI y deployments trazables |
| ARC-08 | Scripts de instalación | Parcial, bloque 4–6 | Runbook con lockfile, variables, migraciones, despliegue, recuperación y checklist limpio | Falta que un tercero ejecute y documente la reconstrucción desde cero |
| ARC-09 | Modelo y diccionario de datos | Completo en bloque 4–6 | Diagrama ER, diccionario de tablas, vistas, estados y funciones contrastado con producción | Debe actualizarse con cada migración contractual |
| ARC-10 | Documentación técnica | Parcial, bloque 4–6 | README, matriz, runbook, modelo, seguridad, migraciones y manifiesto de transferencia | Falta congelar el paquete final contra un commit/tag de entrega y ejecutar la prueba independiente |
| ARC-11 | Documentación funcional | Parcial, bloque 4–6 | Manual por rol, límites de datos, flujos, errores y excepciones operativas | Requiere revisión editorial y aceptación del Cliente |
| ARC-12 | Manual de usuario | Parcial, bloque 4–6 | `docs/manuals/ROLE_USER_MANUAL.md` cubre CEO, dirección/subdirección, partner, mercado, valorización y reportes | Falta capacitación, prueba con usuarios y acta de aceptación |
| ARC-13 | Manual de administración | Parcial, bloque 4–6 | `docs/manuals/ADMINISTRATION_MANUAL.md` cubre usuarios, entidades, fuentes, métricas, cron, secretos, backup, release e incidentes | Falta ejercicio operativo de recuperación y aprobación del administrador receptor |
| ARC-14 | Capacitación | Pendiente | El manifiesto define sesiones y registro requerido | Requiere sesión, material final, asistentes y aceptación |
| ARC-15 | ZIP y transferencia completa | Pendiente | Manifiesto de contenido, checksums, accesos, UAT y rotación disponible | Falta generar paquete final, transferir accesos, ejecutar despliegue independiente y obtener firma |

## Seguridad operacional del bloque 4–6

- Las vistas contractuales activas conservan `security_invoker=true`.
- Se revocaron todos los privilegios de `anon` sobre esas vistas.
- `authenticated` conserva únicamente `SELECT`.
- `can_access_management_entity` reconoce la oficina raíz por nombre normalizado y mantiene descendientes dentro del alcance.
- Las funciones privilegiadas conservan `search_path` fijo y `EXECUTE` sólo para `authenticated` y `service_role`.

## Fuera de Versión 1

No forman parte de los criterios de aceptación vigentes:

- copilotos por rol;
- casos ejecutivos experimentales;
- grafos de decisión;
- razonamiento avanzado;
- ML Lab;
- memoria o conocimiento corporativo experimental;
- automatizaciones no descritas en el contrato o anexo.

## Definition of Done contractual

Un requisito sólo se marca **Completo** cuando:

- opera con datos reales o declara de forma inequívoca la dependencia pendiente;
- conserva fuente, período, metodología y versión;
- respeta permisos en interfaz, servidor y RLS;
- tiene una prueba reproducible y evidencia de resultado;
- no depende de una capacidad fuera de V1;
- está documentado para operación, soporte y transferencia;
- CI está aprobado y el deployment correspondiente está `READY`.
