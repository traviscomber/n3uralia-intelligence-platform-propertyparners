# Property Partners — cierre documental final

Última actualización: 20 de septiembre de 2026.

## Estado

**DOCUMENTACIÓN N3URALIA CERRADA / READY FOR CLIENT VALIDATION.**

Baseline técnico/productivo vigente:

- SHA: `31bb6c462a0aec51c500c73eef00deab3d0ee6ca`
- Producción: `https://ppartnersgroup.app`
- Deployment: `dpl_G7zMs9mPeZg1zVC3nrYzRx5xiFkp` — READY
- Home y login: HTTP 200
- Runtime post-deploy revisado: sin errores detectados en la ventana de cierre
- Contractual modules CI: PASS
- N3uralia IP Boundaries: PASS
- Supabase migration-history guard: PASS
- P0 técnicos abiertos: 0
- P1 técnicos abiertos: 0

Este documento cierra la documentación bajo control de N3uralia. No declara aceptación contractual del Cliente ni convierte pendientes externos en PASS.

## 1. Alcance entregado

Los tres pilares contractuales están técnicamente preparados:

1. **Inteligencia de Mercado — Vitacura**
   - CBRS, KML y oferta/listings separados semánticamente;
   - identidad y trazabilidad gobernadas;
   - automatización de coincidencias de alta confianza protegida por evidencia externa contradictoria;
   - lectura final de negocio pendiente de Pedro Pablo.

2. **Valorización**
   - expediente versionado;
   - comparables y fundamento trazables;
   - flujo `Ejecutivo → Director → Pedro Pablo`;
   - devolución, corrección y reenvío;
   - aprobación/emisión CEO con AAL2/MFA;
   - PDF emitido desde snapshot inmutable;
   - falta únicamente ejecutar un caso real autorizado hasta `issued` como UAT humana.

3. **Business Intelligence / Gestión**
   - scoring, persistencia, reconciliación, reportes y delivery gates implementados;
   - criterios aún no formalizados permanecen provisionales/fail-closed;
   - Pedro Pablo es el validador final porque el criterio de BI/Gestión proviene de él.

## 2. Cadena canónica de aceptación

**Ejecutivo → Director → Pedro Pablo.**

- Ejecutivo prepara y ejecuta.
- Director revisa, devuelve/corrige y eleva.
- Pedro Pablo es el último eslabón y valida el resultado final de negocio.
- N3uralia valida software, seguridad, permisos, datos, trazabilidad, CI y regresión.

Pedro Pablo no debe repetir QA técnica.

## 3. Cierre técnico documentado

Queda registrado como evidencia:

- producción `READY` sobre el SHA indicado;
- build y CI contractuales verdes;
- QA autenticado Role/RLS automatizado con identidades efímeras;
- SECURITY DEFINER endurecido y gobernado por CI;
- límites de IP/credenciales/exposición protegidos;
- esquema Supabase productivo fingerprinted;
- historial de migraciones congelado desde versión `20260918154759`;
- 327 migraciones registradas en Supabase;
- rollback, instalación y recuperación documentados;
- variables documentadas por nombre, sin secretos;
- paquete de entrega inventariado;
- UAT, capacitación y aceptación con plantillas y responsables definidos.

Baseline Supabase: `docs/SUPABASE_PRODUCTION_SCHEMA_BASELINE_2026-09-20.md`.

## 4. Hardening administrativo todavía abierto

Estos puntos no reabren la documentación y no corresponden a P0/P1 productivos:

### #52 — Leaked Password Protection

Pendiente activar **Prevent use of leaked passwords** en Supabase Auth. El conector actual no expone esa mutación administrativa.

### #217 — Restore drill real

Pendiente ejecutar recuperación en un Supabase Branch/proyecto aislado y verificar el fingerprint, seguridad y smoke de aplicación. Crear ese entorno puede generar costo y requiere autorización explícita.

No se declara ninguno como completado sin evidencia real.

## 5. Pendientes de Property Partners

La aceptación contractual final requiere:

- participantes y ventana UAT;
- ejecución operativa por Ejecutivo y Director;
- validación final de Mercado por Pedro Pablo;
- valorización real completa hasta `issued` + PDF;
- validación final de Business Intelligence / Gestión;
- aprobación o diferimiento explícito de KPI aún no formalizados;
- calendario, destinatarios, frecuencia y canal de reportes;
- capacitación o renuncia formal;
- receptor técnico y titularidad/costos de terceros;
- autorización de transferencia de accesos/credenciales;
- acta o aceptación inequívoca de Pedro Pablo.

## 6. Documentos canónicos de cierre

- `docs/FINAL_CLOSEOUT_2026-09-20.md` — hoja ejecutiva vigente.
- `docs/canonical/FINAL_CLOSEOUT_CHECKLIST.md` — checklist de cierre.
- `docs/UAT_PROPERTY_PARTNERS.md` — UAT por rol y por pilar.
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md` — checklist de aceptación.
- `docs/CONTRACTUAL_DELIVERY_PACKAGE.md` — paquete contractual.
- `docs/SUPABASE_PRODUCTION_SCHEMA_BASELINE_2026-09-20.md` — baseline de base de datos.
- `config/contract-closeout-status.json` — estado contractual machine-readable.
- `config/contract-closeout-evidence.json` — evidencia técnica/humana.
- `config/production-readiness-status.json` — readiness productivo.
- `config/uat-case-status.json` — estado de UAT.

Los documentos anteriores al 20 de septiembre se conservan como evidencia histórica y no son la fuente vigente de estado.

## 7. Regla de cambios posteriores

La documentación queda cerrada contra `31bb6c462a0aec51c500c73eef00deab3d0ee6ca`.

Un cambio posterior que modifique código, datos, autorización, migraciones o flujo contractual debe:

1. pasar nuevamente los gates correspondientes;
2. actualizar el baseline de cierre;
3. registrar nueva evidencia productiva.

Cambios puramente documentales que no alteren comportamiento no reabren la aceptación técnica si CI, Vercel y los gates contractuales permanecen verdes.

## 8. Resultado final de N3uralia

- Documentación: **CERRADA**
- Implementación técnica: **READY FOR CLIENT VALIDATION**
- P0: **0**
- P1: **0**
- Aceptación contractual: **PENDIENTE CLIENTE**
- Validador final de negocio: **Pedro Pablo**
