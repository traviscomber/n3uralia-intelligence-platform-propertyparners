> **Checklist vigente — 20 de septiembre de 2026:** usar `docs/FINAL_CLOSEOUT_2026-09-20.md` como hoja ejecutiva de cierre. Baseline técnico/productivo: `31bb6c462a0aec51c500c73eef00deab3d0ee6ca`.

# Checklist final de aceptación contractual

## Estado ejecutivo

**PASS técnico / READY FOR CLIENT VALIDATION.**

- Producción: `https://ppartnersgroup.app`
- Deployment: `dpl_G7zMs9mPeZg1zVC3nrYzRx5xiFkp` — READY
- Home y login: HTTP 200
- Runtime post-deploy revisado: sin errores detectados
- Contractual modules CI: PASS
- N3uralia IP Boundaries: PASS
- Supabase migration-history guard: PASS
- P0 técnicos abiertos: 0
- P1 técnicos abiertos: 0

La aceptación técnica no sustituye la UAT humana ni el acta del Cliente.

## 1. Plataforma y seguridad

| Requisito | Estado |
|---|---|
| Autenticación, perfiles y alcance por rol | PASS técnico |
| RLS / tenant isolation | PASS técnico |
| APIs y RPC críticas con guards de servidor | PASS técnico |
| SECURITY DEFINER hardening | PASS técnico |
| MFA/AAL2 para aprobación/emisión crítica | PASS técnico |
| Fingerprint de esquema Supabase | PASS técnico |
| Historial de migraciones protegido contra drift nuevo | PASS técnico |
| Protección contra contraseñas filtradas Supabase Auth | Pendiente administrativo #52 |
| Restore drill real | Pendiente administrativo #217 |
| Aceptación humana por roles | Pendiente Cliente |

## 2. Mercado

Estado: **PASS técnico / READY FOR CLIENT VALIDATION**.

- CBRS, KML y oferta/listings permanecen separados y trazables.
- Alcance contractual: casas en venta en Vitacura.
- Automatización de identidad de alta confianza está protegida por guard de evidencia externa contradictoria.
- Pedro Pablo debe validar finalmente fuentes, lectura y conclusiones de negocio.

## 3. Valorización

Estado: **PASS técnico / READY FOR CLIENT VALIDATION**.

- Expediente, comparables y ajustes auditables.
- Mínimo 3 comparables antes de avanzar.
- Flujo canónico: **Ejecutivo → Director → Pedro Pablo**.
- Devolución, corrección y reenvío.
- CEO-only aprobación/emisión con AAL2/MFA.
- Snapshot/versionado y PDF emitido trazable.
- Pendiente: ejecutar un caso real autorizado hasta `issued` e inspeccionar el PDF.

## 4. Business Intelligence / Gestión

Estado: **PASS técnico / READY FOR CLIENT VALIDATION**, con definiciones cliente pendientes.

- Scoring, persistencia, reconciliación y reporting están implementados.
- Pedro Pablo es el validador final de BI/Gestión.
- KPI aún no formalizados permanecen provisionales.
- Scheduling/delivery permanece fail-closed hasta aprobar calendario, destinatarios, frecuencia y canal.

## 5. QA de release

Sobre el baseline vigente:

- build productivo: PASS;
- Contractual modules CI: PASS;
- N3uralia IP Boundaries: PASS;
- Supabase migration-history guard: PASS;
- Vercel producción: READY;
- home/login: HTTP 200;
- runtime revisado: sin errores detectados.

## 6. Gates pendientes antes de aceptación contractual

- UAT con Ejecutivo y Director;
- validación final de Pedro Pablo;
- valorización real hasta `issued`;
- aprobación o diferimiento de KPI pendientes;
- definición de reporting;
- capacitación o renuncia formal;
- titularidad/costos de terceros;
- receptor técnico;
- restore drill #217;
- leaked-password protection #52;
- artefacto final/checksum después de aceptación;
- transferencia de accesos sólo con autorización;
- acta final.

No declarar `accepted` mientras esos gates sigan abiertos.
