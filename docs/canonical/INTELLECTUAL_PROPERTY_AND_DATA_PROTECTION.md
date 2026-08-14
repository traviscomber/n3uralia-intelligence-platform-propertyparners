# Protección de propiedad intelectual y datos

## Propósito

Este documento define la separación obligatoria entre:

1. la propiedad intelectual, modelos, agentes, reglas, arquitectura y código de N3uralia;
2. los datos, documentos, configuraciones y evidencia canónica entregados por Property Partners;
3. los resultados generados para uso autorizado dentro de la plataforma.

La protección no depende de ocultar nombres de archivos ni de minificar código. Todo componente enviado al navegador debe considerarse visible. La inteligencia propietaria debe ejecutarse únicamente en infraestructura controlada del lado servidor.

## Titularidad y separación

### Propiedad de N3uralia

Pertenecen a N3uralia, salvo acuerdo escrito distinto:

- motores de inteligencia y razonamiento;
- agentes, orquestadores y modelos;
- reglas de inferencia, scoring, priorización y recomendación;
- prompts de sistema y políticas internas;
- arquitectura, librerías, pipelines y código fuente;
- metodologías generales reutilizables que no contengan datos del cliente;
- mecanismos de observabilidad, evaluación y aprendizaje;
- mejoras generales del producto que no revelen información de Property Partners.

### Información de Property Partners

La información canónica de Property Partners se considera información del cliente y no forma parte de la propiedad intelectual reutilizable de N3uralia:

- CRM, metas, presentaciones y documentos entregados;
- datos de personas, oficinas, operaciones y propiedades;
- configuraciones específicas del negocio;
- resultados, reportes y análisis que permitan reconstruir datos confidenciales del cliente;
- archivos contenidos o referenciados por `docs/canonical` cuando correspondan al cliente;
- secretos, credenciales, destinatarios y registros de entrega.

N3uralia puede procesar esta información únicamente para prestar el servicio autorizado. No debe exponerla, publicarla, venderla, entrenar modelos generales con ella ni reutilizarla para otro cliente.

## Regla de no contaminación

El motor N3uralia debe mantener separación explícita entre:

- `client_evidence`: evidencia entregada o aprobada por Property Partners;
- `external_market`: información externa autorizada y atribuida;
- `n3uralia_model`: metodología o cálculo propietario;
- `n3uralia_inference`: interpretación generada por N3uralia.

Una salida debe conservar procedencia suficiente para distinguir datos del cliente de inferencias y modelos propietarios. La evidencia canónica de Property Partners no puede copiarse a datasets globales, ejemplos públicos, demostraciones, benchmarks ni repositorios compartidos.

## Protección del código propietario

### Obligatorio

- Mantener el repositorio privado.
- Restringir acceso por mínimo privilegio.
- Exigir pull request y revisión para `main`, `lib/`, `app/api/`, `supabase/`, `docs/canonical/` y configuraciones de despliegue.
- Ejecutar motores, prompts, reglas e integraciones sensibles exclusivamente en servidor.
- Marcar módulos propietarios como server-only y prohibir su importación desde componentes con `use client`.
- Exponer por API únicamente resultados mínimos necesarios, nunca prompts, reglas internas, trazas completas ni código.
- Mantener claves y secretos sólo en variables de entorno no públicas.
- Prohibir secretos con prefijo `NEXT_PUBLIC_` salvo valores diseñados expresamente para ser públicos.
- Separar entornos de desarrollo, preview y producción.
- Rotar credenciales al cambiar colaboradores o detectar exposición.
- Mantener auditoría de acceso, cambios, ejecuciones y exportaciones.

### No se considera protección suficiente

- minificación;
- ofuscación de JavaScript;
- nombres crípticos;
- ocultar rutas en la interfaz;
- comentarios de confidencialidad sin controles técnicos;
- confiar en que una URL no será descubierta.

El código que llega al navegador puede inspeccionarse. La única protección efectiva de la inteligencia central es no enviarla al navegador.

## Arquitectura mínima requerida

### Capa cliente

Puede contener:

- presentación visual;
- formularios y validaciones no sensibles;
- datos ya autorizados para el usuario autenticado;
- identificadores opacos;
- resultados agregados necesarios para la interfaz.

No puede contener:

- prompts propietarios;
- algoritmos de scoring o decisión;
- reglas completas de inferencia;
- claves de servicio;
- consultas con privilegios administrativos;
- datasets canónicos completos;
- trazas internas de agentes;
- lógica que permita reconstruir el motor N3uralia.

### Capa servidor

Debe contener:

- motor N3uralia;
- agentes y orquestación;
- prompts y políticas;
- acceso privilegiado a Supabase;
- integraciones de correo y cron;
- reconciliación de datos;
- generación de reportes;
- autorización por rol y tenant;
- auditoría y controles de exportación.

### Persistencia

- Cifrado en tránsito mediante TLS.
- Cifrado en reposo provisto por la plataforma y, cuando corresponda, cifrado adicional por campo para información especialmente sensible.
- RLS y autorización por rol para datos operativos.
- Service role únicamente en servidor.
- Backups protegidos y con acceso restringido.
- Política de retención y eliminación definida.

## Protección de APIs

Toda API que acceda a datos o inteligencia debe aplicar:

1. autenticación;
2. autorización por rol y alcance;
3. validación estricta de entrada;
4. rate limiting cuando corresponda;
5. respuesta mínima necesaria;
6. registro de auditoría sin secretos ni contenido sensible completo;
7. prevención de enumeración de recursos;
8. control de exportaciones y descargas;
9. protección CSRF para operaciones de sesión cuando aplique;
10. idempotencia en procesos de envío o ejecución repetible.

Las rutas cron deben usar secreto servidor y no deben quedar públicas sin autenticación. Las rutas de preview deben requerir sesión o acceso temporal controlado cuando muestren información del cliente.

## Logs, telemetría y proveedores externos

- No registrar claves, tokens, cookies, payloads completos ni documentos canónicos.
- Redactar PII y datos comerciales sensibles.
- Enviar a proveedores externos sólo la información mínima necesaria.
- Verificar las condiciones de retención y uso de datos de cada proveedor.
- No habilitar entrenamiento con datos de Property Partners.
- Mantener trazabilidad de qué proveedor procesó qué clase de información.

## Uso de modelos de IA

Antes de enviar datos a un modelo externo:

- confirmar que el caso está autorizado;
- minimizar y anonimizar la información;
- evitar documentos completos cuando baste un extracto;
- excluir secretos y credenciales;
- usar configuraciones sin entrenamiento o reutilización del contenido;
- registrar la clase de datos enviada y el propósito;
- conservar la separación entre evidencia del cliente e inferencia de N3uralia.

## Exportación y entrega

Los reportes entregados al cliente pueden contener resultados autorizados, pero no deben revelar:

- prompts internos;
- código fuente;
- pesos, reglas o fórmulas propietarias no acordadas;
- trazas completas del razonamiento;
- secretos de infraestructura;
- información de otros clientes o datasets globales.

## Salida del cliente y eliminación

Al finalizar el servicio:

- exportar la información del cliente conforme al contrato;
- revocar accesos y credenciales;
- eliminar o anonimizar copias operativas según la política acordada;
- conservar únicamente registros exigidos legal o contractualmente;
- mantener el código y la inteligencia propietaria de N3uralia separados de la entrega de datos del cliente.

## Control de cambios

Este documento es canónico. Cualquier excepción debe quedar aprobada por escrito y registrada mediante pull request. Los cambios en límites de datos, proveedores, exposición de APIs o ejecución cliente/servidor requieren revisión de seguridad antes de merge.
