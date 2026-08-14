# Matriz de transferencia, continuidad y propiedad

## Objetivo

Asegurar que Property Partners pueda operar la plataforma conforme al contrato sin recibir el código fuente, prompts, reglas, modelos, heurísticas ni componentes reutilizables que constituyen propiedad intelectual de N3uralia.

## Principio operativo

La continuidad del servicio se mantiene mediante una separación entre aplicación del cliente y runtime privado de N3uralia. La transferencia del repositorio del cliente no transfiere la implementación del motor propietario.

## Matriz

| Componente | Entrega al cliente | Operación posterior | Propiedad y límite |
|---|---:|---|---|
| Interfaz web y navegación | Sí | Property Partners o proveedor autorizado | Código específico de la aplicación entregable |
| Configuración visual y brandbook aprobado | Sí | Property Partners | Material canónico del cliente |
| Datos canónicos, CRM, metas y documentos del cliente | Sí, según contrato | Property Partners | Información del cliente; no reutilizable por N3uralia fuera del servicio |
| Esquemas y migraciones de datos específicos | Sí | Property Partners | Deben conservar RLS, roles y aislamiento |
| Contratos DTO de integración | Sí | Compartida | Sólo interfaces; no incluyen implementación propietaria |
| Cliente SDK para runtime N3uralia | Sí | Property Partners | Adaptador mínimo, sin prompts ni reglas |
| Reportes y resultados autorizados | Sí | Property Partners | Resultado entregable; no revela el motor |
| Motor de razonamiento | No | N3uralia | Propiedad exclusiva de N3uralia |
| Agentes y orquestadores | No | N3uralia | Propiedad exclusiva de N3uralia |
| Prompts, políticas, scoring y heurísticas | No | N3uralia | No deben existir en el repositorio transferido |
| Memoria y metodologías reutilizables | No | N3uralia | Separadas de la evidencia del cliente |
| Credenciales del runtime privado | No | N3uralia | Sólo en infraestructura controlada por N3uralia |
| Credenciales de servicios del cliente | Según titularidad contractual | Titular correspondiente | Se rotan durante la transferencia |

## Requisitos de continuidad

Antes de retirar cualquier implementación local propietaria:

1. el runtime privado debe estar desplegado y disponible;
2. el contrato de API debe estar versionado;
3. preview y producción deben superar pruebas funcionales;
4. debe existir timeout, manejo de errores y observabilidad sin datos sensibles;
5. debe existir procedimiento de degradación controlada;
6. las credenciales nuevas deben probarse antes de revocar las antiguas;
7. los reportes, cierres mensuales y envíos contractuales deben continuar operativos.

## Criterios de aceptación antes de transferir GitHub

- No existen prompts, reglas, scoring, heurísticas ni trazas internas en el repositorio o sus ramas activas.
- No existen secretos en archivos, historial entregable, logs o artefactos.
- Los bundles del navegador no contienen módulos server-only ni inteligencia propietaria.
- Las APIs devuelven únicamente resultados mínimos autorizados.
- Las rutas con datos requieren autenticación y autorización por rol y tenant.
- El service role de Supabase permanece exclusivamente en servidor.
- RLS y políticas de acceso fueron verificadas.
- No existe reutilización cross-tenant ni incorporación de datos de Property Partners a datasets generales.
- El runtime privado tiene monitoreo, versionado y soporte acordado.
- Se completó una prueba de continuidad y rollback.

## Evidencia de cierre

La transferencia requiere un registro firmado o aprobado que indique:

- commit exacto entregado;
- inventario de repositorios y servicios;
- variables de entorno por propietario, sin mostrar valores;
- resultado de auditorías de exposición, aislamiento y secretos;
- fecha de rotación y revocación de credenciales;
- responsable operativo de cada componente;
- SLA o condiciones de operación del runtime privado;
- excepciones contractuales aprobadas.

## Prohibición de entrega prematura

No se debe transferir control administrativo definitivo del repositorio mientras contenga código propietario de N3uralia o referencias recuperables en ramas y tags que formen parte de la entrega. La continuidad contractual no justifica entregar la implementación del motor: debe resolverse mediante el runtime privado y el contrato de servicio.
