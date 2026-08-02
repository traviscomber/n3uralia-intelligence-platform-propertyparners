# Flujo canónico de reportes mensuales CEO

Este documento define cómo debe generarse, validarse, previsualizarse y enviarse cada reporte mensual de Control de Gestión para Property Partners Vitacura.

## Objetivo

Dejar cada reporte mensual preparado al cierre del período, con datos validados, diseño consistente con la aplicación y listo para revisión del CEO antes del envío.

## Regla de período cerrado

1. Un informe mensual sólo puede declararse como cierre cuando el mes solicitado terminó completamente.
2. El mes calendario en curso no puede presentarse como informe cerrado, aunque existan datos parciales.
3. Los datos del mes en curso deben etiquetarse como avance, período abierto o información preliminar.
4. Al 2 de agosto de 2026, el último cierre mensual válido es julio de 2026.
5. El cierre de agosto de 2026 sólo podrá prepararse desde septiembre de 2026, una vez validada la data completa.
6. La vista previa, exportación y envío deben rechazar cualquier período igual o posterior al mes actual cuando se solicite como cierre mensual.

## Fuente de datos

1. Usar exclusivamente los datos correspondientes al período solicitado.
2. Validar los datos comerciales contra la presentación canónica del mes cuando exista.
3. No mezclar información posterior al corte comercial.
4. No inventar, completar ni estimar métricas faltantes.
5. Mantener separados:
   - resultados observados;
   - metas;
   - estándares operacionales;
   - benchmarks.

## Estructura del reporte

Cada reporte debe incluir, cuando existan datos disponibles:

1. Portada y período de cierre.
2. Resumen ejecutivo.
3. Cierres del mes versus meta.
4. Cumplimiento mensual.
5. Productividad por ejecutiva.
6. Acumulado desde enero hasta el mes cerrado.
7. Evolución mensual hasta el período solicitado.
8. Embudo operacional.
9. Estándares de contacto.
10. Prioridades de gestión para el siguiente ciclo.

Enero es un caso especial: no debe mostrar comparación con un mes anterior de 2026. Debe presentarse como línea base del año.

## Reglas visuales

La paleta debe usar los tokens definidos por la aplicación en `app/globals.css`.

- Fondo: `#050807`
- Superficie: `#0c1111`
- Texto principal: `#edf4f3`
- Texto secundario: `#b6c1bf`
- Rojo corporativo: `#d7332b`
- Rojo accesible: `#ff766f`
- Azul informativo: `#1565c0`
- Verde positivo: `#27ae60`
- Naranja preventivo: `#f39c12`
- Gris neutral: `#7f8c8d`

### Semántica de desempeño

- Verde: cumplimiento igual o superior a 100%.
- Naranja: cumplimiento entre 90% y 99%.
- Rojo: cumplimiento inferior a 90%, alerta o brecha.
- Azul o gris: información neutral, volumen, contexto o referencia.
- El rojo corporativo puede usarse en identidad, títulos o divisores, pero nunca debe representar un resultado positivo.
- Las metas deben mostrarse como referencia neutral y no como alerta por defecto.

## Generación y vista previa

La vista previa y el correo deben utilizar exactamente el mismo HTML.

Ruta de vista previa:

```text
/api/management/reports/preview?period=YYYY-MM
```

Generadores actuales:

- Enero: `lib/ceo-report-january-layout.ts`
- Febrero en adelante: `lib/ceo-report-april-layout-v2.ts`

Rutas que consumen estos generadores:

- Vista previa: `app/api/management/reports/preview/route.ts`
- Envío: `app/api/cron/send-ceo-report-brandbook/route.ts`

## Envío

1. El reporte debe quedar preparado al cierre del mes.
2. Debe revisarse primero en la vista previa.
3. No debe enviarse automáticamente sin solicitud o aprobación del CEO.
4. El envío se realiza mediante Resend.
5. El asunto debe usar el formato:

```text
Control de Gestión — Cierre <Mes> <Año>
```

6. La respuesta del proveedor debe conservar el identificador del mensaje para trazabilidad.
7. No se debe afirmar entrega final sin confirmación del proveedor.

## Checklist mensual

Antes de declarar un reporte listo:

- [ ] El período solicitado está completamente cerrado.
- [ ] El período solicitado es correcto.
- [ ] Los datos coinciden con la fuente canónica disponible.
- [ ] No se mezclan datos posteriores al corte.
- [ ] Los acumulados terminan en el mes solicitado.
- [ ] La comparación con el mes anterior existe y es válida.
- [ ] Enero no contiene comparación artificial con diciembre.
- [ ] Los colores de desempeño son semánticamente correctos.
- [ ] La vista previa y el correo usan el mismo generador.
- [ ] La vista previa fue revisada.
- [ ] El envío permanece pendiente de aprobación del CEO.

## Criterio de finalización

Un reporte mensual se considera listo cuando:

- el mes solicitado terminó completamente;
- sus datos están validados;
- su período y acumulado son correctos;
- el diseño cumple los tokens visuales de la aplicación;
- la semántica de color es consistente;
- la vista previa funciona;
- el mismo contenido está preparado para Resend;
- no se ha enviado sin autorización.
