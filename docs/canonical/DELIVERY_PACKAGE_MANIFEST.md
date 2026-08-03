# Manifiesto del paquete final de entrega

## Propósito

Definir el contenido mínimo, verificable y reproducible del paquete de cierre contractual. La entrega no modifica la titularidad de los materiales: los activos canónicos y operativos del Cliente permanecen bajo propiedad del Cliente; la metodología diferencial reutilizable de N3uralia se trata conforme a la clasificación vigente.

## Identificación de la entrega

Registrar antes del cierre:

- fecha de corte;
- commit de `main`;
- tag o referencia de versión;
- URL de producción;
- proyecto Vercel;
- proyecto Supabase;
- responsable de N3uralia;
- responsable del Cliente;
- resultado de UAT;
- checksum del paquete ZIP.

## Contenido obligatorio

### 1. Código y reconstrucción

- copia del código correspondiente al commit aprobado;
- `package.json` y lockfile;
- instrucciones de instalación, build y ejecución;
- variables de entorno requeridas por nombre, sin valores secretos;
- versiones de Node y pnpm;
- configuración de Next.js;
- migraciones y esquema necesarios para reconstrucción;
- procedimiento de rollback.

### 2. Documentación funcional

- descripción de módulos;
- perfiles, roles y capacidades;
- flujos CEO, Dirección, CRM, mercado, valorización, documentos y reportes;
- reglas de cierre mensual;
- límites conocidos y dependencias de insumos del Cliente;
- diccionario de KPI confirmado y pendientes no confirmados.

### 3. Operación

- manual operativo;
- calendario de reportes y automatizaciones;
- directorio autorizado de destinatarios;
- procedimiento de soporte e incidentes;
- responsables por ambiente;
- procedimiento de alta, baja y cambio de usuarios.

### 4. Seguridad y custodia

- matriz de clasificación de propiedad;
- verificación de secretos y credenciales;
- estado de RLS y aislamiento por tenant;
- inventario de funciones privilegiadas;
- evidencia de source maps deshabilitados;
- revisión de logs y APIs sensibles;
- lista de credenciales que deberán rotarse al transferir control, sin incluir valores.

### 5. Calidad y aceptación

- resultado del build;
- resultado de verificaciones automáticas;
- evidencia de deployment exitoso;
- casos UAT y observaciones;
- acta de aceptación;
- registro de capacitación;
- lista de pendientes posteriores al cierre, si fueron aceptados.

## Exclusiones obligatorias

No incluir en el ZIP:

- `.env` o archivos con valores secretos;
- tokens, cookies, claves privadas o service-role keys;
- dumps no autorizados de producción;
- logs con datos personales o payloads sensibles;
- artefactos internos clasificados como `n3uralia-proprietary` y marcados `exclude-before-transfer`;
- historiales o ramas no aprobadas para entrega;
- archivos temporales, cachés, `.next`, `node_modules` o artefactos locales.

## Inclusiones condicionales

Sólo incluir después de validación específica:

- exportaciones de datos productivos;
- copias de storage;
- credenciales nuevas creadas para el Cliente;
- historial Git completo;
- artefactos de terceros sujetos a licencia;
- elementos clasificados `requires-review`.

## Validación del paquete

Antes de emitir el ZIP:

1. ejecutar build limpio;
2. ejecutar controles de propiedad, credenciales, exposición, tenant y superficie de entrega;
3. confirmar que el commit coincide con la versión aceptada;
4. inspeccionar el contenido final del ZIP;
5. calcular checksum SHA-256;
6. abrir el paquete en un entorno limpio y reconstruir;
7. registrar resultado, responsable y fecha;
8. obtener aprobación explícita antes de transferir control administrativo.

## Estado

Este manifiesto define la estructura de cierre. El paquete se considera `ready` únicamente cuando UAT, capacitación, documentación, dependencias del Cliente y aceptación estén resueltas o formalmente aceptadas como pendientes.
