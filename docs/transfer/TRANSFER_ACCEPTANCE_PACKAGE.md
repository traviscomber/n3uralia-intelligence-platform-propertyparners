# Paquete de transferencia y aceptación

Fecha: 1 de agosto de 2026.

## 1. Objetivo

Definir el contenido, evidencia y controles requeridos para transferir el sistema a un tercero autorizado sin depender del entorno personal del equipo desarrollador.

Este documento no declara la transferencia completada. Es el manifiesto de cierre.

## 2. Inventario del paquete

### Código y versiones

- repositorio privado completo;
- historial Git;
- branch principal estable;
- tags o commit de entrega;
- pull requests de cierre;
- lockfile;
- migraciones Supabase;
- configuración `vercel.json`;
- `.env.example` sin valores reales.

### Documentación

- README;
- matriz contractual;
- instalación y recuperación;
- modelo y diccionario de datos;
- manual de usuario por rol;
- manual de administración;
- checklists UAT de los tres módulos;
- inventario de fuentes y dependencias;
- revisión de seguridad y funciones privilegiadas;
- historial de decisiones de alcance.

### Infraestructura

- proyecto GitHub o transferencia del repositorio;
- proyecto Vercel, dominios y aliases;
- proyecto Supabase, Auth, base, backups y logs;
- variables de entorno y secretos transferidos mediante canal seguro;
- proveedor de correo cuando exista;
- responsables y propietarios de cada servicio.

### Evidencia

- último CI exitoso;
- último Production deployment `READY`;
- manifest de QA autenticada;
- prueba de instalación desde cero;
- prueba de recuperación o rollback;
- evidencia de importación autorizada;
- evidencia de un caso completo de valorización;
- evidencia de reportes y distribución;
- acta de capacitación;
- acta de aceptación o lista de pendientes firmada.

## 3. Matriz de accesos

| Servicio | Propietario previo | Propietario receptor | Acceso transferido | 2FA | Fecha | Evidencia |
|---|---|---|---|---|---|---|
| GitHub | Pendiente | Pendiente | Pendiente | Pendiente | — | — |
| Vercel | Pendiente | Pendiente | Pendiente | Pendiente | — | — |
| Supabase | Pendiente | Pendiente | Pendiente | Pendiente | — | — |
| Dominio/DNS | Pendiente | Pendiente | Pendiente | Pendiente | — | — |
| Correo | No integrado | Pendiente | Pendiente | Pendiente | — | — |

No incluir contraseñas o tokens en esta tabla.

## 4. Manifiesto de versión

Completar al cierre:

```text
Repositorio:
Commit de entrega:
Tag:
Fecha UTC:
CI run:
Deployment Production ID:
URL productiva:
Supabase project ref:
Migración más reciente:
Responsable emisor:
Responsable receptor:
```

## 5. Checksums y archivos

Para cualquier ZIP o exportación fuera de Git:

```bash
sha256sum property-partners-delivery-<version>.zip
```

Registrar:

- nombre exacto;
- tamaño;
- SHA-256;
- fecha;
- canal de entrega;
- receptor;
- confirmación de apertura.

No incluir `.env.local`, claves privadas, dumps productivos ni credenciales dentro del ZIP.

## 6. Prueba de despliegue independiente

El receptor debe ejecutar:

1. clonación limpia;
2. instalación con lockfile congelado;
3. configuración de un Supabase de staging;
4. aplicación de migraciones;
5. configuración de variables;
6. build local;
7. deployment Preview;
8. QA por rol;
9. importación sintética o autorizada;
10. generación de un reporte y una valorización de prueba.

Resultado esperado:

- build exitoso;
- Preview `READY`;
- sin errores críticos de runtime;
- RLS correcto;
- documentación suficiente para resolver fallos sin asistencia informal.

## 7. UAT mínimo

### Módulo I

- fuente autorizada;
- raw record y hash;
- validación y conteos;
- propiedad/publicación/transacción vinculadas;
- deduplicación revisada;
- estadísticas coherentes;
- exportación equivalente a pantalla.

### Módulo II

- creación en `draft`;
- comparables trazables;
- exclusión con motivo;
- revisión, devolución, aprobación y emisión;
- snapshots y log de decisiones;
- PDF coherente con versión emitida.

### Módulo III

- entidades y roles correctos;
- importación de métricas;
- conciliación y aprobación;
- dashboard usando valor persistido aprobado;
- metas y alertas aprobadas;
- reporte programado;
- distribución registrada;
- ejecución automática o manual validada.

## 8. Capacitación

Registrar por sesión:

| Fecha | Tema | Instructor | Asistentes | Material | Preguntas | Resultado |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | Pendiente |

Sesiones mínimas:

- CEO/administración ejecutiva;
- dirección/subdirección;
- partners;
- administración técnica y recuperación.

## 9. Pendientes externos que no bloquean código, pero sí aceptación

- fuentes reales CBRS, ventas del Cliente y KML oficial;
- autorización y mecanismo productivo para Portal;
- diccionario oficial de KPI, rankings y alertas;
- configuración productiva de `CRON_SECRET`;
- proveedor de correo y prueba de entrega;
- cuentas QA, incluida subdirección;
- prueba limpia de reconstrucción;
- capacitación y firma del Cliente.

Cada pendiente debe tener responsable, fecha objetivo y criterio de cierre.

## 10. Revocación y rotación posterior

Una vez confirmada la transferencia:

1. rotar secretos compartidos;
2. retirar accesos personales que ya no correspondan;
3. verificar propietarios y administradores;
4. confirmar 2FA;
5. revisar logs de acceso;
6. conservar al menos una cuenta de emergencia bajo control del receptor;
7. documentar el cierre.

## 11. Criterio de transferencia completa

La transferencia sólo se marca completa cuando:

- el receptor controla los servicios;
- reconstruye el sistema sin archivos privados del emisor;
- ejecuta UAT acordado;
- recibe manuales y modelo de datos;
- recibe secretos por canal seguro y los rota;
- se registran capacitación y aceptación;
- no quedan hallazgos críticos o altos sin responsable y aceptación explícita.
