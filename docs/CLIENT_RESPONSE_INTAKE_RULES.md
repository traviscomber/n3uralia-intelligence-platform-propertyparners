# Reglas de incorporación de respuestas del Cliente

## Propósito

Toda respuesta de Property Partners a una dependencia contractual pendiente debe incorporarse de forma trazable y sin reinterpretación silenciosa.

## Flujo

1. Identificar la respuesta por su ID `PP-*` definido en `docs/CLIENT_INFORMATION_REQUEST_PEDRO_PABLO.md`.
2. Conservar la evidencia original: correo, archivo, acta, documento o aprobación escrita.
3. Validar que la respuesta sea suficiente para el campo solicitado. Una respuesta ambigua permanece `pending`.
4. Actualizar `config/client-dependencies-status.json`:
   - `received`: se recibió evidencia, pero todavía requiere validación/aprobación;
   - `approved`: la definición o fuente puede utilizarse como canónica;
   - `waived`: el Cliente declara explícitamente que el requisito no se utilizará o queda fuera de aceptación.
5. Agregar la referencia de evidencia al arreglo `evidence` del ítem correspondiente.
6. Cuando la respuesta defina una regla de negocio, versionarla en la capa de configuración/persistencia correspondiente; no hardcodearla sólo en UI o API.
7. Ejecutar los verificadores contractuales y el build antes de publicar el cambio.

## Reglas de seguridad y confianza

- No copiar secretos, contraseñas ni tokens al repositorio.
- No inferir aprobación a partir de silencio o mensajes informales incompletos.
- No sustituir datos faltantes por mocks en producción.
- No convertir una opinión o ejemplo en regla global sin confirmación explícita.
- Mantener fechas de vigencia cuando una definición pueda cambiar en el tiempo.
- Los archivos con datos personales o comerciales sensibles deben almacenarse en el sistema autorizado, no como contenido público del repositorio.

## Criterio de cierre

Una dependencia deja de bloquear el cierre sólo cuando su estado y evidencia son coherentes, el software consume la definición/fuente de manera reproducible y el requisito correspondiente puede verificarse contra la matriz contractual.
