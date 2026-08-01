# Cleanup status

## Implemented

- Removed retired multi-agent, copilot, board, ML Lab, knowledge and Version 2 routes, APIs, cron handlers and supporting libraries outside the active contractual scope.
- Removed the unused N3uralia marketing route tree from the private Property Partners portal.
- Removed duplicate valuation API and dashboard implementations while preserving canonical compatibility redirects.
- Removed orphaned executive, intelligence, agent, adapter and utility modules after route, script and build verification.
- Removed obsolete production-readiness, mock-data, migration and brand-compliance documents that described superseded implementations.
- Added a reproducible legacy-code audit to CI and explicit access denials for retired routes.
- Retained all applied Supabase migrations and historical bridge migrations.
- Updated the project README to describe only the current contractual runtime.

## Protected during cleanup

- Canonical Market, Valuation and Commercial Management modules.
- Role-based CEO, director and partner views.
- Current access guards, RLS model and Supabase migrations.
- CRM ingestion logic used by the MJS data build pipeline.
- Production database rows, including dormant agent schedules and historical runs.

## Verification gate

The cleanup branch may be merged only when the same final commit has:

- a successful legacy audit;
- successful lint and contractual verification scripts;
- successful dashboard access verification;
- a successful Next.js production build in GitHub Actions;
- a Vercel preview deployment in `READY` state.
