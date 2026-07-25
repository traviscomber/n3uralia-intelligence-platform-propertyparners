# N3uralia CEO Copilot — Production Pipeline

## Runtime flow

```text
CEO authenticated in Supabase
        |
        v
app/dashboard/layout.tsx
- loads profile
- renders copilot only for role=ceo
        |
        v
components/ceo/ceo-ai-assistant-widget.tsx
- captures question
- renders structured response
- persists feedback
        |
        v
POST /api/ceo/question
app/api/ceo/question/route.ts
- validates session
- validates CEO role
- validates input
- classifies importance and decision intent
- selects quick / standard / deep reasoning
        |
        v
buildCEOIntelligenceContext()
lib/ceo-intelligence-context.ts
        |
        +-----------------------------+
        |                             |
        v                             v
buildN3uraliaIntelligenceContext()   Presentation evidence
lib/n3uralia-intelligence-engine.ts  lib/presentations-2026.ts
        |                             |
        |                             +-- company management indicators
        |                             +-- branch coverage
        |                             +-- reconciliation differences
        |
        +-- CRM evidence
        |   lib/crm-snapshot.ts
        |   data/crm-intelligence.json
        |
        +-- Targets evidence
        |   lib/targets-2026.ts
        |   data/targets-2026.json
        |
        +-- Market evidence
        |   lib/market-snapshot.ts
        |   data/market-source-intelligence.json
        |   - source inventory
        |   - published-offer availability
        |   - registered-sales availability
        |   - territorial geometry
        |   - quantitative readiness
        |   - no unsupported market claims
        |
        +-- Valuation evidence
            lib/valuation-snapshot.ts
            data/valuation-intelligence.json
            - methodology
            - scope
            - source inventory
            - quality considerations
        |
        v
N3uralia intelligence context
- evidence
- signals
- risks
- actions
- governance
- scope
        |
        v
runExecutiveReasoningPipeline()
lib/executive-reasoning-pipeline.ts
        |
        v
generateExecutiveReasoning()
lib/openai-reasoning-layer.ts
- OpenAI Responses API
- adaptive reasoning effort
- strict JSON schema
- Spanish executive response
- evidence-only instructions
        |
        v
Structured response
- summary
- signals
- evidence
- risks
- opportunities
- confidence
- sources
- reasoningMode
        |
        v
CEO widget
        |
        +-- thumbs up/down
        v
POST /api/ceo/feedback
- validates session and CEO role
- writes copilot_feedback
        |
        v
Supabase memory foundation
- copilot_feedback
- decision_history
```

## Source trust rules

1. CRM and targets remain separate from presentations.
2. Published offer and registered sales remain separate market universes.
3. File availability is not interpreted as a market trend.
4. Market claims require calculated KPIs or explicit external evidence.
5. Presentation values are supporting evidence and must be reconciled against authoritative operational sources.
6. The model may interpret evidence but may not create missing figures.
7. Low evidence coverage must reduce confidence.

## Current market capability

The market layer is connected and source-faithful. It can currently answer:

- which market sources exist;
- whether offer and registered-sales universes are available;
- which territory and neighborhoods are covered;
- whether the system is ready to calculate quantitative market KPIs;
- what quantitative work is still missing.

It must not yet claim measured trends for price, demand, absorption, days on market or competition unless those aggregates are added to the source JSON.

## Next quantitative market contract

A future market aggregation job should write deterministic metrics into a versioned artifact, for example `data/market-kpis.json`, containing:

- period and extraction timestamp;
- property type and neighborhood;
- published inventory count;
- median and percentile listing price;
- median UF/m²;
- registered sale count;
- median registered price and UF/m²;
- listing-to-sale gap;
- dispersion and sample size;
- data-quality exclusions;
- source hashes.

Only after that artifact exists should the copilot issue quantitative market conclusions.
