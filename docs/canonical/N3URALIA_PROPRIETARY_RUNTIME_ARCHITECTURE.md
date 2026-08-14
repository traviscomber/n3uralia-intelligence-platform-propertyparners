# Protección del código propietario N3uralia

## Decisión vigente

La aplicación de Property Partners puede continuar funcionando como una sola plataforma y dentro del mismo despliegue de Vercel.

No existe una obligación técnica de dividir el producto en dos servicios ni de mover el motor a otro proveedor. La prioridad es proteger únicamente la lógica diferencial de N3uralia que no corresponde al core inmobiliario de Property Partners.

La arquitectura operativa principal es `local-server-only`.

## Qué permanece en el proyecto Property Partners

Debe permanecer en el proyecto todo lo necesario para operar el negocio contratado:

- CRM, contactos, propiedades y operaciones;
- dashboards y flujos inmobiliarios;
- autenticación, roles y permisos;
- valorizaciones y reportes específicos del Cliente;
- integraciones de Property Partners;
- componentes visuales y experiencia de usuario;
- modelos, reglas y datos propios del negocio inmobiliario;
- rutas API y procesos server-side necesarios para la operación;
- despliegue y ejecución en Vercel.

No debe separarse código sólo por ser complejo o por haber sido desarrollado por N3uralia. La clasificación depende de su función y reutilización, no de su autoría.

## Qué se considera propietario de N3uralia

La protección especial se limita a elementos diferenciales y reutilizables fuera de Property Partners:

- heurísticas generales reutilizables;
- reglas de inferencia transversal;
- scoring propietario genérico;
- priorización de señales, riesgos y acciones;
- prompts internos;
- orquestadores y metodología reutilizable entre clientes;
- memoria estratégica genérica;
- lógica de recomendación no específica del negocio de Property Partners.

Estos módulos pueden permanecer en el mismo repositorio mientras N3uralia conserve su control y no exista una transferencia del código fuente al Cliente.

## Protección dentro del mismo despliegue

Los módulos propietarios deben:

1. declarar `server-only`;
2. ser importados únicamente desde componentes servidor, rutas API o procesos backend;
3. quedar excluidos de bundles del navegador;
4. no exponer prompts, reglas, scoring, heurísticas o trazas internas;
5. devolver a la UI sólo resultados mínimos y tipados;
6. evitar logs con secretos, evidencia sensible o lógica interna;
7. mantener separación clara respecto de la lógica específica de Property Partners;
8. permanecer bajo control de acceso de N3uralia en GitHub y Vercel.

La minificación u ofuscación no reemplazan estas protecciones.

## Respuestas permitidas

Las APIs y componentes pueden consumir y mostrar:

- señales finales;
- riesgos finales;
- acciones recomendadas;
- severidad, prioridad y dominio;
- evidencia autorizada y no sensible;
- nivel de confianza cuando corresponda;
- estado operativo y advertencias de disponibilidad.

No deben devolver:

- prompts;
- instrucciones internas;
- reglas completas;
- pesos o fórmulas de scoring;
- cadenas de razonamiento;
- stack traces internos;
- nombres de módulos privados;
- secretos;
- datos de otros clientes.

## Runtime remoto opcional

Los modos `shadow` y `remote` se mantienen únicamente como una opción futura.

Pueden ser útiles si posteriormente ocurre alguna de estas condiciones:

- transferencia del repositorio al Cliente;
- acceso directo del Cliente al código fuente;
- reutilización del motor en múltiples productos;
- exigencia contractual de separación;
- necesidad operativa de desplegar el motor de forma independiente.

Mientras esas condiciones no existan, `local-server-only` es una arquitectura válida y preferida por simplicidad operacional.

## Regla ante una eventual transferencia

Antes de entregar al Cliente una copia o control del repositorio, se debe realizar una revisión específica. Sólo en ese momento será obligatorio decidir entre:

- retirar los módulos propietarios de la copia entregable;
- mantenerlos en un repositorio o paquete privado controlado por N3uralia;
- reemplazarlos por una API privada;
- acordar contractualmente una licencia o cesión explícita.

No se debe ejecutar una extracción física anticipada que complique el producto sin una necesidad contractual real.

## Criterio operativo

Property Partners recibe y opera todas las funcionalidades contratadas. N3uralia protege únicamente su metodología reutilizable y diferencial, sin fragmentar innecesariamente la plataforma ni alterar su funcionamiento en Vercel.
