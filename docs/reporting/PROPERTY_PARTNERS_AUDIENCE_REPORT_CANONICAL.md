# Property Partners — Contrato CANÓNICO de informes mensuales por audiencia

**Autoridad aprobada**: los tres documentos emitidos el 1 de octubre de 2026, con corte al 30 de septiembre, disponibles en la biblioteca de informes:
- `01_Property_Partners_CEO_Septiembre_2026.pdf` (5 páginas).
- `02_Property_Partners_Directoras_Septiembre_2026.pdf` (4 páginas).
- `03_Property_Partners_Partners_Septiembre_2026.pdf` (6 páginas).
- Snapshot de respaldo: `property_partners_septiembre_2026_snapshot.json`.

Este contrato prevalece sobre versiones resumidas de cuatro páginas. No sustituir un informe completo por una ficha KPI.

## 1. Entregables obligatorios

1. **CEO/Directorio**: resumen ejecutivo; MoM y YoY solo con métricas comparables; resultado comercial con puente de cierres (operaciones activas, anulaciones/suspensiones históricas y neto); detalle de operaciones nominales y UF con signo; desglose de oficinas; visitas, cartera y leads; focos verificables; fuentes y límites.
2. **Directoras**: una sección separada por cada oficina autorizada (Santa María, Nueva Costanera, Lo Beltrán), con KPIs de oficina, tasas con numerador y denominador, seguimiento de leads >90d y A >15d, captaciones/suspensiones/cartera/ventas UF, comparativo mensual con fórmula compatible y lectura operativa. Cuando el archivo se expone a una directora autenticada, **nunca** incluir oficinas fuera de su scope RBAC.
3. **Partners**: detalle nominal por oficina y por persona basado en CRM y archivo de cierres. Columnas mínimas: partner; leads; porcentaje clasificados; leads >90d; visitas realizadas/agendadas; stock; captaciones/suspensiones; cierres netos/UF netas. Preservar todas las filas, incluidos ceros verificados y suspensiones negativas. **No** inventar rankings ni scores, ni imputar totales corporativos a un partner.

## 2. Regla de reconciliación (caso septiembre 2026)

- 6 cierres activos por **71.560 UF**.
- 1 suspensión histórica de **julio** reconocida en septiembre: **−1 cierre y −22.000 UF**.
- Resultado neto **5 cierres y 49.560 UF**.
- Aplicar el ajuste en CEO, oficina Lo Beltrán y partner **Maria de los angeles Carcavilla**, conservando el mes original en nota; no registrar como una venta negativa nueva.
- Explicar diferencias entre operación bruta y neta antes de sumar. No ocultar el ajuste.
- CEO septiembre: leads 1.470, visitas 140/238, stock 340; los comparativos agosto autorizados en el informe de origen son leads 1.228, agendadas 324, realizadas 189 y stock 324.
- **N/D nunca equivale a 0**. No calcular score global si faltan requerimientos, pricing y metas de visitas por oficina.

## 3. PDFino + Frida: calidad visual no negociable

- Seguir `DESIGN.md` y `docs/reporting/MONTHLY_EXECUTIVE_REPORT_STANDARD.md`: A4, márgenes consistentes, portada de marca aprobada (logo real, sin reemplazo tipográfico), retícula, encabezado/pie, fecha, corte, numeración y confidencialidad.
- Primera página de análisis orientada a decisión: cifras netas y ajuste identificable, 3 focos como máximo.
- Gráficos profesionales solo para comparaciones respaldadas, base 0 en barras, unidades, etiquetas directas y fuente; prohibidas barras simuladas y gráficos decorativos.
- Tablas nominales legibles, nombres completos, filas sin truncamiento, signos negativos visibles y encabezados repetidos si la tabla continúa.
- Los gráficos son adicionales, nunca sustituyen tablas canónicas de personas u operaciones.
- Entrega: QA determinista, render de **todas** las páginas, inspección de recortes, tipografía, contraste, artefactos y datos, y verificación de separación de audiencias.
- Un preview compilado no acredita QA visual. No enviar ni aprobar automáticamente sin revisión de las partes autorizadas.

## 4. Contrato técnico para nuevas emisiones

Los builders, cron y endpoints de exportación deben consultar este documento y usar un esquema versionado de secciones y evidencia. Validar por audiencia que están todas las secciones y filas antes de generar PDF; rechazar exportaciones que omitan puente histórico, detalle nominal o fuentes. Generación PDF invoca `verifyPdfinoReport`, pero ese preflight estructural por sí solo NO valida semántica ni legibilidad: se requiere test de dataset representativo y render visual en CI. No crear nuevos formatos simplificados al margen de este contrato.

**Nota**: las tres plantillas de octubre 1 son precedentes editoriales auditados; la estructura se reutiliza, pero ninguna cifra de septiembre se debe copiar a meses futuros.

## 5. Identidad visual de informes — DESIGN.md obligatorio

**La página ppartnersgroup.app es referencia de producto, pero la autoridad ejecutable reside en los recursos aprobados y en DESIGN.md.** No usar capturas generadas por IA ni mockups sintéticos como contenido del informe: pueden inventar cierres, oficinas líderes, agentes, comparativos y fotografías. El generador debe usar exclusivamente imágenes de marca aprobadas en el repositorio, nunca recrear logos por IA.

- Página editorial A4 blanca; portada e interiores comparten retícula, familia tipográfica del proyecto, márgenes, rojo estructural y blanco/negro de DESIGN.md. La portada puede tener recursos editoriales autorizados; **no** asumir fotografía inmobiliaria genérica como imagen oficial.
- Rediseñar secciones completas, no adjuntar páginas de otro estilo ni duplicar anexos para simular profundidad.
- CEO: mantener conciliación bruto + suspensión histórica + neto; tabla de siete operaciones, y tabla completa de seguimiento de tres oficinas **en contexto**; comparar agosto y septiembre con unidades, procedencia, y no confundir stock/flujo.
- Directoras: por cada oficina, una misma gramática visual con denominadores explícitos, tabla MoM, seguimiento A >15 días y >90 días; exportación por perfil siempre acotada por RBAC en servidor.
- Partners: conservar todas las 37 filas del **ejemplo septiembre**, con nombre y cifras exactas (el número de personas en otros períodos es variable); nombres legibles y una tabla por oficina con cabeceras claras; los ceros verificados y cifras negativas no se omiten.
- Escala de tipografía legible en impresión A4; no comprimir tablas hasta volverlas ilegibles. Usar más páginas cuando sea necesario para preservar tamaño de letra y desglose.
- En toda página: período y corte, numeración real, entidad autorizada, estados N/D, y enlace/sección de trazabilidad a fuentes; no inventar porcentajes MoM ni conclusiones como «stock más sano» sin evidencia.
- **Release gate**: pruebas semánticas de cobertura por audiencia más render-to-PNG de todas las páginas; comparación contra el set canónico y control visual de tipografía, no solo pdf-lib y build verde.

### Evidencia mínima para aprobar cada versión

El manifiesto de validación debe registrar: versión del snapshot, período, archivos/evidencias, listado de secciones por audiencia, cantidad de filas de operaciones y de partners, conciliación UF y de cierres, resultado del test de RBAC, inventario de páginas renderizadas e inspección visual. Si falta cualquiera, estado HOLD; no enviar al cliente.
