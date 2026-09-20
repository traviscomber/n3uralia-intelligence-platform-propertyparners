# Checklist final de cierre contractual

## Identificación

- Baseline técnico/productivo: `31bb6c462a0aec51c500c73eef00deab3d0ee6ca`
- Deployment validado: `dpl_G7zMs9mPeZg1zVC3nrYzRx5xiFkp` — READY
- Producción: `https://ppartnersgroup.app`
- Fecha de corte técnico/documental: 20 de septiembre de 2026
- Representante N3uralia: Travis / N3uralia
- Validador final Property Partners: Pedro Pablo
- Documento ejecutivo vigente: `docs/FINAL_CLOSEOUT_2026-09-20.md`

Los cambios puramente documentales posteriores no reabren el baseline funcional mientras CI, Vercel y los gates contractuales permanezcan verdes.

## Cadena de aceptación

**Ejecutivo → Director → Pedro Pablo.**

- Ejecutivo prepara y ejecuta.
- Director revisa, devuelve/corrige y eleva.
- Pedro Pablo valida el resultado final de negocio.
- N3uralia valida software, seguridad, permisos, datos, trazabilidad, CI y regresión.

## Verificaciones N3uralia

- [x] Documentación de cierre consolidada y vigente.
- [x] Build y deployment verdes.
- [x] P0 técnicos abiertos = 0.
- [x] P1 técnicos abiertos = 0.
- [x] Authenticated Role/RLS QA automatizada.
- [x] Tenant isolation y límites de autorización verificados.
- [x] SECURITY DEFINER hardening y gate preventivo.
- [x] Mercado: fuentes separadas y trazables.
- [x] Valorización: workflow, AAL2/MFA, snapshots y PDF.
- [x] Gestión/BI: scoring, persistencia, reconciliación y reporting.
- [x] Fingerprint canónico de Supabase registrado.
- [x] Historial de migraciones congelado y protegido contra drift nuevo.
- [x] Dependencias del Cliente registradas.
- [x] Variables documentadas por nombre, sin secretos.
- [x] Rollback, instalación y recuperación documentados.
- [x] Propiedad intelectual/materiales del Cliente clasificados.
- [x] Runtime productivo revisado sin errores detectados.
- [ ] Leaked Password Protection habilitado en Supabase Auth (#52).
- [ ] Restore drill real ejecutado y registrado (#217).

## Verificaciones Property Partners / compartidas

- [ ] Ejecutivo y Director ejecutan UAT.
- [ ] Pedro Pablo valida Mercado.
- [ ] Pedro Pablo valida una valorización real hasta `issued` y PDF.
- [ ] Pedro Pablo valida Business Intelligence / Gestión.
- [ ] KPI no formalizados quedan aprobados o diferidos.
- [ ] Reporting queda aprobado.
- [ ] Capacitación realizada o renunciada.
- [ ] Titularidad/costos de terceros definidos.
- [ ] Receptor técnico autorizado definido.
- [ ] Artefacto/checksum final generados tras aceptación.
- [ ] Credenciales transferidas/rotadas sólo con autorización.
- [ ] Acta o aceptación inequívoca registrada.

## Resultado

- Documentación N3uralia: `complete`
- Estado técnico: `ready-for-client-validation`
- Estado contractual: `pending-client-validation`
- P0: 0
- P1: 0
- Aprobador final de negocio: Pedro Pablo
