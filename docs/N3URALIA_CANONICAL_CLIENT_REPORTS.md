# Informes Canónicos N3uralia para Cliente

## Tipo oficial

- Código: `n3uralia_client_canonical`
- Nombre: `Informe Canónico N3uralia para Cliente`
- Uso: informes ejecutivos publicados o entregados desde el portal a clientes de N3uralia.
- Plantilla de referencia inicial: `Informe Ejecutivo Property Partners — Enero a Julio 2026`.

## Estructura obligatoria

1. Portada: cliente, período, corte canónico, versión y estado.
2. Resumen ejecutivo.
3. Métricas canónicas y tendencias.
4. Conclusiones, riesgos y oportunidades.
5. Avances y funcionalidades del portal.
6. Estado técnico y contractual.
7. Próximos hitos, dependencias y decisiones.
8. Metodología, fuentes, limitaciones y trazabilidad.

## Metadatos obligatorios

`report_id`, `report_type`, `version`, `generated_at`, `period_start`, `period_end`, `canonical_cutoff`, `client`, `recipient`, `source_hashes`, `model`, `reasoning_effort`, `prompt_template_version`, `status`, `delivery_status`, `commercial_milestone`, `approval_status`.

## Reglas canónicas

- Generar exclusivamente desde datos canónicos validados.
- No inventar, completar, corregir ni reconciliar datos ausentes.
- Mostrar ausencias como `N/D` o `No evaluable`.
- Marcar cada cifra como literal o derivada y conservar fórmula, universo, corte y fuente.
- Mantener separados universos operativos, de alcance y de acreditación comercial.
- No declarar aceptación, pago, UAT, capacitación, despliegue o cierre contractual sin evidencia.
- Los reportes demo, legacy, deterministas o de fallback nunca pueden adquirir estado canónico.
- Una falla del modelo debe cerrar la generación con error; no se permite fallback que produzca un informe canónico.
- Registrar el modelo efectivamente usado y la versión del prompt.
- `OPENAI_API_KEY` debe permanecer exclusivamente en el entorno servidor.

## Modelo de generación

- Variable opcional: `OPENAI_REPORT_MODEL`.
- Valor por defecto: `gpt-5.6-sol`.
- API: OpenAI Responses API.
- Esfuerzo recomendado para informe final: `high`.
- El backend debe validar acceso al modelo y registrar el identificador devuelto por la API.

## Estado comercial del informe inicial

El informe enero–julio 2026 fue declarado por Juan Vial Comber como reenviado a Pedro Pablo para solicitar el pago del hito correspondiente al 50% de la plataforma. La declaración se registró el 6 de agosto de 2026 a las 09:53 CLT. El momento original del envío no fue informado. El pago y la aceptación permanecen pendientes de confirmación documental.
