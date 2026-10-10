# PDFino + Frida — contrato de generación documental Property Partners

Aplicación: informes canónicos de cliente y CEO Intelligence. Autoridades: `DESIGN.md`, `docs/reporting/MONTHLY_EXECUTIVE_REPORT_STANDARD.md`, activos aprobados en `public/brand`.

## Regla de ejecución

La skill de ChatGPT **no puede ejecutarse dentro de Vercel**. Su estándar editorial se materializa en la capa de generación PDF, en `lib/pdfino-report-quality.ts`, en los generadores y en las pruebas de regresión. Para nuevos generadores, llamar obligatoriamente a `verifyPdfinoReport(bytes, ...)` antes de devolver, guardar o enviar un PDF. Para documentos externos o envíos automatizados también se exige QA visual por páginas en CI/preview antes del release de cada nueva plantilla. El preflight programático no sustituye la inspección visual.

## Sistema visual

- Identidad: logo REAL aprobado `public/brand/property-partners-vitacura.png`. No recrear marcas con tipografía o formas. Preservar relación de aspecto, contraste y espacio en blanco.
- Documentos formales A4 vertical, papel blanco, tinta oscuro/gris legible, rojo PP `#d7332b` como acento controlado. Portada oscura solo donde la plantilla editorial aprobada ya la usa.
- Títulos breves, jerarquía visible, párrafos cortos, cifras con unidades, período y corte.
- Tablas y gráficas: fuentes verificadas, escala explícita, base cero en barras, etiquetas directas, no barras para N/D, máximo cuatro series por gráfico.
- El primer pliego prioriza resultado y decisiones; fuentes, reconciliación, métodos y trazabilidad quedan accesibles sin dominar la lectura.
- Encabezados, numeración y pies consistentes; separar información verificada, interpretación y acción.

## Gates

1. El informe utiliza solo datos canónicos del período/audiencia autorizados.
2. Toda métrica conserva fuente, fecha, unidad y fórmula compatible; nunca transformar N/D en cero.
3. PDF contiene el logo original embebido en páginas de portada y tiene metadatos, tamaño A4 y número esperado de páginas.
4. Se ejecuta `verifyPdfinoReport`; error => no entregar.
5. CI corre tests de contratos y build.
6. Antes de promover nuevas plantillas, renderizar todas las páginas a PNG, auditar overflow, etiquetas de gráficos, contraste, compaginación y claridad en 100% de escala.
7. Las rutas de descarga y de correo deben compartir el mismo generador certificado; la aprobación/envío sigue siendo humana salvo autorización expresa.

## Próximo tramo

- Extender este contrato a los restantes exportadores históricos solo después de inventariarlos y reconciliar plantilla/canonical source.
- Evaluar incorporación de tipografía Montserrat mediante fuente redistribuible aprobada con peso/embedding verificado; no usar una fuente inventada.
- Añadir smoke visual de PDF para fixtures válidos y estados incompletos sin datos simulados en producción.
