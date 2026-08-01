# Modelo de gestión — entendimiento consolidado

**Fuentes:** cinco presentaciones de control de gestión 2026, con 304 láminas estructuradas.  
**Estado:** modelo consolidado con validación de consistencia. Los datos explícitos son canónicos; las inferencias permanecen identificadas hasta confirmación formal.

## 1. Jerarquía y estructura operativa

La jerarquía de negocio es:

`CEO → Director/Subdirector de Cuenta → Partner`

- **CEO:** máxima autoridad de negocio y acceso global. No existe una cuenta comercial superior.
- **Director de Cuenta:** guía, acompaña y prioriza el desarrollo de los partners asignados.
- **Partner:** origina su cartera de propiedades y gestiona sus leads, visitas y operaciones.
- **Administrador técnico:** rol operativo fuera de la jerarquía comercial; no debe interpretarse como superior al CEO.

## 2. Fórmula principal

`Calidad Gestión = 0.4 × Calidad Cartera + 0.3 × Calidad Seguimiento + 0.3 × Calidad Conversión`

Cada dimensión promedia tres subscores. Los scores se expresan de 0 a 100. El cumplimiento comercial puede superar 100%, pero los scores deben limitarse a 100.

## 3. Calidad de cartera

### 3.1 Meta de cartera

`min(Cartera actual / Meta de cartera, 1) × 100`

La meta es individual y variable por partner. El score mide cumplimiento relativo, no volumen absoluto.

### 3.2 Requerimientos por tipo de propiedad

`min(Requerimientos observados / Benchmark esperado, 1) × 100`

El benchmark no es una constante de dos requerimientos por propiedad. Casos revisados muestran distintos promedios, por lo que el esperado se construye sumando benchmarks por tipología o característica de cada propiedad.

`Benchmark total = Σ benchmark esperado de cada propiedad`

La tabla exacta por tipología sigue pendiente.

### 3.3 Calidad de precio

Cada propiedad elegible recibe:

- precio/valorización ≤1.05: 100;
- >1.05 y ≤1.10: 50;
- >1.10: 0.

El score es el promedio sobre propiedades elegibles. Las propiedades sin información suficiente quedan fuera del denominador y no reciben cero.

## 4. Calidad de seguimiento

- Leads clasificados: `Clasificados / Activos × 100`.
- Leads sin abandono de 90 días: `(1 − sin gestión 90d / Activos) × 100`.
- Leads A atendidos en 15 días: `(1 − A sin gestión 15d / Total A) × 100`.

Los leads A son un subconjunto de los leads clasificados. Los estados exactos del CRM que forman “Activos” aún no están documentados.

## 5. Calidad de conversión

- Visitas realizadas contra meta: `min(Visitas / Meta, 1) × 100`.
- Visitas realizadas sobre agendadas: `Realizadas / Agendadas × 100`.
- Tasa de cierre seis meses: `min(Tasa / 2.86%, 1) × 100`.

La última expresión reemplaza la fórmula operativa `min(TC%,2.86)×35`, que puede producir 100.1 por redondeo.

## 6. Estados evaluables y no evaluables

Los decks convierten algunos casos `0/0` en cero puntos, causando clasificaciones de Riesgo sin base operativa. La plataforma debe separar:

- **Evaluable:** existe denominador o meta mayor que cero.
- **No evaluable:** meta o denominador igual a cero y no hay universo operativo.
- **Fuente inconsistente:** numerador, denominador o período no son reconciliables.

Reglas:

```text
meta = 0 o denominador = 0 → score = null, estado = no evaluable
meta > 0 y resultado = 0 → score = 0
```

Riesgo sólo debe calcularse con dimensiones evaluables. Una persona sin cartera, leads, visitas ni metas no debe clasificarse automáticamente como Riesgo.

## 7. Clasificaciones

- Estrella: tres dimensiones ≥70.
- Potencial: una dimensión ≥70 y las otras dos ≥50.
- Captador: Cartera ≥70.
- Vendedor: Conversión ≥70.
- Perseverante: Seguimiento ≥70.
- Riesgo: al menos dos dimensiones evaluables <30.
- Desarrollo: categoría residual.

Prioridad confirmada:

`Estrella > Potencial > Captador > Perseverante`

También está confirmado que Potencial prevalece sobre Vendedor y Perseverante. Falta un caso directo para resolver Vendedor frente a Perseverante y la prioridad completa de Riesgo cuando coexiste con una fortaleza simple.

La clasificación usa precisión interna; no debe redondearse antes de evaluar umbrales.

## 8. Operaciones compartidas y atribución

En operaciones compartidas por dos partners:

- cada partner recibe 0.5 cierre;
- cada partner recibe el 100% de la UF como UF atribuida;
- los partners pueden pertenecer a oficinas distintas.

Pares identificados:

- Francisca Rossetti / Mary Carmen Canale — 10.700 UF;
- Jorge Zurob / Francisca Santos — 9.125 UF;
- Sebastián Zlatar / Felipe Elizalde — 3.975 UF;
- Rossana Lampasona / Paula Villarroel — 8.850 UF.

El sistema debe separar:

- cierres únicos;
- cierres atribuidos;
- UF únicas transaccionadas;
- UF atribuidas por partner y oficina.

Nunca se deben sumar UF atribuidas entre oficinas como si fueran volumen único sin desduplicar por operación.

## 9. Métodos de agregación

El modelo usa una consolidación híbrida. Cada indicador debe declarar su método.

| Indicador | Método |
|---|---|
| Cartera/meta | ratio de totales |
| Requerimientos | promedio de scores inferiores |
| Pricing | promedio ponderado de propiedades elegibles |
| Leads clasificados | ratio de totales |
| Sin gestión 90 días | ratio de totales |
| Leads A dentro de 15 días | ratio de totales |
| Visitas/meta | promedio de scores individuales, pendiente de confirmación final |
| Realizadas/agendadas | ratio de totales |
| Tasa de cierre | ratio de totales |
| UF atribuidas | suma de atribuciones |
| UF únicas | suma de operaciones desduplicadas |

No debe existir una única función genérica de agregación para todos los indicadores.

## 10. Períodos y consistencia de fuente

Los componentes mezclan ventanas distintas:

- cartera y leads activos: snapshot actual;
- visitas: ventana mensual, trimestral o acumulada;
- tasa de cierre: seis meses;
- ventas: mensual, trimestral y acumulada.

Cada cifra debe almacenar:

- `period_start_date`;
- `period_end_date`;
- `period_type`;
- `source_label`;
- `aggregation_method`;
- `evaluation_state`.

### Mayo omitido

En las láminas individuales la secuencia visible es `Ene · Feb · Mar · Abr · Jun`. Mayo no debe interpretarse como cero. Los deltas deben mostrarse como “Variación abril–junio”.

### Reporte Q2 con rótulos mayo

El archivo `Q2_Directorio_1.pptx` declara cierre Q2/H1, pero varias páginas dicen “Venta May”, “Scores May” e “Indicadores Ene-May”. Los valores trimestrales suman correctamente Q1 + Q2 = H1, por lo que es probable que algunos rótulos estén desactualizados; sin embargo, la plataforma debe marcar la inconsistencia hasta reconciliarla.

Título, portada, tabla y gráfico no deben asumirse consistentes por defecto.

## 11. Semáforos

### Cumplimiento de meta

- rojo: <90%;
- amarillo: 90% a <100%;
- verde: ≥100%.

### Crecimiento año contra año

- rojo: <0%;
- amarillo: 0% a <20%;
- verde: ≥20%.

### Scores

- rojo: <50;
- amarillo: 50 a <70;
- verde: ≥70.

## 12. Principios de producto

1. Separar resultado comercial de salud operativa.
2. Permitir abrir cada score hasta sus numeradores, denominadores y período.
3. Mostrar valor, meta, cumplimiento bruto y score por separado.
4. No clasificar datos no evaluables como mal desempeño.
5. Conservar precisión interna y redondear sólo en interfaz.
6. Mostrar advertencias de período o fuente cuando existan discrepancias.
7. Diferenciar UF únicas de UF atribuidas.
8. Identificar el método de agregación de cada indicador.
9. No presentar inferencias como políticas oficiales.
10. Dar al CEO vista global; al Director, consolidado de sus partners; al Partner, sólo su gestión.

## 13. Preguntas abiertas

1. Evento contractual u operacional que define un cierre.
2. Nombre formal de los roles en una operación compartida.
3. Reparto cuando participan tres o más personas.
4. Estados exactos del CRM que forman leads activos.
5. Campos que hacen elegible una propiedad para pricing.
6. Fuente oficial de valorización.
7. Tabla de benchmark por tipología de propiedad.
8. Fórmula o fuente de metas individuales.
9. Prioridad Vendedor frente a Perseverante.
10. Confirmación final del método de agregación de visitas/meta.
