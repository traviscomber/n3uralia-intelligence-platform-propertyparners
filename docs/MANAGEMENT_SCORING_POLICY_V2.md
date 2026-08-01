# Política ejecutable de scoring de gestión v2

## Estado

Esta política convierte el entendimiento consolidado de `MANAGEMENT_MODEL_UNDERSTANDING.md` en reglas ejecutables y auditables. La versión productiva es `canonical_v2`. La versión `historical_v1` existe únicamente para reproducir resultados publicados anteriormente.

## Reglas productivas

1. Todos los subscores y scores se mantienen en el rango 0–100.
2. La tasa de cierre se calcula como:

   `min((tasa_de_cierre_porcentual / 2.86) × 100, 100)`

3. Una meta o denominador igual a cero produce `score = null` y estado `not_evaluable`.
4. Un valor negativo o un numerador que excede un universo de complemento produce estado `inconsistent_source`.
5. Las dimensiones sólo se calculan cuando sus tres componentes son evaluables.
6. La calidad de gestión se calcula con precisión interna completa:

   `0.4 × Cartera + 0.3 × Seguimiento + 0.3 × Conversión`

7. Los umbrales de clasificación utilizan el valor exacto, no el valor redondeado visible.
8. El redondeo a un decimal se aplica sólo en la interfaz o en una exportación de presentación.

## Reproducción histórica

`historical_v1` conserva dos comportamientos necesarios para explicar presentaciones anteriores:

- tasa de cierre: `min(TC%, 2.86) × 35`, cuyo máximo literal es 100.1;
- meta cero: score operativo 0, aunque el componente se muestre como no evaluable.

Ese modo no debe utilizarse para nuevas publicaciones ni para clasificar desempeño actual.

## Compatibilidad

El parámetro heredado `conversionCap: 'formula'` selecciona temporalmente `historical_v1`. Las nuevas integraciones deben usar `mode: 'canonical_v2'` o dejar la política sin especificar, porque v2 es el modo predeterminado.

## Decisiones aún abiertas

La v2 no inventa prioridades no respaldadas. Continúan bloqueados:

- Vendedor frente a Perseverante cuando ambas fortalezas coexisten;
- la prioridad completa de Riesgo frente a una fortaleza simple;
- la tabla oficial de benchmark de requerimientos por tipología;
- el evento jurídico u operacional definitivo de cierre.
