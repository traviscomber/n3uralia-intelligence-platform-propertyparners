# Ejecución de cierre contractual — 25 septiembre 2026

## Estado

Este registro ejecuta el cierre técnico que puede realizar N3uralia sin sustituir UAT, asistencia a capacitación ni aceptación formal del Cliente.

## 1. Definiciones KPI recuperadas desde evidencia canónica

Se consideran resueltas por evidencia ya entregada y canonicalizada:

- **Captaciones:** archivos CRM de captadas, con identidad de propiedad, oficina y agente responsable.
- **Productividad:** cierres acreditados del período / ejecutivas del mismo alcance y período. La serie documental enero–junio 2026 usa siete ejecutivas y reproduce 0,57 / 0,43 / 1,00 / 1,14 / 0,57 / 1,14.
- **Scoring de gestión:** fórmula y subscores del Directorio de agosto.
- **Semáforos:** cumplimiento de meta, crecimiento AA y scores según el Directorio de agosto.
- **Rankings:** se publican por una métrica canónica explícita. Para cierres, orden descendente y empate compartido. No se crea un desempate no documentado.

No se debe usar `kpi_snapshots` legacy ni otra capa incompatible como fuente ejecutiva.

## 2. Reportes generados al subir data

Contrato operativo aprobado:

1. una carga canónica completa su importación;
2. se evalúan alertas del mismo período;
3. el sistema vuelve a leer **todo el estado canónico disponible para ese período**, no sólo las filas de la última carga;
4. genera y persiste un nuevo snapshot de revisión;
5. el snapshot global se guarda como `monthly`;
6. los alcances de oficina se guardan como `office`;
7. los alcances personales con métricas canónicas se guardan como `partner`;
8. cada carga conserva `sourceImportRunId`, fuente, período, corte y métricas;
9. Pedro puede revisar el historial dentro de la aplicación y descargar el PDF;
10. una carga parcial nunca convierte un faltante en cero ni presenta un score incompleto como cerrado.

El email deja de ser una condición para generar el reporte. La distribución externa puede configurarse posteriormente sin afectar el archivo interno de revisión.

## 3. UAT

La UAT final se ejecutará por Property Partners/N3uralia en una sesión posterior.

Hasta esa ejecución:

- no marcar `client-acceptance-status.json` como accepted;
- no fijar `acceptedCommit` ni `acceptedDeployment`;
- no cerrar observaciones humanas por inferencia.

## 4. Capacitación y handover

### Material preparado

- manual de usuario por rol;
- manual de administración;
- plan de capacitación y handover;
- pack de ejecución de capacitación;
- arquitectura y modelo de datos;
- scripts/migraciones;
- runbook de instalación y recuperación;
- rollback;
- UAT;
- manifiesto de entrega;
- matriz de accesos;
- registro de dependencias;
- fingerprint de esquema productivo.

### Capacitación

Las sesiones TRN-01 a TRN-05 permanecen `not-scheduled` hasta contar con fecha y asistentes o una renuncia formal del Cliente. Tener el material listo no equivale a impartir capacitación.

### Paquete de transferencia

El paquete final sólo puede congelarse después de:

- UAT o aceptación formal de excepciones;
- identificación del receptor técnico autorizado;
- definición de custodia/titularidad de servicios de terceros;
- commit y deployment aceptados;
- restore drill aislado;
- reconstrucción limpia del commit aceptado.

Después se debe:

1. generar ZIP desde el commit aceptado;
2. excluir secretos, caches, logs y componentes no transferibles;
3. inspeccionar el contenido;
4. reconstruir en ambiente limpio;
5. calcular SHA-256;
6. registrar checksum, fecha y responsables;
7. transferir accesos por canal seguro;
8. rotar credenciales cuando cambie la custodia;
9. registrar aceptación final.

## 5. Restore drill

Un build exitoso o un rollback de Vercel **no** constituyen restore drill.

El ejercicio válido requiere un entorno aislado de base de datos y debe verificar como mínimo:

- migraciones desde cero;
- RLS y funciones privilegiadas;
- datos/fixtures de prueba no productivos;
- arranque de la aplicación;
- consultas críticas;
- reporte canónico;
- rollback/forward-fix documentado.

No se utilizará producción para ensayar restauración.

## 6. Gate de cierre

Estado actual: **READY FOR UAT / HANDOVER EXECUTION**, no `accepted`.

Pendientes humanos/administrativos inevitables:

- UAT final;
- capacitación o renuncia formal;
- receptor técnico;
- titularidad/costos de terceros;
- restore drill aislado;
- commit/deployment aceptados;
- ZIP/checksum final;
- transferencia de accesos;
- acta de aceptación.
