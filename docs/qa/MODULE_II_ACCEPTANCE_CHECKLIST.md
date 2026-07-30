# Módulo II · Valorización — Checklist de aceptación y UAT

## Objetivo

Validar que el flujo de valorización sea trazable, reproducible, controlado por roles y respaldado por evidencia del Módulo I, sin decisiones automáticas irreversibles.

## 1. Creación del caso

- [ ] Una valorización nueva siempre se crea con estado `draft`.
- [ ] El servidor ignora cualquier intento del cliente de crear directamente en `review`, `approved` o `issued`.
- [ ] Se registra propiedad, superficies, tipología, barrio, ROL y factores cualitativos.
- [ ] El cálculo inicial queda asociado a `valuation-contract-v1`.
- [ ] Se crea la versión inicial del expediente.
- [ ] Se registra `case_created` en `valuation_decision_log`.
- [ ] Después de guardar, la interfaz abre `/dashboard/valuations/[id]`.

## 2. Comparables y evidencia

- [ ] Cada comparable conserva fuente, referencia, fecha observada y vínculo con listing o transacción cuando exista.
- [ ] Los comparables manuales se distinguen de los candidatos generados desde el Módulo I.
- [ ] Aceptar un comparable registra actor, fecha y motivo.
- [ ] Excluir un comparable exige un motivo.
- [ ] Ajustar un comparable registra porcentaje, nota y valor ajustado.
- [ ] No se eliminan silenciosamente decisiones previas del expediente.
- [ ] La generación de candidatos informa claramente cuando no existen datos unitarios suficientes.

## 3. Workflow

- [ ] `draft → review` exige al menos tres comparables aceptados.
- [ ] `review → approved` sólo está disponible para roles autorizados.
- [ ] `review → draft` exige observación o motivo de devolución.
- [ ] `approved → issued` sólo está disponible para roles autorizados.
- [ ] No se permite saltar estados.
- [ ] Cada transición incrementa la versión del caso.
- [ ] Cada transición genera snapshot y decisión auditable.

## 4. Roles y seguridad

Validar con usuarios reales o cuentas de prueba para cada rol:

- [ ] `partner`: crea y edita borradores; no aprueba ni emite.
- [ ] `director`: revisa, devuelve y aprueba según política acordada.
- [ ] `subdirector`: permisos explícitamente definidos y probados.
- [ ] `ceo`: acceso ejecutivo y aprobación según política acordada.
- [ ] `admin`: administración y soporte operativo.
- [ ] Usuario no autenticado recibe `401`.
- [ ] Usuario sin permiso recibe `403` en acciones restringidas.
- [ ] Las políticas RLS impiden acceso transversal no autorizado.

## 5. Cálculo y consistencia

- [ ] El cálculo utiliza sólo comparables seleccionados y válidos.
- [ ] La superficie efectiva corresponde a la tipología del inmueble.
- [ ] La mediana o ponderación es reproducible con los mismos datos.
- [ ] Los ajustes cualitativos respetan los límites definidos.
- [ ] El valor base, valor ajustado y rango quedan persistidos.
- [ ] El número de comparables usado coincide con la evidencia del expediente.
- [ ] La confianza no se calcula usando comparables excluidos.

## 6. Informe

- [ ] El informe identifica caso, versión, fecha y estado.
- [ ] Incluye ficha de la propiedad.
- [ ] Incluye comparables aceptados y excluidos.
- [ ] Incluye fuentes y referencias verificables.
- [ ] Incluye ajustes y justificaciones.
- [ ] Incluye metodología y limitaciones.
- [ ] Incluye responsables de creación, revisión, aprobación y emisión.
- [ ] La versión impresa o PDF coincide con el snapshot emitido.

## 7. Integración con Módulo I

- [ ] Existen listings o transacciones unitarias reales en el entorno de validación.
- [ ] `valuation_candidate_pool` devuelve candidatos para un caso conocido.
- [ ] Los candidatos respetan tipología, ubicación y superficies.
- [ ] Las referencias de fuente pueden rastrearse hasta el registro de mercado.
- [ ] El sistema no inventa candidatos cuando no hay evidencia.
- [ ] Las advertencias de falta de datos son visibles para el usuario.

## 8. Regresión técnica

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores.
- [ ] Las pruebas del motor de identidad de mercado terminan correctamente.
- [ ] No existen errores 5xx en las rutas de valorización durante UAT.
- [ ] Las rutas antiguas redirigen o delegan al flujo canónico.
- [ ] No quedan interfaces duplicadas activas para el mismo workflow.

## 9. Casos mínimos de prueba

### Caso A · Borrador insuficiente

- Dos comparables válidos.
- Debe calcular y guardar borrador si la metodología lo permite.
- No debe poder enviarse a revisión.

### Caso B · Revisión válida

- Tres comparables aceptados.
- Debe avanzar a revisión.
- Debe generar nueva versión y decisión.

### Caso C · Exclusión obligatoria

- Excluir un comparable sin motivo debe fallar.
- Excluir con motivo debe persistir actor, fecha y razón.

### Caso D · Permiso insuficiente

- Un partner intenta aprobar o emitir.
- Debe recibir `403` y el estado debe permanecer intacto.

### Caso E · Sin datos de mercado

- Generar candidatos sin listings ni transacciones compatibles.
- Debe devolver lista vacía y advertencia, no datos sintéticos.

## 10. Criterio de cierre

El Módulo II se considera aceptado sólo cuando:

1. Todos los puntos críticos de creación, evidencia, workflow y seguridad estén aprobados.
2. Exista al menos un caso completo desde borrador hasta emisión en staging.
3. El informe emitido coincida con su snapshot versionado.
4. Se documenten observaciones, responsables y fecha de aceptación.
5. Las dependencias de datos pendientes queden registradas y aceptadas por el cliente.
