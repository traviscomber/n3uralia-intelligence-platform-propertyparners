# Contrato de inteligencia CRM Vitacura

## Alcance obligatorio

- Comuna: Vitacura.
- Operacion: Venta.
- Tipos: Casa y Departamento.
- Arriendos, propiedades rentadas, terrenos y duplex quedan fuera del KPI publicado.
- Los XLS originales son inmutables. La aplicacion consume solo agregados sin PII de clientes.

## Fuentes y granularidad

| Dataset | Grano canonico | Naturaleza |
| --- | --- | --- |
| Ventas / cierres | `Operacion - Id` | Evento |
| Captadas | `Propiedad - Id` | Evento mensual |
| Leads del mes | `Lead - Id` | Evento mensual |
| Requerimientos online | `Requerimiento - Id` | Evento mensual |
| Agendamientos de visita | `Visita - Id` | Evento mensual; puede repetirse en filas de detalle y contiene estados pendiente, cancelada, realizada, confirmada, rechazada u orden enviada |
| Suspendidas | `Propiedad - Id` | Evento mensual |
| Total cartera | `Propiedad - Id` | Snapshot al corte |
| Leads activos / clasificados / sin gestion | `Lead - Id` | Snapshot al corte; nunca se suma como flujo mensual |

## Reglas de publicacion

1. Leer la hoja `Data` cuando existe; las tablas pivot no son fuente operacional.
2. Exigir el identificador canonico de la entidad.
3. Aplicar el alcance Vitacura, Venta, Casa/Departamento.
4. Deduplicar dentro de cada archivo por ID canonico.
5. Deduplicar nuevamente entre periodos para los acumulados YTD de ventas, captaciones, leads, requerimientos y visitas.
6. Mantener filas sin ID en cuarentena y reportar su cantidad.
7. Representar archivos o periodos faltantes con `null`, nunca con cero.
8. Una conversion causal solo se publica cuando existe una llave trazable entre etapas.
9. `ventas / leads nuevos del mismo mes` se etiqueta como proxy, no como conversion de cohorte.
10. Metas se leen exclusivamente de los tres libros versionados de Metas 2026. Comisiones y tiempos de venta permanecen sin dato hasta contar con su fuente validada.
11. La cobertura de fuentes es datasets mensuales presentes dividido por datasets mensuales esperados. No es un puntaje subjetivo; duplicados, exclusiones y filas malformadas se informan por separado.
12. Los archivos de leads sin gestion de 15 y 90 dias son grupos disjuntos: la cola mayor a 15 dias es la suma de ambos.
13. El cierre mensual es autoritativo frente al informe quincenal. La quincena se conserva para auditoria de deriva, no se suma al mes.
14. `Agendamientos` cuenta todos los `Visita - Id` unicos; `visitas realizadas` cuenta solo registros cuyo estado es `Realizada`.
15. El ranking individual usa `Propiedad - Agente` y se etiqueta como lado captador. No se equipara al vendedor del cierre.
16. Cada dataset mensual debe contener sus columnas minimas obligatorias; el verificador bloquea la publicacion si falta alguna.
17. Cada XLS se identifica por SHA-256 binario y cada hoja por un digest reproducible de direccion, valor, formula, tipo, formato, estilo, comentario e hipervinculo.
18. La auditoria cubre todas las hojas y celdas almacenadas, incluso las que no alimentan KPI. La aplicacion publica conteos y huellas, nunca valores crudos ni PII.
19. Los snapshots incompletos no producen tasas. Si falta una de las bases necesarias o una cola supera el universo activo, la tasa se publica como `null`.

## Reconciliacion vigente

### Primer semestre 2026

- 34 ventas validas.
- UF 643.670 vendidas.
- 193 captaciones.
- 1.988 leads nuevos.
- 3.470 requerimientos.
- 1.591 agendamientos unicos en los cinco meses disponibles, luego de deduplicar 8 IDs reagendados entre cortes mensuales.
- 979 visitas realizadas en esos cinco meses, equivalentes al 61,5% de los agendamientos conocidos.
- Visitas semestrales: sin dato por ausencia del archivo de febrero.
- Cartera comparable: 386 propiedades en el primer corte y 351 en junio.

### Linea base 2025

- 61 ventas validas en el ano.
- 30 ventas durante enero-junio.
- UF 919.970 vendidas en el ano.
- 4.023 leads nuevos.
- 4.594 requerimientos dentro del alcance.
- 3.619 agendamientos unicos; 2.252 figuran como realizados.

## Incidencias conocidas

- Febrero 2026 no incluye archivo de visitas.
- Febrero y el corte quincenal de abril incluyen registros de arriendo, que se excluyen.
- Cierres de junio incluye 13 filas auxiliares sin `Operacion - Id`; se ponen en cuarentena.
- Ocho `Visita - Id` aparecen en dos meses por reagendamiento; el acumulado conocido se deduplica globalmente.
- `total_cartera_cierre_2025.xlsx` contiene 331 celdas con error de formula. Esas celdas no alimentan los KPI publicados y la fuente original permanece inmutable.
- Tres fuentes 2025 contienen siete columnas auxiliares sin encabezado. No hay encabezados normalizados duplicados y ninguna columna obligatoria del KPI esta ausente.
- Los snapshots de clasificacion no siempre cubren el 100% de los leads activos exportados.
- En junio hay 596 leads sin gestion entre 15 y 90 dias y 505 sobre 90 dias: 1.101 en total, equivalentes al 62,2% de los 1.770 activos.
- El corte quincenal de abril contiene 1 venta, 1 captacion dentro de alcance y 58 leads que no aparecen al cierre mensual. Esto se registra como deriva de snapshot; no se mezcla con el cierre.
- Las colas sin gestion del corte quincenal de abril suman 3.939 registros frente a 3.671 activos y no existe archivo sin clasificar. Sus tasas se mantienen como `null`; los conteos fuente quedan visibles para auditoria.
- El vendedor esta identificado en 33 de 34 cierres de 2026 (97,1%), pero los encabezados y nombres no usan una identidad canonica estable. El ranking actual se etiqueta como agente captador de la propiedad y no como vendedor.

## Cobertura exhaustiva

- 84 libros XLS.
- 92 hojas.
- 1.209.831 celdas almacenadas.
- 1.208.765 celdas con valor o formula.
- 717 celdas con formula.
- 331 celdas con error de formula, preservadas como incidencia de origen.
- 13 familias semanticas de datos, desde ventas y captaciones hasta snapshots de gestion de leads.

`data/crm-cell-manifest.json` contiene solo metadatos, conteos y hashes. Permite demostrar que ninguna hoja o celda cambio sin incorporar nombres, RUT, correos, telefonos, direcciones u otros valores fuente al bundle de la aplicacion.

## Comandos

```powershell
pnpm crm:build -- --input "C:\ruta\a\Datos CRM"
pnpm crm:verify
pnpm crm:verify:cells -- --input "C:\ruta\a\Datos CRM"
```

El generador produce `data/crm-intelligence.json` y `data/crm-cell-manifest.json`. El primer verificador bloquea cambios que rompan alcance o reconciliaciones criticas. El segundo reabre independientemente los 84 XLS y compara hashes, hojas, rangos y celdas contra el manifiesto.

## Contrato para Metas 2026

Las metas están integradas como una entidad independiente, versión `202607`, desde los libros de Lo Beltrán, Nueva Costanera y Santa María.

- Cobertura: 3 libros, 3 hojas, 4.382 celdas almacenadas, 3.280 con contenido y 715 fórmulas.
- Errores de fórmula: 0.
- Métricas: cartera, requerimientos, leads, visitas, ofertas, cierres y cierres UF.
- Periodos: enero a diciembre de 2026, incluyendo valores nulos y ceros.
- Columnas anuales: todas se conservan en paralelo; ninguna se elige o elimina silenciosamente.
- Colores: se conservan como marcas literales de la fuente, sin inferir estado laboral.
- Identidades: cuatro filas permanecen no resueltas y se muestran con su fila fuente.
- Celdas fuera de bloque: cinco, conservadas con coordenada, valor y fórmula.

El total de sucursal de cada libro es la meta corporativa publicada para esa sucursal. La suma de partners se expone como reconciliación independiente. Nueva Costanera contiene discrepancias de origen en cartera de junio y requerimientos de abril, mayo y junio; no se corrigen ni ocultan.

El cumplimiento solo se calcula cuando existe un valor real CRM de la misma sucursal, métrica y mes. Para visitas se muestran agendadas y realizadas, pero el cumplimiento permanece `n/d` hasta definir cuál corresponde a la meta. Ofertas no cuenta con un actual CRM compatible. Nunca se infiere una meta a partir de actividad real.

`data/targets-cell-manifest.json` conserva dirección, valor, fórmula, tipo, formato, estilo y color de cada celda almacenada. `data/targets-2026.json` contiene la capa normalizada y todas las incidencias de origen.
