# Reportin

Reportin es el estándar de generación de PDF ejecutivo para N3uralia Intelligence Platform.

## Autoridad

Aplicar la siguiente jerarquía:

1. Data canónica validada y snapshot persistido.
2. `DESIGN.md` como autoridad visual y de experiencia.
3. Este documento como contrato editorial y técnico del PDF.
4. Componentes compartidos y comportamiento productivo vigente.

## Reglas no negociables

- Generar narrativa únicamente con OpenAI mediante `OPENAI_API_KEY` y el modelo configurado en `OPENAI_CANONICAL_REPORT_MODEL`.
- Usar exclusivamente la data canónica entregada al generador.
- No usar mocks, placeholders, datos ficticios, plantillas narrativas simuladas ni fallbacks que aparenten una generación exitosa.
- No reemplazar valores ausentes por cero.
- Declarar información no disponible, parcial o pendiente.
- Conservar referencias de evidencia para afirmaciones materiales.
- No modificar la data canónica.
- No exponer secretos, nombres internos de tablas, errores de proveedor ni detalles de infraestructura al cliente.
- Fallar de forma cerrada cuando falte la API key, la data no cumpla el contrato o la salida del modelo sea inválida.

## Flujo

1. Validar el paquete canónico.
2. Crear una copia inmutable del contexto.
3. Generar el análisis con OpenAI Responses API.
4. Validar el JSON estructurado.
5. Persistir el informe y su metadata de trazabilidad.
6. Renderizar el PDF con Reportin.
7. Entregarlo mediante una ruta protegida.

## Metadata obligatoria

Cada informe debe registrar:

- proveedor;
- modelo;
- API utilizada;
- esfuerzo y modo de razonamiento;
- fecha de generación;
- política de fuentes `canonical_input_only`;
- versión del estándar Reportin;
- identificador persistido del informe.

## Sistema visual

Seguir `DESIGN.md`. Para informes formales:

- portada negra o carbón con franja roja estructural;
- papel blanco en páginas interiores;
- tipografía sans serif de alta legibilidad;
- títulos negros de alto peso;
- numeración de secciones en rojo;
- encabezado con cliente, producto y corte de datos;
- pie con confidencialidad y número de página;
- tablas con encabezado carbón;
- tarjetas KPI, callouts y estados con color semántico restringido;
- márgenes amplios, alineación exacta y densidad editorial controlada;
- sin gradientes, glow, glassmorphism ni ornamentación decorativa.

## Estructura editorial

El PDF debe incluir, cuando la data lo soporte:

1. Portada.
2. Resumen ejecutivo.
3. Metodología y gobierno de datos.
4. Evidencia y desempeño del período.
5. Estado de funcionalidades y módulos.
6. Estado técnico y seguridad.
7. Alineación contractual.
8. Dependencias y decisiones del cliente.
9. Próximos hitos de N3uralia.
10. Fuentes, limitaciones y trazabilidad.

No crear secciones vacías para simular completitud. Si una sección no tiene data suficiente, declarar la limitación.

## Experiencia durante la generación

Mostrar estados reales o conservadores:

- `validating_canonical_data`
- `calling_openai`
- `validating_output`
- `persisting_report`
- `rendering_pdf`
- `completed`
- `failed`

No afirmar que el modelo está ejecutando una subetapa específica si el backend no la reporta. Mostrar tiempo transcurrido y explicar que la prioridad es calidad y consistencia.

## Seguridad pública

La aplicación desplegada puede servir el PDF desde su dominio público, pero la generación y descarga deben respetar autenticación, rol y alcance organizacional. Nunca aceptar generación anónima con payload arbitrario ni exponer `OPENAI_API_KEY` al navegador.
