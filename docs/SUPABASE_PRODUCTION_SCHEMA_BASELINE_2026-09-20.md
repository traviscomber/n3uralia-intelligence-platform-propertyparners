# Supabase production schema baseline

Date: 2026-09-20  
Project: `orfncinmhymhhoxbxgjb`

## Purpose

This file records the canonical database structure used by Property Partners at technical closeout without exporting client row data or secrets.

The production database currently contains:

- 101 public tables and 18 private tables.
- 152 public functions and 34 private functions.
- 7 public views/materialized views and 16 private views/materialized views.
- 327 Supabase migration-history records.
- PostgreSQL 17.6.
- 8 installed extensions.

The machine-readable hashes are stored in `config/production-schema-fingerprint.json`.

## Historical migration drift

The repository contains early SQL files from July 2026 that are not a faithful replay of the migration history stored by Supabase. Examples discovered during isolated CI reconstruction:

- duplicated short migration version prefixes;
- duplicated full timestamps;
- legacy view/materialized-view conflicts;
- dependencies defined after their first use;
- legacy `properties.id BIGSERIAL` definitions while production uses UUID;
- Supabase migration records whose execution timestamp differs from the repository filename.

These are historical artifacts. They do not represent a current production fault, but they mean that replaying every SQL file in lexical order is not valid restore evidence.

## Rule from this baseline forward

The migration history is frozen at production version `20260918154759`.

Every new migration must:

1. use a unique 14-digit timestamp;
2. have a snake_case filename;
3. be newer than the frozen production version;
4. never modify, rename or delete an existing migration;
5. pass the GitHub migration-history guard before merge.

## Restore boundary

A schema fingerprint and migration guard are not a restore drill.

The remaining continuity gate must be executed in an isolated Supabase branch/project created from production, followed by schema/security/application verification. Creating that branch may incur Supabase cost and therefore remains subject to explicit cost authorization.

Until that test is run, backup/recovery remains `pending`, not `passed`.
