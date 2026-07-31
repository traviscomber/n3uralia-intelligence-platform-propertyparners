# Modelo de gestión — entendimiento consolidado

**Fuente:** `Jun_Directorio_5.pptx`, páginas 1–30 procesadas.  
**Período principal:** cierre de junio de 2026 y acumulado enero-junio de 2026.  
**Estado:** entendimiento consolidado en desarrollo. Los datos explícitos son canónicos; las inferencias permanecen identificadas hasta confirmación.

## 1. Estructura general del modelo

El control de gestión opera en cuatro capas:

1. **Resultado comercial:** cierres y UF vendidas.
2. **Cumplimiento:** resultado mensual y acumulado contra metas variables por mes.
3. **Evolución:** comparación mensual, acumulada y año contra año.
4. **Calidad de gestión:** score compuesto de cartera, seguimiento y conversión.

La misma estructura se aplica a la empresa consolidada y a cada oficina. Las presentaciones de partners utilizan el mismo lenguaje y fórmulas a nivel individual.

## 2. Fórmula principal confirmada

`Calidad Gestión = 0.4 × Calidad Cartera + 0.3 × Calidad Seguimiento + 0.3 × Calidad Conversión`

Cada dimensión se obtiene mediante el promedio simple de tres subscores.

## 3. Calidad de cartera

### 3.1 Cumplimiento de meta de cartera

`min(Cartera actual / Meta de cartera, 1) × 100`

Mide si el inventario alcanza la meta asignada. El score queda limitado a 100.

### 3.2 Requerimientos por tipo de propiedad

`min(Requerimientos observados / Benchmark esperado, 1) × 100`

Mide la correspondencia entre requerimientos y una expectativa por tipología. Se confirma que el benchmark es dinámico y específico por oficina, pero aún no está documentada su fórmula de construcción.

### 3.3 Calidad de precio

Cada propiedad elegible recibe:

- ratio precio/valorización ≤ 1.05: 100 puntos;
- ratio > 1.05 y ≤ 1.10: 50 puntos;
- ratio > 1.10: 0 puntos.

El score es el promedio de puntos sobre las propiedades elegibles para pricing. El universo elegible es un subconjunto estable de la cartera, aproximadamente 81–84% en los casos revisados.

## 4. Calidad de seguimiento

### 4.1 Leads clasificados

`Leads clasificados / Leads activos × 100`

### 4.2 Leads sin abandono mayor a 90 días

`(1 − Leads sin gestión durante 90 días / Leads activos) × 100`

### 4.3 Leads A atendidos dentro de 15 días

`(1 − Leads A sin gestión durante 15 días / Total de leads A) × 100`

El modelo diferencia limpieza de leads antiguos, clasificación y atención reciente de oportunidades prioritarias. Un score agregado puede mejorar aunque dos componentes caigan, si el tercero mejora con suficiente magnitud.

## 5. Calidad de conversión

### 5.1 Visitas realizadas contra meta

`min(Visitas realizadas / Meta de visitas, 1) × 100`

### 5.2 Visitas realizadas sobre agendadas

`Visitas realizadas / Visitas agendadas × 100`

### 5.3 Tasa de cierre a seis meses

`min(Tasa de cierre 6 meses, 2.86%) × 35`

La tasa de cierre se calcula usando cierres atribuidos durante seis meses sobre leads totales. El benchmark máximo es 2.86%. La multiplicación produce 100.1 en el límite; conceptualmente representa el máximo del indicador.

## 6. Semáforos confirmados

### Cumplimiento de meta

- rojo: <90%;
- amarillo: 90% a <100%;
- verde: ≥100%.

### Crecimiento año contra año

- rojo: <0%;
- amarillo: 0% a <20%;
- verde: ≥20%.

### Scores de calidad

- rojo: <50;
- amarillo: 50 a <70;
- verde: ≥70.

## 7. Clasificaciones confirmadas

- Estrella: tres dimensiones ≥70.
- Potencial: una dimensión ≥70 y las otras dos ≥50.
- Captador: cartera ≥70.
- Vendedor: conversión ≥70.
- Perseverante: seguimiento ≥70.
- Riesgo: dos dimensiones <30.
- Desarrollo: categoría residual.

Sigue pendiente la prioridad exacta cuando una persona cumple simultáneamente más de una categoría.

## 8. Comportamiento observado en la empresa

El consolidado de junio muestra:

- cantidad de cierres bajo meta;
- UF mensuales sobre meta;
- déficit acumulado de cierres;
- volumen promedio por cierre superior a 2025;
- cartera insuficiente;
- clasificación de leads baja;
- actividad de visitas bajo meta;
- tasa de cierre relativamente fuerte.

La empresa puede obtener un buen resultado económico con menos operaciones debido a un ticket promedio superior. Esto no significa que la operación previa del embudo esté saludable.

## 9. Comportamiento observado por oficina

### Santa María

- crecimiento fuerte contra 2025 desde una base baja;
- cumplimiento 2026 débil en cierres y UF;
- deterioro transversal en junio;
- baja clasificación de leads;
- baja cobertura de inventario;
- caída simultánea de actividad, agenda y tasa de cierre.

### Nueva Costanera

- cerca de la meta acumulada de cierres;
- sobrecumplimiento de UF;
- fuerte tasa de cierre;
- inventario insuficiente;
- actividad de visitas decreciente;
- mejora de seguimiento impulsada por limpieza de leads antiguos, no por mejor clasificación ni atención de leads A.

## 10. Principios de interpretación para el sitio

1. Resultado comercial y salud operativa deben mostrarse por separado.
2. Un score agregado debe permitir abrir sus tres componentes y bases numéricas.
3. Los datos mensuales, acumulados y año contra año no deben mezclarse.
4. Los deltas deben indicar explícitamente el período comparado.
5. Los valores canónicos deben conservar precisión interna y mostrar redondeo sólo en interfaz.
6. `n/d` debe mantenerse cuando falta una fuente o regla aprobada.
7. Las reglas inferidas no deben presentarse como políticas oficiales.

## 11. Preguntas abiertas priorizadas

### Alta prioridad

1. ¿Qué evento contractual u operacional define un cierre: promesa, escritura u otro hito?
2. ¿Qué regla atribuye 0.5 cierres y cómo se distribuye la UF en operaciones compartidas?
3. ¿Cómo se calcula el benchmark esperado de requerimientos por tipo de propiedad?
4. ¿Qué campos o estados hacen que una propiedad sea elegible para el score de pricing?
5. ¿Qué significan los indicadores laterales de variación que no coinciden con junio-mayo ni junio-enero?

### Prioridad media

6. ¿Las metas mensuales se generan por estacionalidad, días hábiles, presupuesto anual o pipeline?
7. ¿El score de tasa de cierre debe limitarse visualmente a 100 en lugar de mostrar 100.1?
8. ¿Qué prioridad se aplica entre Estrella, Potencial, Captador, Vendedor y Perseverante?
9. ¿Qué definición exacta de lead activo usa cada denominador?
10. ¿Los datos de cierres y UF se atribuyen a oficina, captador, vendedor o ambos?

## 12. Estado de procesamiento

- Presentación CEO: páginas 1–30 de 38 procesadas.
- Presentaciones restantes: pendientes de interpretación detallada.
- Corpus fuente completo: 5 presentaciones, 304 láminas.
