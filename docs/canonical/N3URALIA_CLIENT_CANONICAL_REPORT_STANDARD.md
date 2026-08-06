# Estándar de informe canónico N3uralia hacia el Cliente

Estado: **vigente**  
Versión: **1.0**  
Fecha de adopción: **5 de agosto de 2026**

## 1. Propósito

Este estándar define el tipo de informe que debe utilizar el portal para las entregas ejecutivas de N3uralia hacia el Cliente.

El informe tiene dos funciones simultáneas:

1. comunicar con claridad los resultados, avances y funcionalidades disponibles;
2. conservar trazabilidad suficiente para revisión, aceptación, hitos contractuales y seguimiento comercial.

No reemplaza la aceptación del Cliente, las pruebas UAT, la capacitación, la transferencia ni la confirmación de pago.

## 2. Nombre canónico

**Informe Canónico N3uralia hacia Cliente**

Identificador técnico:

`n3uralia_client_canonical`

Todo informe generado bajo este estándar debe quedar registrado en `knowledge_documents` con las etiquetas:

- `canonical`;
- `n3uralia-client-report`;
- `client-facing`;
- período del informe;
- estado de entrega;
- hito y estado de pago cuando corresponda.

## 3. Fuente y reglas de verdad

La redacción puede ser asistida por IA, pero el contenido debe construirse exclusivamente desde un paquete de fuentes canónicas autorizado.

Reglas obligatorias:

- no inventar cifras, avances, fechas, estados, conclusiones ni compromisos;
- no usar datos demo, mockups, snapshots excluidos o usuarios técnicos como evidencia comercial;
- no convertir datos ausentes en cero;
- no completar vacíos con conocimiento externo;
- distinguir hechos verificados, implementación parcial, dependencia del Cliente y trabajo pendiente de N3uralia;
- conservar referencias de evidencia para cada afirmación material;
- declarar las limitaciones y datos no evaluables;
- someter toda versión distribuible a revisión humana.

## 4. Arquitectura obligatoria

Cada informe debe contener, como mínimo:

1. portada, período y fecha de corte;
2. resumen ejecutivo;
3. desempeño y evidencia del período;
4. avances y funcionalidades del portal;
5. estado técnico, seguridad y despliegue;
6. alineación contractual;
7. dependencias y decisiones requeridas del Cliente;
8. próximos hitos de N3uralia;
9. limitaciones, fuentes y trazabilidad;
10. estado de entrega y, cuando aplique, hito comercial o de pago.

La profundidad puede cambiar según el período y la audiencia, pero no debe cambiar la lógica ni las reglas de evidencia.

## 5. Configuración OpenAI

La generación editorial autorizada utiliza la Responses API con configuración orientada a máxima calidad:

- proveedor: OpenAI;
- modelo predeterminado: `gpt-5.6-sol`;
- variable de override: `OPENAI_CANONICAL_REPORT_MODEL`;
- esfuerzo de razonamiento predeterminado: `max`;
- modo de razonamiento predeterminado: `pro`;
- salida estructurada mediante JSON Schema;
- `store: false`;
- clave exclusivamente server-side mediante `OPENAI_API_KEY`.

La ausencia de `OPENAI_API_KEY` bloquea la generación asistida. El sistema no debe reemplazarla silenciosamente con un informe especulativo.

## 6. Contrato de entrada

El generador recibe un paquete estructurado con:

- título, Cliente, audiencia y propósito;
- período inicial, período final y fecha de corte;
- evidencia verificada con identificador, afirmación y fuente;
- funcionalidades del portal y su estado;
- avance contractual y dependencias;
- acciones pendientes del Cliente;
- próximos pasos de N3uralia;
- destinatario y estado de entrega;
- hito y estado de pago, cuando corresponda.

Si el paquete no cumple el contrato, la generación debe detenerse y solicitar corrección del paquete fuente.

## 7. Estado de entrega y pago

Los estados de entrega autorizados son:

- `draft`;
- `sent`;
- `resent`;
- `acknowledged`.

Los estados de pago autorizados son:

- `not_applicable`;
- `pending`;
- `received`.

Una entrega o reenvío para solicitar pago no puede registrarse como pago recibido.

## 8. Informe de referencia adoptado

El informe de referencia para la versión 1.0 es:

**Informe ejecutivo Property Partners — enero a julio 2026**

Características:

- corte de fuentes: 31 de julio de 2026;
- desempeño comercial enero-julio;
- radiografía operacional de julio;
- diagnóstico por oficina;
- conclusiones de gestión;
- avances y funcionalidades del portal;
- estado técnico y contractual;
- dependencias y próximos hitos;
- salida en PDF y DOCX con huellas SHA-256 registradas.

Estado comercial registrado:

- destinatario: Pedro Pablo;
- entrega: reenviada;
- propósito: solicitud del pago correspondiente al 50% de la plataforma;
- estado del pago: pendiente de confirmación.

## 9. Implementación en el portal

Rutas vigentes:

- `/dashboard/reportes/canonicos`: registro y estándar de informes canónicos hacia el Cliente;
- `/api/management/reports/canonical-client`: configuración y generación autorizada para CEO/administración.

El endpoint persiste el resultado en `knowledge_documents` y registra la operación en `report_directory_audit_log` cuando la auditoría está disponible.

## 10. Criterio de publicación

Un informe puede enviarse al Cliente sólo cuando:

- el paquete de fuentes fue validado;
- todas las cifras materiales tienen evidencia;
- las dependencias están declaradas;
- el estado contractual no se presenta con mayor certeza que la evidencia disponible;
- el destinatario y propósito están confirmados;
- una persona autorizada realizó la revisión final;
- la copia y sus huellas quedaron registradas.
