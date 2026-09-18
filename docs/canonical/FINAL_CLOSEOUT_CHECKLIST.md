# Checklist final de cierre contractual

## Identificación

- Baseline técnico/productivo: `cde1981f32bc7ad95a439897dbb74bf09148c0b5`
- Deployment validado: `dpl_GUg6TPPYJ8oLAcr1VTYakAFcDdaU` — READY
- Producción: `https://ppartnersgroup.app`
- Fecha de corte técnico: 18 de septiembre de 2026
- Representante N3uralia: Travis / N3uralia
- Validador final Property Partners: Pedro Pablo

Los commits posteriores que sólo actualicen documentación/manifests de cierre no reabren el baseline funcional mientras CI, Vercel y los gates contractuales permanezcan verdes.

## Cadena de aceptación

**Ejecutivo → Director → Pedro Pablo.**

- Ejecutivo prepara y ejecuta.
- Director revisa, devuelve/corrige y eleva.
- Pedro Pablo es el último eslabón y valida el resultado final de negocio.
- N3uralia valida software, seguridad, permisos, datos, trazabilidad, CI y regresión.

Pedro Pablo definió el criterio de Business Intelligence / Gestión; su validación final de esa capa es canónica.

## Verificaciones N3uralia

- [x] Build y deployment verdes.
- [x] Sin hallazgos P0/P1 técnicos conocidos abiertos.
- [x] Authenticated Role/RLS QA automatizada con identidades efímeras.
- [x] Tenant isolation y límites de autorización verificados.
- [x] SECURITY DEFINER hardening y gate preventivo integrados.
- [x] Mercado: CBRS/KML/Portal separados y trazables.
- [x] Valorización: workflow, versiones, devolución, AAL2/MFA, emisión y PDF implementados.
- [x] Gestión/BI: scoring, persistencia, reconciliación, reporting y delivery gates implementados.
- [x] Dependencias del Cliente registradas explícitamente.
- [x] Variables documentadas por nombre, sin valores secretos.
- [x] Rollback, recuperación e instalación documentados.
- [x] Propiedad intelectual y materiales del Cliente clasificados; módulos N3uralia propietarios fuera de transferencia.
- [x] Runtime productivo verificado sin errores en la ventana de cierre revisada.
- [ ] Leaked Password Protection habilitado en Supabase Auth.
- [ ] Restore drill / evidencia vigente de backup-recovery ejecutada y registrada.

## Verificaciones Property Partners / compartidas

- [ ] Ejecutivo y Director ejecutan los casos operativos UAT requeridos.
- [ ] Pedro Pablo valida Mercado como resultado final de negocio.
- [ ] Pedro Pablo valida una valorización real completa hasta `issued` y PDF.
- [ ] Pedro Pablo valida Business Intelligence / Gestión conforme al criterio que definió.
- [ ] KPI todavía no formalizados quedan aprobados o explícitamente diferidos.
- [ ] Calendario, destinatarios, frecuencia y canal de reportes quedan aprobados.
- [ ] Capacitación realizada o renunciada formalmente.
- [ ] Titularidad y costos de terceros definidos.
- [ ] Receptor técnico autorizado definido.
- [ ] Paquete final generado e inspeccionado después de la aceptación.
- [ ] Reconstrucción independiente/clean-room completada con el receptor autorizado.
- [ ] Checksum SHA-256 del paquete final registrado.
- [ ] Credenciales transferidas o rotadas sólo con autorización.
- [ ] Acta o aceptación inequívoca registrada por Pedro Pablo.

## Resultado

- Estado N3uralia: `ready-for-client-validation` con dos hardenings administrativos pendientes (leaked-password protection y restore drill).
- Estado contractual: `pending-client-validation`.
- P0 técnicos abiertos: 0.
- P1 técnicos abiertos: 0.
- Aprobador final de negocio: Pedro Pablo.
- Observación: no declarar `accepted` hasta completar la cadena humana y la evidencia obligatoria.
