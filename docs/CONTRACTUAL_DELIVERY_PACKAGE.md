> **Cierre vigente — 20 de septiembre de 2026:** usar `docs/FINAL_CLOSEOUT_2026-09-20.md` como hoja ejecutiva. Baseline técnico/productivo: `31bb6c462a0aec51c500c73eef00deab3d0ee6ca`.

# Paquete de entrega contractual — Property Partners

## 1. Propósito

Este documento consolida el paquete técnico y funcional preparado por N3uralia para UAT, handover y aceptación de Property Partners. La documentación bajo control de N3uralia queda cerrada en el corte del 20 de septiembre de 2026.

No se consideran aprobadas por defecto las decisiones que todavía dependen del Cliente.

## 2. Baseline productivo

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama: `main`
- SHA: `31bb6c462a0aec51c500c73eef00deab3d0ee6ca`
- Producción: `https://ppartnersgroup.app`
- Vercel: `dpl_G7zMs9mPeZg1zVC3nrYzRx5xiFkp` — READY
- Supabase: `orfncinmhymhhoxbxgjb`
- P0 técnicos: 0
- P1 técnicos: 0

## 3. Gate técnico

- Contractual modules CI: PASS
- N3uralia IP Boundaries: PASS
- Supabase migration-history guard: PASS
- Authenticated Role/RLS QA: automatizado
- SECURITY DEFINER hardening: integrado
- Runtime post-deploy revisado: sin errores detectados
- Home/login productivos: HTTP 200

Estado: **READY FOR CLIENT VALIDATION**.

## 4. Paquete documental incluido

### Funcional
- `docs/UAT_PROPERTY_PARTNERS.md`
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md`
- `docs/CONTRACTUAL_SCOPE_MATRIX.md`
- `docs/canonical/EXECUTIVE_USER_MANUAL.md`
- `docs/manuals/ROLE_USER_MANUAL.md`

### Operación
- `docs/operations/INSTALLATION_RECOVERY_RUNBOOK.md`
- `docs/operations/REPORT_DELIVERY.md`
- `docs/manuals/ADMINISTRATION_MANUAL.md`
- `docs/canonical/TRAINING_EXECUTION_PACK_2026-09-01.md`
- `docs/canonical/HANDOVER_READINESS_2026-09-01.md`

### Seguridad y continuidad
- `config/github-delivery-classification.json`
- `config/credential-boundaries.json`
- `config/production-schema-fingerprint.json`
- `docs/SUPABASE_PRODUCTION_SCHEMA_BASELINE_2026-09-20.md`
- `docs/canonical/PRODUCTION_ROLLBACK_PROCEDURE.md`
- `docs/canonical/CLEAN_RECONSTRUCTION_GUIDE.md`

### Cierre y aceptación
- `docs/FINAL_CLOSEOUT_2026-09-20.md`
- `docs/canonical/FINAL_CLOSEOUT_CHECKLIST.md`
- `config/contract-closeout-status.json`
- `config/contract-closeout-evidence.json`
- `config/production-readiness-status.json`
- `config/uat-case-status.json`
- `config/client-dependencies-status.json`

## 5. Tres pilares

### Mercado
PASS técnico. Pedro Pablo valida finalmente la lectura de negocio.

### Valorización
PASS técnico. La cadena canónica es **Ejecutivo → Director → Pedro Pablo** y falta la ejecución humana de un caso real completo.

### Business Intelligence / Gestión
PASS técnico. Pedro Pablo valida finalmente el criterio de BI/Gestión y las definiciones no formalizadas deben seguir provisionales hasta aprobación.

## 6. Continuidad

El esquema productivo de Supabase quedó fingerprinted y el historial de migraciones protegido contra drift nuevo.

Eso no sustituye un restore drill. El restore real se mantiene en #217 y requiere un entorno aislado autorizado.

## 7. Hardening administrativo

- #52 — activar leaked-password protection en Supabase Auth.
- #217 — ejecutar restore drill real.

Ambos se mantienen abiertos sin afectar el estado P0/P1 del producto.

## 8. Entrega final posterior a aceptación

Después de aceptación del Cliente:

1. fijar commit final aceptado;
2. fijar receptor técnico autorizado;
3. generar artefacto final;
4. registrar SHA-256;
5. transferir accesos/credenciales sólo con autorización;
6. registrar acta o aceptación inequívoca.

## 9. Resultado

La documentación N3uralia queda **cerrada**. El producto queda **READY FOR CLIENT VALIDATION**. La aceptación contractual sigue pendiente de Property Partners.
