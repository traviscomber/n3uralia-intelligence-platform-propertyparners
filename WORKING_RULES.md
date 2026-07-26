# N3uralia Production Working Rules

These rules are mandatory for all work on the N3uralia Intelligence Platform and are subordinate to `roadmap.md`, which remains the project source of truth.

## Execution discipline

1. Follow `roadmap.md` strictly and in sequence.
2. Work in longer, complete engineering routines: inspect, design, implement, test, deploy, verify, and document.
3. Do not jump between roadmap phases or mix unrelated roadmap items in one work routine.
4. Inspect the current implementation, related files, production deployment, and relevant logs before changing code.
5. Do not continue while `main`, CI, or production is unhealthy.

## Commit and push discipline

1. Never accumulate a large commit.
2. Each commit must be small, coherent, reviewable, and independently understandable.
3. Separate concerns across commits, for example: contract/types, implementation, tests, integration, and documentation.
4. Group several verified small commits into one controlled push or merge to `main` when they form a complete roadmap checkpoint.
5. Do not push unfinished, broken, or unrelated work to `main`.
6. Verify tests and build before the grouped push to `main`.
7. After the push, verify the corresponding Vercel deployment and stop immediately if it is not healthy.
8. Preserve rollbackability: every grouped push must have a clear boundary and must be safe to revert.

## Completion rule

A roadmap task is complete only when:

- its acceptance criteria pass;
- tests and typecheck pass;
- the grouped commits are on `main`;
- Vercel production is `READY`;
- no regression is found in the production smoke test;
- the roadmap or architecture documentation reflects the resulting state.
