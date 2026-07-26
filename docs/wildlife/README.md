# N3uralia Wildlife Intelligence

N3uralia Wildlife Intelligence is an evidence-first environmental observation module inside N3uralia Intelligence.

The first release is deliberately narrow: it receives a photograph, preserves the original file, extracts available metadata, performs an assisted visual assessment, records the result and exposes the observation for human review.

## What the MVP can honestly claim

- Upload photographs from mobile or desktop.
- Preserve the original file as submitted.
- Calculate a SHA-256 fingerprint for integrity checks.
- Extract metadata that is actually present in the file.
- Record GPS, capture time and device information when available.
- Distinguish supplied metadata from user-entered context.
- Produce an AI-assisted species assessment with explicit uncertainty.
- Keep a complete observation and review history.
- Separate data by organization and site.

## What the MVP must not claim

- Scientifically validated species identification accuracy.
- Proof that a photograph has never been edited.
- Guaranteed GPS authenticity.
- Continuous real-time detection.
- Replacement of wildlife specialists or field operators.
- Individual animal identification.

## Product principle: Evidence First AI

The file and its provenance are primary. AI output is an interpretation attached to the evidence, never a replacement for it.

Every conclusion must retain:

1. The original evidence reference.
2. The extracted metadata and extraction status.
3. The model and prompt version used.
4. The structured AI response.
5. The evidence score inputs.
6. Human review status and audit history.

## MVP workflow

```text
Mobile or desktop upload
        |
        v
Original file preservation
        |
        v
Hash and metadata extraction
        |
        v
Structured AI assessment
        |
        v
Evidence score
        |
        v
Human review
        |
        v
Wildlife Memory and reporting
```

## Initial delivery slices

### Slice 1 - Observation intake

- Organization and site context.
- Photograph upload.
- Original file storage reference.
- SHA-256 fingerprint.
- Basic metadata extraction.
- Observation record creation.

### Slice 2 - Assisted analysis

- Structured OpenAI response.
- Probable species candidates.
- Visible supporting features.
- Image limitations.
- Operational risk indicators.
- Mandatory uncertainty and review recommendation.

### Slice 3 - Review and history

- Observation detail page.
- Human validation, rejection or correction.
- Audit trail.
- Filters by date, site, species and review status.

### Slice 4 - Environmental intelligence

- Map of observations with usable coordinates.
- Repeated activity summaries.
- Executive reports.
- Copilot queries grounded only in stored observations.

## First pilot success criteria

The pilot is successful when it can demonstrate, with real submitted files:

- Reliable preservation and retrieval of originals.
- Correct extraction of available metadata.
- Transparent handling of missing metadata.
- Reproducible AI analysis records.
- Human correction and auditability.
- Useful operational summaries without overstating accuracy.

Recognition quality will be measured during the pilot against human review. No external accuracy percentage should be published before that validation exists.
