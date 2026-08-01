# Cleanup decisions

- Do not delete applied database migrations.
- Do not remove code based only on filename or zero static imports.
- Require runtime, route, dynamic import, and script-reference checks before deletion.
- Prefer one focused cleanup commit per subsystem.
