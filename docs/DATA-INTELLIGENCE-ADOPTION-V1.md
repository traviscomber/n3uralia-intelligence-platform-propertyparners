# Property Partners — N3uralia Data Intelligence Adoption v1

Property Partners already implements much of the target architecture: canonical-before-AI, Decision Trace, explicit missingness, role-scoped context, structured proposals and a server Action Gateway.

This adoption aligns those mechanisms with the shared N3uralia Data Readiness Gate.

## Canonical ownership

Keep current ownership unchanged:
- management approved/documentary metrics;
- valuation cases and approved workflow state;
- property identity and market evidence;
- tasks and role/capability scope.

Pedro Pablo memory and AI reasoning are non-canonical.

## First enforcement targets

1. `/api/pedro-pablo` context assembly.
2. Decision Support proposal generation.
3. `/api/pedro-pablo/action-gateway` before preview/confirm execution.
4. Valuation approval/issue AI support.
5. Canonical report generation.

## Readiness requirements

Before a consequential proposal/action:
- authorized scope confirmed;
- source/cutoff visible;
- required domain evidence present;
- no unresolved authoritative contradiction;
- stale evidence surfaced;
- documentary fallback remains distinguishable from approved persisted value;
- proposal IDs remain content-addressed and regenerated server-side;
- human confirmation remains mandatory.

## Observe-mode rollout

Return readiness metadata alongside Pedro Pablo decision support before enforcement. The first enforcement point should be Action Gateway execution, not conversational explanation.
