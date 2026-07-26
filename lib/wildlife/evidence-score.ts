import type {
  EvidenceMetadata,
  EvidenceScore,
  EvidenceScoreComponent,
  WildlifeVisionAnalysis,
} from "@/lib/wildlife/contracts";

export interface EvidenceScoreInput {
  originalPreserved: boolean;
  sha256Generated: boolean;
  metadata?: EvidenceMetadata | null;
  analysis?: WildlifeVisionAnalysis | null;
  humanReviewCompleted: boolean;
}

function component(
  key: string,
  condition: boolean,
  pointsAvailable: number,
  explanationWhenPresent: string,
  explanationWhenMissing: string,
): EvidenceScoreComponent {
  return {
    key,
    pointsAwarded: condition ? pointsAvailable : 0,
    pointsAvailable,
    explanation: condition ? explanationWhenPresent : explanationWhenMissing,
  };
}

export function calculateEvidenceScore(
  input: EvidenceScoreInput,
  calculatedAt = new Date().toISOString(),
): EvidenceScore {
  const metadata = input.metadata;
  const analysis = input.analysis;

  const components: EvidenceScoreComponent[] = [
    component(
      "original_preserved",
      input.originalPreserved,
      15,
      "The original submitted file is preserved.",
      "The original submitted file has not been confirmed as preserved.",
    ),
    component(
      "sha256_generated",
      input.sha256Generated,
      10,
      "A SHA-256 fingerprint was generated at ingestion.",
      "No SHA-256 fingerprint is recorded.",
    ),
    component(
      "capture_timestamp_available",
      Boolean(metadata?.capturedAt?.value),
      10,
      "A capture timestamp is available with explicit provenance.",
      "No capture timestamp is available.",
    ),
    component(
      "gps_available",
      Boolean(metadata?.location?.value),
      15,
      "Coordinates are available with explicit provenance.",
      "No coordinates are available.",
    ),
    component(
      "device_metadata_available",
      Boolean(metadata?.make?.value || metadata?.model?.value),
      5,
      "Camera or device metadata is available.",
      "No camera or device metadata is available.",
    ),
    component(
      "image_quality_usable",
      Boolean(
        analysis &&
          analysis.imageUsability !== "insufficient_evidence" &&
          analysis.imageUsability !== "low",
      ),
      15,
      "The analysis reports that the image is usable.",
      "The image has not been assessed as sufficiently usable.",
    ),
    component(
      "analysis_structurally_complete",
      Boolean(
        analysis?.schemaVersion &&
          analysis.modelName &&
          analysis.promptVersion &&
          analysis.summary,
      ),
      10,
      "A versioned structured AI assessment is recorded.",
      "No complete versioned structured AI assessment is recorded.",
    ),
    component(
      "human_review_completed",
      input.humanReviewCompleted,
      20,
      "A human review decision is recorded.",
      "The observation has not completed human review.",
    ),
  ];

  const total = components.reduce(
    (sum, scoreComponent) => sum + scoreComponent.pointsAwarded,
    0,
  );

  return {
    version: "1.0",
    total,
    maximum: 100,
    components,
    calculatedAt,
  };
}
