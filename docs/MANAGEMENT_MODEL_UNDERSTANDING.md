# Modelo de gestión — entendimiento consolidado

**Fuentes:** cinco presentaciones de control de gestión 2026, con 304 láminas estructuradas.  
**Período principal:** cierre de junio de 2026 y acumulado enero-junio de 2026.  
**Estado:** entendimiento consolidado en desarrollo. Los datos explícitos son canónicos; las inferencias se mantienen identificadas hasta confirmación formal.

## 1. Estructura operativa

El modelo se organiza alrededor de dos roles:

- **Partner:** origina su cartera de propiedades, gestiona sus leads, visitas y operaciones, y recibe las metas y scores individuales.
- **Director de Cuenta:** guía, acompaña y prioriza el desarrollo de los partners asignados. No es el productor principal ni el dueño de la cartera.

La relación operativa es:

`Director de Cuenta → Partners asignados → cartera, leads, visitas, cierres, metas y plan de mejora`

El control de gestión opera en cuatro capas:

1. **Resultado comercial:** cierres atribuidos y UF atribuidas.
2. **Cumplimiento:** resultado mensual y acumulado contra metas variables por partner y mes.
3. **Evolución:** comparación mensual, acumulada y año contra año.
4. **Calidad de gestión:** score compuesto de cartera, seguimiento y conversión.

## 2. Fórmula principal confirmada

`Calidad Gestión = 0.4 × Calidad Cartera + 0.3 × Calidad Seguimiento + 0.3 × Calidad Conversión`

Cada dimensión se obtiene mediante el promedio simple de tres subscores.

Todos los scores y subscores deben interpretarse en una escala de 0 a 100. El cumplimiento comercial puede superar 100%, pero el score utilizado para calidad queda limitado a 100.

## 3. Calidad de cartera

### 3.1 Cumplimiento de meta de cartera

`min(Cartera actual / Meta de cartera, 1) × 100`

Mide si el inventario del partner alcanza la meta asignada. Una persona puede tener una sola propiedad y obtener 100 puntos si su meta era una propiedad. El score mide cumplimiento individual, no volumen absoluto.

### 3.2 Requerimientos por tipo de propiedad

`min(Requerimientos observados / Benchmark esperado, 1) × 100`

El benchmark se construye sobre las propiedades del partner. En los casos individuales revisados, el esperado equivale a dos requerimientos por propiedad:

- 10 propiedades → esperado 20;
- 15 propiedades → esperado 30.

Sigue pendiente confirmar si dos requerimientos es una regla general o el resultado de la mezcla de tipologías observada.

### 3.3 Calidad de precio

Cada propiedad elegible recibe:

- ratio precio/valorización ≤ 1.05: 100 puntos;
- ratio > 1.05 y ≤ 1.10: 50 puntos;
- ratio > 1.10: 0 puntos.

El score es el promedio de puntos sobre las propiedades elegibles. Las propiedades sin información suficiente no reciben cero: quedan fuera del denominador.

Caso validado:

`(5×100 + 1×50 + 2×0) / 8 = 68.75`

La cartera total era de 10 propiedades, pero sólo 8 entraron al cálculo de pricing.

## 4. Calidad de seguimiento

### 4.1 Leads clasificados

`Leads clasificados / Leads activos × 100`

### 4.2 Leads sin abandono mayor a 90 días

`(1 − Leads sin gestión durante 90 días / Leads activos) × 100`

### 4.3 Leads A atendidos dentro de 15 días

`(1 − Leads A sin gestión durante 15 días / Total de leads A) × 100`

El mismo universo de leads se reutiliza como denominador en seguimiento y en la tasa de conversión a seis meses. Sigue pendiente documentar los estados exactos del CRM que forman el conjunto de leads activos.

## 5. Calidad de conversión

### 5.1 Visitas realizadas contra meta

`min(Visitas realizadas / Meta de visitas, 1) × 100`

### 5.2 Visitas realizadas sobre agendadas

`Visitas realizadas / Visitas agendadas × 100`

### 5.3 Tasa de cierre a seis meses

`min(Tasa de cierre 6 meses, 2.86%) × 35`

La tasa utiliza cierres atribuidos durante seis meses sobre el mismo universo de leads. El resultado debe limitarse visual y lógicamente a 100, aunque la fórmula original pueda producir 100.1 por redondeo.

## 6. Metas y ausencia de meta

Las metas son individuales y variables por partner y por mes. No corresponden a una división uniforme de la meta de oficina.

Reglas observadas:

- resultado/meta puede superar 100% como cumplimiento comercial;
- el score derivado queda limitado a 100;
- una meta mensual igual a cero aparece como `—` en las tablas comerciales;
- el deck actual asigna 0 puntos dentro de algunos subscores cuando la meta es cero.

La última conducta es una inconsistencia que debe validarse antes de implementarla como política. La opción recomendada para el producto es tratar una meta no asignada como **no evaluable** y redistribuir el peso entre indicadores evaluables, salvo instrucción formal distinta.

## 7. Operaciones compartidas y atribución

La evidencia cruzada entre partners y oficinas confirma el siguiente patrón para operaciones compartidas por dos partners:

- cada partner recibe `0.5` cierre;
- cada partner recibe el 100% de la UF de la operación como UF atribuida;
- la operación puede vincular partners de la misma oficina o de oficinas diferentes.

Pares verificados:

- Francisca Rossetti y Mary Carmen Canale: `0.5` cierre y `10.700 UF` cada una;
- Jorge Zurob y Francisca Santos: `0.5` cierre y `9.125 UF` cada uno;
- Sebastián Zlatar y Felipe Elizalde: `0.5` cierre y `3.975 UF` cada uno.

La explicación operativa más consistente es que un partner aporta la propiedad y otro participa por el lado comprador o vendedor. Los nombres formales de esos roles todavía deben confirmarse.

El modelo de datos debe separar:

- **UF únicas transaccionadas:** valor real de cada operación sin duplicación;
- **UF atribuidas:** volumen reconocido a cada participante;
- **cierres únicos:** cantidad de operaciones;
- **cierres atribuidos:** suma del crédito fraccionado entregado a participantes.

Nunca se deben sumar UF entre oficinas como si fueran volumen único sin desduplicar por operación.

## 8. Semáforos confirmados

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

## 9. Clasificaciones y prioridad

Reglas confirmadas:

- Estrella: tres dimensiones ≥70.
- Potencial: una dimensión ≥70 y las otras dos ≥50.
- Captador: cartera ≥70.
- Vendedor: conversión ≥70.
- Perseverante: seguimiento ≥70.
- Riesgo: dos dimensiones <30.
- Desarrollo: categoría residual.

Prioridad confirmada por casos individuales:

`Estrella > Potencial > Captador / Vendedor / Perseverante`

Potencial prevalece cuando también se cumplen una o más clasificaciones simples. Sigue pendiente confirmar la prioridad completa de Riesgo y Desarrollo, además del desempate cuando se cumplen varias clasificaciones simples.

## 10. Períodos y deltas

Mayo no está incluido en las tablas ni en las categorías de los gráficos originales de partners. Las columnas muestran:

`Ene · Feb · Mar · Abr · Jun`

Por ello, los deltas laterales de esas láminas representan junio menos abril. Los acumulados sí incorporan la actividad y metas de mayo aunque no se muestren como columna independiente.

El sitio debe indicar explícitamente el período comparado, por ejemplo:

`Variación abril–junio: +10.8`

No debe mostrarse un delta sin período porque induce a interpretar junio contra mayo.

## 11. Principios de producto

1. Resultado comercial y salud operativa deben mostrarse por separado.
2. Un score agregado debe permitir abrir sus componentes y bases numéricas.
3. Los datos mensuales, acumulados y año contra año no deben mezclarse.
4. Los deltas deben indicar el período comparado.
5. Los valores canónicos deben conservar precisión interna y redondear sólo en interfaz.
6. `n/d` o `—` deben mantenerse cuando falta una fuente o no existe meta evaluable.
7. Las reglas inferidas no deben presentarse como políticas oficiales.
8. La interfaz debe mostrar valor, meta, cumplimiento bruto y score por separado.
9. Los totales atribuidos nunca deben presentarse como volumen único sin aclaración.
10. El Director de Cuenta necesita una vista consolidada de sus partners, alertas y acciones de acompañamiento; el Partner necesita su cartera, leads, visitas, cierres, metas y recomendaciones.

## 12. Preguntas abiertas priorizadas

### Alta prioridad

1. ¿Qué evento contractual u operacional define un cierre: promesa, escritura u otro hito?
2. ¿Cuál es el nombre formal de los dos roles de una operación compartida?
3. ¿Existen repartos distintos de `0.5 + 0.5` cuando participan más de dos personas?
4. ¿Qué estados exactos del CRM forman el universo de leads activos?
5. ¿Qué campos o estados hacen elegible una propiedad para pricing?
6. ¿Qué fuente oficial entrega la valorización usada en el ratio de precio?

### Prioridad media

7. ¿Cómo se calculan las metas individuales de cierres, UF, cartera y visitas?
8. ¿El benchmark de requerimientos es siempre dos por propiedad o depende de la tipología?
9. ¿Cuál es la prioridad completa entre Riesgo, Desarrollo y las clasificaciones simples?
10. ¿Cómo deben tratarse formalmente los subscores con meta cero?

## 13. Estado de procesamiento

- Presentación CEO de junio: 38 páginas procesadas.
- Presentaciones de partners de Lo Beltrán, Nueva Costanera y Santa María: bloques comerciales y de scoring revisados.
- Presentación de cierre Q2: modelo general revisado.
- Corpus fuente completo: 5 presentaciones, 304 láminas.
