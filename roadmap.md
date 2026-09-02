# Roadmap contractual de entrega — Property Partners

**Versión:** 2 de septiembre de 2026  
**Fuente de verdad:** propuesta comercial, contrato final y `docs/CONTRACTUAL_SCOPE_MATRIX.md`.

## 1. Objetivo

Completar la Versión 1 comprometida para Property Partners con datos reales, trazabilidad, permisos por rol, pruebas reproducibles y operación documentada. La prioridad es cerrar requisitos contractuales; no ampliar el producto con funciones experimentales.

## 2. Reglas de alcance

1. El orden de trabajo se define por los requisitos contractuales `MKT`, `VAL`, `MGT`, `AUT` y `ARC`.
2. Un requisito sólo se declara completo cuando está implementado, probado en producción, documentado y respaldado por evidencia reproducible.
3. Cuando falta una fuente o definición oficial de Property Partners, el requisito se clasifica como `Pendiente Cliente`; la plataforma no inventa datos ni indicadores.
4. Las mejoras fuera de V1 requieren una orden de cambio aprobada.
5. Toda entrega debe terminar con CI aprobado, deployment `READY` y QA funcional autenticado.
6. Los datos recibidos se conservan con fuente, período, hash o referencia, reglas de transformación, filas aceptadas/rechazadas y responsable de aprobación.

## 3. Estado operativo de referencia

Corte verificado en producción el 2 de septiembre de 2026:

- oferta live de casas: 43 avisos;
- avisos live sin vínculo canónico: 32;
- casos de identidad revisables con evidencia: 2;
- casos live sin evidencia suficiente: 30;
- vínculo automático: desactivado;
- cola histórica de duplicados separada en Administración;
- alertas de Mercado enlazadas a la cola live correcta;
- deployment productivo del cierre de navegación: `35567d6e40695a64b9661310fa16256890b6ce66`, `READY`.

Estos conteos son operativos y pueden variar con nuevas ingestas. No sustituyen los criterios de aceptación.

## 4. Plan de cierre contractual

### Hito 1 — Identidad y base única

**Requisitos:** `MKT-03`, `MKT-06`, `MKT-07`, `MKT-08`.

**Trabajo N3uralia**

- probar confirmación, rechazo y componente duplicado con casos reales;
- verificar MFA2, auditoría, permisos y evidencia;
- ejecutar una nueva ingestión y comprobar que las decisiones sobreviven;
- medir cobertura, precisión, rechazos y reincidencias;
- mantener separadas la cola `listing live ↔ property` y la revisión histórica `property ↔ property`;
- documentar el procedimiento de revisión.

**Datos útiles de Property Partners**

| Prioridad | Dato | Formato preferido | Finalidad |
|---|---|---|---|
| Alta | Identificador interno y URL Portal de propiedades conocidas | XLSX/CSV | Vincular publicación con propiedad |
| Alta | Dirección completa, número y unidad | XLSX/CSV | Resolver identidad y contradicciones |
| Alta | ROL cuando exista | XLSX/CSV | Evidencia fuerte de identidad |
| Alta | Tipo, dormitorios, baños y superficies | XLSX/CSV | Validar candidatos |
| Media | Coordenadas verificadas | XLSX/CSV/KML | Identidad y territorio |
| Media | Historial de publicación y cambios de precio | XLSX/CSV | Historial y días en mercado |

**Gate de aceptación**

- una confirmación, un rechazo y un componente duplicado probados end-to-end;
- decisiones persistentes después de reingesta;
- cero asociación automática sin evidencia;
- evidencia reproducible de cobertura y precisión del universo aprobado.

### Hito 2 — Territorio oficial

**Requisito:** `MKT-04`.

**Trabajo N3uralia**

- contrastar propiedades y avisos contra el KML oficial;
- clasificar asignación única, ambigua, fuera de polígono y sin coordenadas;
- verificar que barrio y microbarrio se propaguen a búsqueda, comparables e inteligencia;
- publicar cobertura y excepciones sin forzar asignaciones.

**Datos útiles de Property Partners**

| Prioridad | Dato | Formato preferido | Finalidad |
|---|---|---|---|
| Alta | KML oficial vigente y fecha de vigencia | KML/KMZ | Fuente territorial canónica |
| Alta | Tabla de nombres y alias de barrios | XLSX/CSV | Normalización |
| Media | Decisión humana para excepciones | XLSX/CSV | Cerrar casos ambiguos |
| Media | Responsable que aprueba cambios territoriales | Nombre y rol | Gobernanza |

**Gate de aceptación**

- cobertura calculada contra el archivo oficial;
- excepciones visibles y trazables;
- muestra real validada por Property Partners;
- ninguna asignación territorial sin evidencia suficiente.

### Hito 3 — Comparables y valorización

**Requisitos:** `MKT-09`, `VAL-01` a `VAL-09`.

**Trabajo N3uralia**

- completar un expediente real con exactamente tres comparables aceptados;
- conservar comparables incluidos, excluidos, ajustes y justificación;
- verificar rango y valor sugerido;
- probar seller → revisión → devolución → reenvío → aprobación CEO AAL2 → emisión;
- verificar snapshot, versión, decisiones e informe exportable.

**Datos útiles de Property Partners**

| Prioridad | Dato | Formato preferido | Finalidad |
|---|---|---|---|
| Alta | Caso real de aceptación | Ficha/XLSX | UAT del valorizador |
| Alta | Tres o más comparables revisados por un profesional | XLSX/CSV | Validación de selección |
| Alta | Criterios profesionales de ajuste | Documento/XLSX | Aprobar metodología |
| Alta | Usuarios autorizados para seller, director y CEO | Lista de cuentas y roles | Probar workflow |
| Media | Texto y formato esperado del informe | PDF/DOCX de referencia | Validación editorial |

**Gate de aceptación**

- expediente real emitido;
- exactamente tres comparables aceptados;
- historial completo e inmutable;
- permisos y MFA2 verificados;
- informe consistente con el expediente.

### Hito 4 — Inteligencia de mercado

**Requisitos:** `MKT-01`, `MKT-02`, `MKT-05`, `MKT-10` a `MKT-15`.

**Trabajo N3uralia**

- cerrar ingestión y normalización de Portal y CBRS;
- reconciliar inventario y ventas por período comparable;
- publicar estadísticas, velocidad, absorción, oferta versus ventas y evolución sólo cuando exista evidencia suficiente;
- verificar paridad de CSV, XLSX y PDF con los datos visibles.

**Datos útiles de Property Partners**

| Prioridad | Dato | Formato preferido | Finalidad |
|---|---|---|---|
| Alta | Archivo CBRS oficial y corte | XLSX/CSV | Ventas registrales |
| Alta | Fuente oficial de ventas recientes | XLSX/CSV | Actividad posterior al corte CBRS |
| Alta | Periodicidad acordada de actualización | Definición aprobada | Operación recurrente |
| Media | Historial Portal o snapshots sucesivos | XLSX/CSV | Evolución y días en mercado |
| Media | Reglas para considerar una venta confirmada | Documento breve | Metodología |

**Gate de aceptación**

- cada indicador muestra fuente, período y metodología;
- métricas no evaluables permanecen como `Sin datos operativos`;
- exportaciones coinciden con la interfaz;
- dependencias no entregadas quedan registradas como `Pendiente Cliente`.

### Hito 5 — Control de gestión por rol

**Requisitos:** `MGT-01` a `MGT-14`, `ARC-04`, `ARC-05`.

**Trabajo N3uralia**

- completar dashboards CEO, dirección/subdirección y partner/agente;
- validar RLS global, oficina y personal con cuentas reales;
- activar únicamente KPI, metas, conversiones, rankings y alertas formalmente definidos;
- probar aislamiento cruzado entre oficinas y personas.

**Datos y definiciones útiles de Property Partners**

| Prioridad | Definición o dato | Finalidad |
|---|---|---|
| Alta | Estructura oficial de oficinas, equipos y responsables | Alcance y permisos |
| Alta | Cuentas reales para cada rol | QA autenticado |
| Alta | Captaciones brutas y fuente | KPI contractual |
| Alta | Ventas y seguimiento mensual | Dashboard operativo |
| Alta | Fórmula de conversión | KPI contractual |
| Alta | Metas por entidad y período | Cumplimiento |
| Alta | Umbrales, severidad y responsable de alertas | Alertas |
| Media | Regla de productividad | KPI |
| Media | Regla de ranking y desempates | Ranking |

**Gate de aceptación**

- pruebas con CEO, director, subdirector y agente;
- ninguna filtración entre alcances;
- KPI vivos respaldados por valores aprobados;
- toda ausencia de definición declarada como `Pendiente Cliente`.

### Hito 6 — Automatización, documentación y transferencia

**Requisitos:** `AUT-01` a `AUT-06`, `ARC-08` a `ARC-15`.

**Trabajo N3uralia**

- verificar dashboard responsive y accesible;
- cerrar presentaciones y reportes periódicos incluidos;
- probar cron, entrega, fallo, reintento y destinatarios;
- actualizar modelo, diccionario, manuales y runbook;
- ejecutar restauración y reconstrucción por un tercero;
- congelar versión, tag, checksums y paquete de transferencia;
- realizar capacitación y acta de aceptación.

**Datos y decisiones útiles de Property Partners**

| Prioridad | Dato o decisión | Finalidad |
|---|---|---|
| Alta | Destinatarios y periodicidad de reportes | Automatización |
| Alta | Aprobación del formato ejecutivo y por oficina | Presentaciones |
| Alta | Administrador receptor | Transferencia |
| Alta | Asistentes y fecha de capacitación | Cierre |
| Alta | Responsables de aceptación por módulo | Firma UAT |

**Gate de aceptación**

- reporte real entregado y trazado;
- documentación reproducible;
- restauración o reconstrucción probada;
- capacitación ejecutada;
- paquete final y acta de aceptación completados.

## 5. Orden obligatorio de ejecución

1. Identidad y base única.
2. Territorio oficial.
3. Comparables y valorización.
4. Inteligencia de mercado.
5. Control de gestión por rol.
6. Automatización, documentación y transferencia.

Un hito puede preparar componentes del siguiente, pero no se declara cerrado sin superar su gate de aceptación.

## 6. Próxima ejecución

La siguiente sesión debe cerrar el UAT de identidad:

1. seleccionar tres casos reversibles y representativos;
2. registrar evidencia antes de decidir;
3. confirmar un candidato;
4. rechazar un candidato;
5. vincular un componente duplicado;
6. ejecutar o esperar la siguiente ingestión;
7. comprobar persistencia, auditoría, conteos y ausencia de reincidencia;
8. adjuntar evidencia al requisito `MKT-03/MKT-08`.

## 7. Definition of Done

Un requisito contractual queda `Completo` únicamente cuando:

- funciona con datos reales o declara claramente una dependencia del Cliente;
- conserva fuente, período, metodología y versión;
- respeta permisos en UI, servidor y RLS;
- posee prueba reproducible y evidencia;
- no depende de una capacidad fuera de V1;
- está documentado para operación, soporte y transferencia;
- CI está aprobado;
- el deployment correspondiente está `READY`;
- el responsable de aceptación de Property Partners puede validarlo.
