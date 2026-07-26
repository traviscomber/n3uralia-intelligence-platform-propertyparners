# Wildlife Intelligence Architecture

## Scope

This architecture supports the first N3uralia Wildlife Intelligence release: mobile-first submission of photographic evidence, metadata extraction, AI-assisted assessment and human review.

It is multi-organization from the first record and remains compatible with future camera traps, RTSP streams, drones and specialist detection models.

## Trust boundaries

A photograph and its metadata are evidence inputs, not absolute proof.

- EXIF can be absent, altered or removed.
- GPS coordinates describe metadata carried by the file; they do not independently prove where the image was taken.
- A cryptographic hash proves that the stored bytes have not changed after ingestion; it does not prove the origin of the bytes.
- AI output is probabilistic and requires human review for operationally important decisions.

The interface and reports must preserve these distinctions.

## Logical components

```text
Web application
  - evidence upload
  - observation history
  - review workspace
  - map and reports

Application API
  - authorization and tenant isolation
  - upload orchestration
  - observations and reviews
  - analysis jobs

Evidence engine
  - file validation
  - original preservation
  - SHA-256 calculation
  - metadata extraction
  - provenance record

Vision analysis
  - image quality assessment
  - species candidate assessment
  - supporting visual features
  - operational context and limitations
  - versioned structured output

Evidence scoring
  - deterministic score components
  - no invented model confidence
  - score explanation retained with each observation

Wildlife memory
  - observations
  - analyses
  - reviews
  - sites and spatial context
  - audit events

Executive intelligence
  - grounded summaries
  - trend and recurrence queries
  - exports and reports
```

## Core data entities

### Organization

Tenant boundary for a company, customer or operating unit.

### Site

A reserve, park, property, facility or operational area owned by one organization.

### Observation

The durable case record. It connects evidence, context, analyses and reviews.

### Evidence asset

The original uploaded file and its immutable ingestion details.

### Metadata snapshot

The metadata extracted at ingestion. It must retain raw values, normalized values, extractor version and extraction warnings.

### AI analysis

A versioned model response. A new analysis creates a new record rather than overwriting previous output.

### Human review

A reviewer decision with corrections, comments and timestamp.

### Audit event

An append-only record of meaningful state changes.

## Observation states

```text
draft
  -> uploaded
  -> metadata_extracted
  -> analysis_pending
  -> analyzed
  -> review_required
  -> validated | corrected | rejected
```

A processing failure should be represented independently from the business state so that retries do not erase evidence history.

## Evidence score

The evidence score is an operational completeness and usability indicator. It is not a scientific probability that the species identification is correct.

Suggested deterministic components:

- Original file preserved: 15
- SHA-256 generated: 10
- Capture timestamp available: 10
- GPS available: 15
- Device metadata available: 5
- Image quality usable: 15
- AI result structurally complete: 10
- Human review completed: 20

Maximum: 100.

Every score must persist its component values and explanation. Weight changes require a score version.

## AI response contract

The model should return structured data containing:

- candidate species, using `unknown` where appropriate;
- qualitative assessment level, not a fabricated percentage;
- visible features supporting each candidate;
- alternative explanations;
- number of visible animals when reasonably observable;
- image quality limitations;
- people, vehicles or infrastructure visibly present;
- possible operational risk;
- human review recommendation;
- concise narrative summary.

The prompt must instruct the model not to infer GPS, date, ownership, authenticity or facts outside the visible image and supplied context.

## Metadata provenance

Metadata fields must record their source:

- `embedded`: extracted from the uploaded file;
- `user_supplied`: entered by the submitting user;
- `system_generated`: generated during ingestion;
- `derived`: calculated from another retained value.

Embedded and user-supplied values must never be silently merged. Conflicts should remain visible.

## Storage rules

- Preserve the original upload without image transformation.
- Generate thumbnails as separate derivative assets.
- Never replace the original with a recompressed version.
- Use private object storage and time-limited access URLs.
- Store the SHA-256 digest before analysis.
- Remove sensitive metadata only from public exports, not from the protected evidence record.

## Security and tenancy

- Every domain record carries `organization_id`.
- Site access is checked within the organization boundary.
- Service-role credentials remain server-side.
- Original assets are private by default.
- Audit access to original files and sensitive coordinates.
- Reports must support coordinate redaction for protected species.

## Future sources

New evidence sources should map into the same contracts:

- mobile upload;
- camera trap;
- RTSP event frame;
- drone capture;
- external API;
- field operator import.

Source-specific processing must not change the meaning of an observation, evidence asset, analysis or review.
