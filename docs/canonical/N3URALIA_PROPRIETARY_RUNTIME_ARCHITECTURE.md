# Arquitectura propietaria de ejecución N3uralia

## Decisión obligatoria

El repositorio que será entregado o administrado por Property Partners no puede contener el código fuente del motor propietario de N3uralia.

Cualquier código incluido en ese repositorio debe considerarse accesible al Cliente, aunque el repositorio sea privado, el código esté minificado o exista una licencia restrictiva.

Por lo tanto, la protección real exige separación física de repositorios y separación de ejecución.

## Arquitectura objetivo

### Repositorio del Cliente

Debe contener únicamente:

- interfaz web;
- rutas y componentes del producto Property Partners;
- contratos de API y tipos públicos;
- adaptadores de datos del Cliente;
- documentación canónica;
- migraciones y configuraciones específicas del Cliente;
- clientes SDK sin lógica propietaria;
- validaciones de entrada y presentación de resultados.

No debe contener:

- prompts de sistema;
- reglas internas de razonamiento;
- scoring propietario;
- lógica de priorización;
- heurísticas;
- orquestadores de agentes;
- plantillas internas de análisis;
- cadenas de decisión;
- memoria estratégica reutilizable;
- lógica transversal reutilizable entre clientes;
- secretos o claves de servicio N3uralia.

### Repositorio privado N3uralia

Debe permanecer bajo control exclusivo de N3uralia y contener:

- motor de inteligencia;
- agentes y orquestadores;
- prompts y políticas internas;
- modelos de scoring;
- reglas de interpretación;
- normalización propietaria;
- lógica de recomendación;
- memoria y contexto reutilizable;
- evaluación de confianza;
- herramientas internas de auditoría;
- conectores genéricos reutilizables.

### Servicio de ejecución N3uralia

El motor debe desplegarse como un servicio separado, controlado por N3uralia.

El repositorio del Cliente sólo debe consumir una API versionada mediante autenticación de servicio a servicio.

Flujo:

```text
Property Partners App
  -> API adapter del Cliente
  -> N3uralia Runtime API
  -> motor propietario N3uralia
  -> respuesta mínima y tipada
  -> UI / reportes del Cliente
```

## Contrato de API

La API sólo puede devolver resultados necesarios para el producto:

- identificador de ejecución;
- versión del contrato;
- resultado final;
- evidencia autorizada;
- clasificación de fuente;
- nivel de confianza;
- advertencias;
- acciones permitidas;
- referencias de auditoría no sensibles.

No puede devolver:

- prompts;
- instrucciones internas;
- reglas completas;
- pesos del modelo;
- trazas de razonamiento;
- chain of thought;
- stack traces internos;
- nombres de módulos privados;
- secretos;
- payloads completos de otros clientes.

## Datos de Property Partners

Los datos canónicos de Property Partners deben mantenerse aislados por tenant y propósito.

Reglas:

1. no reutilizar datos del Cliente para otros clientes;
2. no usarlos para entrenamiento general;
3. no incorporarlos a benchmarks o demos;
4. no copiar datos identificables al repositorio privado N3uralia;
5. procesar sólo el mínimo necesario;
6. registrar procedencia, período y autorización;
7. aplicar eliminación y retención según contrato;
8. cifrar tránsito y almacenamiento;
9. impedir cruces entre tenants;
10. separar evidencia del Cliente de modelos e inferencias N3uralia.

## Autenticación y autorización

La comunicación debe utilizar:

- credenciales de servicio por ambiente;
- rotación de secretos;
- scopes mínimos;
- allowlist de origen o red cuando sea posible;
- rate limiting;
- firma o token de corta duración;
- auditoría por ejecución;
- revocación inmediata.

Las credenciales del runtime N3uralia no deben quedar en el repositorio del Cliente ni ser visibles para usuarios finales.

## Protección de distribución

No se considera protección suficiente:

- minificación;
- ofuscación;
- archivos compilados dentro del mismo repositorio;
- comentarios legales sin separación técnica;
- CODEOWNERS cuando el Cliente controla el repositorio;
- ocultar archivos mediante convenciones de nombres.

Estas medidas sólo son complementarias.

## Migración requerida

Antes de transferir el repositorio al Cliente:

1. inventariar módulos propietarios;
2. clasificar cada archivo como `client`, `shared-contract` o `n3uralia-proprietary`;
3. mover los módulos propietarios al repositorio privado N3uralia;
4. crear un contrato API estable;
5. reemplazar imports directos por un SDK cliente mínimo;
6. retirar prompts, reglas y heurísticas del repositorio del Cliente;
7. eliminar historial Git que contenga secretos o código que no deba transferirse;
8. rotar todas las credenciales utilizadas durante el desarrollo;
9. verificar bundles y respuestas de API;
10. ejecutar revisión legal y técnica antes de la entrega.

## Regla de entrega

El repositorio del Cliente puede contener la aplicación y los datos canónicos autorizados, pero no la implementación del motor N3uralia.

El Cliente recibe acceso al servicio contratado y a sus resultados, no al código fuente del motor propietario, salvo acuerdo contractual explícito firmado por N3uralia.
