# Clasificación del código N3uralia y continuidad contractual

## Objetivo

Proteger la propiedad intelectual de N3uralia sin interrumpir la operación contratada de Property Partners.

La plataforma entregada al cliente debe continuar funcionando. La separación del código se realizará por sustitución progresiva: primero se define el contrato estable, luego se conecta el runtime privado y sólo después se retira la implementación propietaria del repositorio que recibirá el cliente.

## Regla de continuidad

Ningún módulo operativo se elimina mientras no exista un reemplazo remoto validado en producción.

Cada extracción exige:

1. contrato API versionado;
2. autenticación servicio a servicio;
3. timeouts y manejo de errores;
4. observabilidad sin contenido sensible;
5. prueba de equivalencia funcional;
6. rollback documentado;
7. período de operación paralela cuando el riesgo lo requiera.

## Clases

### `client`

Puede permanecer en el repositorio que recibirá Property Partners:

- interfaz y experiencia de usuario;
- páginas y componentes visuales;
- branding específico del cliente;
- rutas de navegación;
- contratos y tipos públicos de API;
- adaptadores sin lógica propietaria;
- migraciones y esquemas específicos del tenant;
- documentación y datos canónicos de Property Partners;
- generación visual de salidas ya aprobadas, cuando no revele metodología propietaria.

### `shared-contract`

Puede permanecer como interfaz estable, pero no debe implementar el motor:

- DTO de entrada y salida;
- enumeraciones de dominio;
- identificadores de evidencia;
- códigos de error;
- versión del protocolo;
- tipos de procedencia;
- cliente HTTP server-side del runtime N3uralia.

### `n3uralia-proprietary`

Debe migrarse a un repositorio y runtime controlados exclusivamente por N3uralia:

- `lib/n3uralia-intelligence-engine.ts`;
- módulos bajo `lib/agents/`;
- orquestadores de inteligencia y decisión;
- prompts de sistema y plantillas internas;
- scoring, priorización, heurísticas y reglas de inferencia;
- reconciliación y metodología reutilizable;
- evaluadores internos y memoria reusable entre clientes;
- trazas internas, políticas y mecanismos de selección de modelos;
- lógica capaz de reconstruir el funcionamiento del motor.

### `client-evidence`

Debe quedar bajo el régimen de datos de Property Partners y no trasladarse al repositorio global de N3uralia:

- CRM y archivos fuente;
- metas, presentaciones y documentos canónicos;
- resultados que permitan reconstruir operaciones del cliente;
- destinatarios, credenciales y registros de envío;
- datos de personas, propiedades y oficinas.

El runtime privado puede procesar esta evidencia sólo durante la ejecución autorizada y con aislamiento por tenant. No debe incorporarla a datasets reutilizables.

## Inventario inicial de alto riesgo

La primera frontera incluye, como mínimo:

| Área | Clasificación | Acción |
|---|---|---|
| `lib/n3uralia-intelligence-engine.ts` | `n3uralia-proprietary` | Extraer al runtime privado |
| `lib/agents/**` | `n3uralia-proprietary` | Extraer al runtime privado |
| `lib/ai-*` | revisión obligatoria | Separar contrato de implementación |
| `lib/intelligence-*` | revisión obligatoria | Clasificar función por función |
| `lib/executive-reasoning*` | `n3uralia-proprietary` | Extraer reglas y heurísticas |
| `lib/intelligence-orchestrator*` | `n3uralia-proprietary` | Extraer orquestación |
| `lib/ai-runtime*` | `n3uralia-proprietary` | Extraer proveedor, prompts y selección |
| `lib/crm-snapshot*` | `client-evidence`/adaptador | Mantener evidencia; extraer inferencia reutilizable |
| `lib/market-snapshot*` | mixto | Separar fuente externa, normalización y modelo |
| `lib/valuation-snapshot*` | mixto | Mantener datos autorizados; extraer metodología propietaria |
| `app/api/**` | `client`/adaptador | Exponer sólo DTO mínimos y autorización |
| `components/**`, `app/**` visual | `client` | Mantener, evitando imports propietarios |
| `docs/canonical/**` | cliente/canónico | Mantener como fuente normativa |

## Patrón de migración

### Estado A — actual

La aplicación ejecuta implementación local server-side.

### Estado B — operación paralela

La aplicación llama al runtime privado y compara silenciosamente el resultado con la implementación local. Las diferencias se registran sin datos sensibles.

### Estado C — runtime privado principal

La aplicación usa el runtime remoto. La implementación local queda deshabilitada como rollback temporal y no se entrega al cliente.

### Estado D — entrega limpia

Se elimina del repositorio del cliente toda implementación propietaria, se limpia el historial correspondiente y se rotan credenciales.

## Criterio de aceptación de los pasos 1–3

Los primeros tres pasos se consideran completos cuando:

- existe inventario documentado y machine-readable;
- cada área crítica tiene clasificación y propietario;
- existe un contrato TypeScript independiente de la implementación;
- la extracción se realiza sin apagar funciones existentes;
- se ha definido un repositorio privado dedicado controlado por N3uralia;
- ninguna evidencia canónica de Property Partners se copia al repositorio privado global.

## Restricción

No debe utilizarse un repositorio v0, un sitio corporativo ni otro proyecto no dedicado como destino improvisado del runtime. El repositorio privado debe crearse específicamente para el motor N3uralia y mantenerse fuera del control administrativo del cliente.
