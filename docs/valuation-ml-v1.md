# Property Partners Valuation ML v1

## Objetivo

Crear una capa ML auditable para casas de Vitacura sin degradar el valorizador deterministico vigente.

El ML v1 opera exclusivamente en **shadow mode**. Calcula un challenger y registra su resultado, pero no modifica la tasa recomendada, comparables, workflow, aprobaciones ni snapshots emitidos.

## Arquitectura

1. **Baseline deterministico**
   - KML Property Partners como primer hard filter.
   - CBRS robusto.
   - Comparabilidad fisica por construido y terreno.
   - Tratamiento separado de terreno dominante.
   - Guard economico reforzado donde el backtest lo justifica.

2. **ML registry**
   - Modelo: `pp-house-hybrid-ml-v1`.
   - Estado inicial: `shadow`.
   - Guarda configuracion, fecha de entrenamiento y metricas de laboratorio.

3. **Transformation evidence store**
   - Evidencia por ROL/direccion.
   - Solo evidencia verificada y observada antes de la prediccion puede influir en el challenger.
   - Ajuste maximo absoluto: 20%.
   - `unknown` nunca recibe prima.

4. **Shadow predictions**
   - Guarda baseline, challenger, features, evidencia y confidence.
   - Cuando existe outcome real, se resuelve la prediccion y se calcula error real.

5. **Online evaluation**
   - Compara MAPE y cobertura +/-15% de baseline vs challenger.
   - No existe auto-promocion.

## Evidencia experimental

Backtest de casas de Vitacura:

- Baseline fisicamente compatible: ~12.79% MAPE 2025.
- Residual kNN: no supera baseline (~12.89%); rechazado.
- Correcciones tabulares/barrio: no mejoran fuera de muestra; rechazadas.
- Evidencia de transformacion verificada: muestra potencial material en casos transformados.
- En la cohorte experimental de transformaciones fuertes, un ajuste conservador de hasta 20% redujo fuertemente el error de esos casos, pero no se usa sin evidencia anterior a la prediccion.

## Regla de promocion

El challenger puede pasar de `shadow` a `champion` solo si:

- hay al menos 30 outcomes reales resueltos;
- challenger MAPE es menor que baseline MAPE;
- no existe regresion material en cobertura +/-15%;
- no rompe barrios con buen desempeno historico;
- las fuentes de evidencia son trazables;
- Property Partners conserva confirmacion humana final.

## APIs

- `POST /api/valuation/ml/shadow`
  - calcula challenger y registra prediccion.
- `POST /api/valuation/ml/resolve`
  - agrega outcome real para evaluar el modelo.
- `GET /api/valuation/ml/status`
  - devuelve modelo registrado, metricas historicas y evaluacion online.

## Seguridad

- Tablas ML viven en schema `private`.
- RLS habilitado.
- Sin permisos para `anon` ni `authenticated`.
- RPCs internos solo para `service_role`.
- Las rutas siguen las capabilities existentes de valorizacion/mercado.

## Principio

El ML no reemplaza la evidencia canonica. Aprende sobre ella y debe demostrar mejora fuera de muestra antes de influir en produccion.
