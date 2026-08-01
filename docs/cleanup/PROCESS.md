# Cleanup process

1. Run `pnpm audit:legacy`.
2. Review high-confidence obsolete artifacts first.
3. Confirm references before deleting components, libraries, routes, scripts, or dependencies.
4. Keep migrations immutable; supersede them instead of deleting applied migrations.
5. Verify lint, canonical model checks, access checks, and production build.
6. Merge only after CI succeeds and the deployment is READY.
