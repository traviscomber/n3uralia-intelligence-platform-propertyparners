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
| Visitas | `Visita - Id` | Evento mensual; puede repetirse en filas de detalle |
| Suspendidas | `Propiedad - Id` | Evento mensual |
| Total cartera | `Propiedad - Id` | Snapshot al corte |
| Leads activos / clasificados / sin gestion | `Lead - Id` | Snapshot al corte; nunca se suma como flujo mensual |

## Reglas de publicacion

1. Leer la hoja `Data` cuando existe; las tablas pivot no son fuente operacional.
2. Exigir el identificador canonico de la entidad.
3. Aplicar el alcance Vitacura, Venta, Casa/Departamento.
4. Deduplicar dentro de cada archivo por ID canonico.
5. Mantener filas sin ID en cuarentena y reportar su cantidad.
6. Representar archivos o periodos faltantes con `null`, nunca con cero.
7. Una conversion causal solo se publica cuando existe una llave trazable entre etapas.
8. `ventas / leads nuevos del mismo mes` se etiqueta como proxy, no como conversion de cohorte.
9. Metas, comisiones y tiempos de venta permanecen sin dato hasta contar con su fuente validada.
10. La cobertura de fuentes es datasets mensuales presentes dividido por datasets mensuales esperados. No es un puntaje subjetivo; duplicados, exclusiones y filas malformadas se informan por separado.

## Reconciliacion vigente

### Primer semestre 2026

- 34 ventas validas.
- UF 643.670 vendidas.
- 193 captaciones.
- 1.988 leads nuevos.
- 3.470 requerimientos.
- 1.599 visitas unicas en los cinco meses disponibles.
- Visitas semestrales: sin dato por ausencia del archivo de febrero.
- Cartera comparable: 386 propiedades en el primer corte y 351 en junio.

### Linea base 2025

- 61 ventas validas en el ano.
- 30 ventas durante enero-junio.
- UF 919.970 vendidas en el ano.
- 4.023 leads nuevos.
- 4.594 requerimientos dentro del alcance.
- 3.619 visitas unicas.

## Incidencias conocidas

- Febrero 2026 no incluye archivo de visitas.
- Febrero y el corte quincenal de abril incluyen registros de arriendo, que se excluyen.
- Cierres de junio incluye 13 filas auxiliares sin `Operacion - Id`; se ponen en cuarentena.
- Los snapshots de clasificacion no siempre cubren el 100% de los leads activos exportados.
- La identidad del agente vendedor no esta disponible de forma consistente en todos los cierres; el ranking actual se etiqueta como agente captador de la propiedad.

## Comandos

```powershell
pnpm crm:build -- --input "C:\ruta\a\Datos CRM"
pnpm crm:verify
```

El generador produce `data/crm-intelligence.json`. El verificador bloquea cambios que rompan alcance o reconciliaciones criticas.

## Contrato para Metas 2026

Las metas se integraran como una entidad independiente con los campos:

- `period`
- `role`
- `person_or_team_id`
- `metric`
- `target_value`
- `unit`
- `valid_from`
- `valid_to`
- `version`

Nunca se infiere una meta a partir de captaciones, leads, stock o ventas reales.
