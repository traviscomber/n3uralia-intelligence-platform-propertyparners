# Agente de análisis de presentaciones de gestión

## Objetivo

Leer el corpus canónico de presentaciones 2026 lámina por lámina y convertirlo en evidencia estructurada y consultable para comprender los cálculos de gestión.

Fuente actual:

- `data/presentations-2026.json`
- 5 presentaciones
- 304 láminas declaradas en el inventario canónico

El agente no reemplaza la validación del Cliente. Distingue entre:

1. Fórmulas explícitas escritas en una lámina.
2. Cálculos derivados respaldados por valores base.
3. Relaciones inferidas que deben confirmarse.
4. Información visual que requiere revisión manual de la lámina original.

## Implementación

- Motor: `lib/presentation-analysis-agent.ts`
- API protegida: `GET /api/management/presentation-analysis`
- Acceso: CEO y administrador.

## Salida por lámina

Cada registro contiene:

- presentación;
- número y título de lámina;
- ruta exacta dentro del JSON;
- texto y valores detectados;
- períodos;
- conceptos de gestión;
- fórmulas candidatas;
- interpretación controlada;
- preguntas pendientes;
- calidad y necesidad de revisión visual.

## Conceptos reconocidos

- cierres y venta en UF;
- cierres y venta acumulada;
- stock y cartera;
- captaciones;
- requerimientos;
- leads;
- visitas;
- seguimiento;
- conversión;
- scores de gestión y cartera;
- metas y cumplimiento;
- MoM y YoY;
- rankings;
- alertas y brechas.

## Consultas

### Corpus completo

`GET /api/management/presentation-analysis`

### Búsqueda semántica simple por términos

`GET /api/management/presentation-analysis?q=conversión+seguimiento`

### Lámina específica

`GET /api/management/presentation-analysis?slide=17`

### Lámina dentro de una presentación

`GET /api/management/presentation-analysis?deck=Lo%20Beltrán&slide=17`

## Reglas de interpretación

- Cumplimiento se propone como `resultado / meta × 100` sólo cuando la lámina relaciona resultado y meta.
- MoM se propone como variación contra el mes anterior.
- YoY se propone como variación contra el mismo período del año anterior.
- Conversión no se considera definida hasta identificar numerador y denominador.
- Captaciones no se sustituyen por stock ni por variación neta de cartera.
- Rankings y umbrales permanecen provisionales hasta aprobación formal del Cliente.

## Limitación importante

El agente analiza todo el contenido disponible en el JSON canónico. Cuando una lámina depende de gráficos, diagramas, colores, posición espacial o imágenes que no fueron extraídas al JSON, marca `visualReviewRequired: true`. Esas láminas deben revisarse contra el archivo original antes de convertir una inferencia en regla oficial.

## Proceso recomendado

1. Ejecutar el agente sobre las 304 láminas.
2. Revisar primero las láminas con fórmulas explícitas.
3. Comparar resultados reportados contra valores base.
4. Resolver preguntas por indicador con Property Partners.
5. Consolidar el diccionario oficial de KPI y fórmulas.
6. Conectar sólo las reglas aprobadas a dashboards, alertas y rankings.

## Criterio de aceptación

El análisis se considera completo cuando:

- todas las láminas tienen una referencia trazable;
- las fórmulas explícitas están registradas;
- las inferencias están separadas de reglas confirmadas;
- toda diferencia de cálculo tiene una pregunta o nota de calidad;
- las láminas visuales pendientes han sido revisadas contra su original;
- el Cliente ha aprobado el diccionario final de KPI.
