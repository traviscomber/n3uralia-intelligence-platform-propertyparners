# Status

The cleanup branch now contains the first evidence-based removal pass.

Implemented:

- removed retired multi-agent, copilot, board, ML Lab, knowledge and Version 2 routes that were outside the active contractual scope;
- removed the unused N3uralia marketing route tree from the private Property Partners portal;
- removed duplicate valuation API and dashboard implementations while preserving canonical redirects;
- removed unused presentation components, placeholder intelligence modules and obsolete orchestration shells;
- retained applied Supabase migrations and historical bridge migrations;
- added a reproducible legacy-code audit to CI;
- kept retired routes explicitly denied by the dashboard access guard.

Verification status:

- legacy audit: passing;
- lint: passing with non-blocking warnings;
- market identity: passing;
- valuation model and workflow: passing;
- property condition: passing;
- canonical management scoring: passing;
- dashboard access and build: running on the latest commit.

The branch must not be merged until the complete CI workflow succeeds.
