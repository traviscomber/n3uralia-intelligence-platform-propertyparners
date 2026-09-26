# Supabase recovery baseline and ledger alignment — 2026-09-25

## Current state

The live schema contains the two database changes released with the Property Partners score uplift:

- `harden_prospect_event_trigger`;
- `atomic_neighborhood_director_assignment`.

Their live function definitions, `search_path` settings and execution grants were verified against the repository SQL.

The remaining defect is migration-history identity:

| Repository version | Remote recorded version | Name |
| --- | --- | --- |
| 20260925124700 | 20260925135325 | harden_prospect_event_trigger |
| 20260925125000 | 20260925135338 | atomic_neighborhood_director_assignment |

This is a ledger mismatch, not a schema mismatch.

## Repair policy

Do not edit, delete or reorder applied SQL files. Use Supabase's supported migration-history repair operation after explicit production authorization.

Expected repair sequence after a fresh `supabase migration list` confirms the same four states:

```bash
supabase migration repair 20260925135325 20260925135338 --status reverted
supabase migration repair 20260925124700 20260925125000 --status applied
supabase migration list
```

The repair only changes `supabase_migrations.schema_migrations`; it must not rerun the already verified schema changes.

## Clean baseline

After ledger alignment, capture the current `public` and `private` schemas with the manual baseline workflow. The capture is schema-only and is stored first as a workflow artifact for review.

The approved artifact becomes `supabase/reconstruction/production-schema.sql`. It is not placed in the production migration directory and therefore cannot be pushed accidentally to the live project.

Future clean reconstruction uses:

```
approved schema baseline
+ repository migrations newer than repoBaselineLastMigration
+ non-production seed/test fixtures only when explicitly approved
```

## Exit gate

Recovery remains HOLD until all of the following are true:

1. repository and remote migration histories align;
2. the schema-only baseline is captured, reviewed and hash-pinned;
3. a blank isolated Supabase environment replays the baseline plus post-baseline migrations;
4. schema fingerprint, RLS, privileged functions and critical application routes pass;
5. the evidence is recorded with exact commit and environment identifiers.

Production data and production Storage objects are not part of this baseline.
