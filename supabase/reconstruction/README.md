# Supabase reconstruction baseline

This directory is intentionally separate from `supabase/migrations/`.

## Why

The production migration ledger contains historical ordering that cannot rebuild a blank database. Applied production migrations remain immutable. Clean reconstruction therefore uses:

1. a reviewed schema-only baseline captured from the live canonical database;
2. only repository migrations newer than `config/supabase-recovery-contract.json#repoBaselineLastMigration`;
3. no production row data, auth users, passwords, tokens or storage objects.

## Capture

Run the manual GitHub workflow `Supabase reconstruction baseline capture` after configuring the repository secret `SUPABASE_DB_URL` with an authorized direct or session-pooler database URL.

The workflow writes a schema-only artifact and SHA-256 manifest. It does not commit the dump and does not change production.

After review, place the approved SQL at:

`supabase/reconstruction/production-schema.sql`

Then set the baseline contract status to `captured`, record the SHA-256 and source commit, and run the clean replay drill in an isolated environment.

## Ledger prerequisite

Do not declare recovery PASS while `ledgerStatus` is `repair-required`. The two verified schema changes from 2026-09-25 were applied under remote versions that differ from their repository filenames. Repair the remote migration history with the supported Supabase migration-repair procedure only after explicit production authorization.

## Non-goals

- no production data dump;
- no secret backup;
- no rewriting historical migration files;
- no direct restore into production;
- no claim that ordinary CI is restore evidence.
