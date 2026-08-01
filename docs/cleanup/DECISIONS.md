# Cleanup decisions

- Preserve every applied Supabase migration and historical bridge migration. Runtime code may be removed without rewriting database history.
- Treat `README.md` and `docs/CONTRACTUAL_SCOPE_MATRIX.md` as the source of truth for the active product scope.
- Remove copilots, multi-agent systems, executive graphs, ML Lab, knowledge experiments and unrelated modules from the active runtime because they are outside the current contractual version.
- Preserve canonical compatibility redirects for `/dashboard/agente`, `/dashboard/valorizador`, `/dashboard/board`, `/dashboard/copilot` and the plural valuation API path.
- Do not delete source code based only on its filename or zero static imports. Verify routes, scripts, runtime references, CI and a Vercel build first.
- Keep `lib/crm-ingestion.ts`; the MJS build script imports it through the emitted `.js` path, which the static audit does not resolve correctly.
- Do not modify production data during the code cleanup. Existing `agent_schedules`, historical agent runs and database tables remain untouched pending a separate explicit authorization.
- Defer dependency removal when it requires regenerating `pnpm-lock.yaml`; package cleanup must be performed through a reproducible package-manager run, not by manual lockfile edits.
