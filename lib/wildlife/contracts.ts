export const OBSERVATION_STATUSES = [
  "draft",
  "uploaded",
  "metadata_extracted",
  "analysis_pending",
  "analyzed",
  "review_required",
  "validated",
  "corrected",
  "rejected",
] as const;

export type ObservationStatus = (typeof OBSERVATION_STATUSES)[number];

export const EVIDENCE_SOURCES = [
  "mobile_upload",
  "desktop_upload",
  "camera_trap",
  "rtsp_event",
  "drone",
  "external_api",
  "field_import",
] as const;

export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export const METADATA_PROVENANCE = [
  "embedded",
  "user_supplied",
  "system_generated",
  "derived",
] as const;

export type MetadataProvenance = (typeof METADATA_PROVENANCE)[number];

export type QualitativeAssessment =
  | "insufficient_evidence"
  | "low"
  | "moderate"
  | "high";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitudeMeters?: number | null;
  accuracyMeters?: number | null;
}

export interface ProvenancedValue<T> {
  value: T;
  provenance: MetadataProvenance;
  rawValue?: unknown;
  warning?: string | null;
}

export interface EvidenceMetadata {
  capturedAt?: ProvenancedValue<string> | null;
  timezoneOffset?: ProvenancedValue<string> | null;
  location?: ProvenancedValue<GeoPoint> | null;
  make?: ProvenancedValue<string> | null;
  model?: ProvenancedValue<string> | null;
  software?: ProvenancedValue<string> | null;
  orientation?: ProvenancedValue<number> | null;
  widthPixels?: ProvenancedValue<number> | null;
  heightPixels?: ProvenancedValue<number> | null;
  iso?: ProvenancedValue<number> | null;
  exposureTime?: ProvenancedValue<string> | null;
  focalLengthMm?: ProvenancedValue<number> | null;
  warnings: string[];
  extractorName: string;
  extractorVersion: string;
  extractedAt: string;
}

export interface EvidenceAsset {
  id: string;
  organizationId: string;
  observationId: string;
  source: EvidenceSource;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  storagePath: string;
  createdAt: string;
  metadata?: EvidenceMetadata | null;
}

export interface SpeciesCandidate {
  commonName: string;
  scientificName?: string | null;
  assessment: QualitativeAssessment;
  visibleSupportingFeatures: string[];
  alternativeExplanations: string[];
}

export interface WildlifeVisionAnalysis {
  schemaVersion: "1.0";
  modelProvider: string;
  modelName: string;
  promptVersion: string;
  analyzedAt: string;
  imageUsability: QualitativeAssessment;
  candidateSpecies: SpeciesCandidate[];
  visibleAnimalCount?: number | null;
  visiblePeople: boolean;
  visibleVehicles: boolean;
  visibleInfrastructure: boolean;
  imageLimitations: string[];
  operationalRisk: "none_visible" | "low" | "moderate" | "high" | "unknown";
  reviewRecommendation: "optional" | "recommended" | "required";
  summary: string;
}

export interface EvidenceScoreComponent {
  key: string;
  pointsAwarded: number;
  pointsAvailable: number;
  explanation: string;
}

export interface EvidenceScore {
  version: "1.0";
  total: number;
  maximum: 100;
  components: EvidenceScoreComponent[];
  calculatedAt: string;
}

export interface HumanReview {
  id: string;
  organizationId: string;
  observationId: string;
  reviewerUserId: string;
  decision: "validated" | "corrected" | "rejected";
  correctedCommonName?: string | null;
  correctedScientificName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface WildlifeObservation {
  id: string;
  externalReference: string;
  organizationId: string;
  siteId: string;
  submittedByUserId: string;
  status: ObservationStatus;
  title?: string | null;
  userDescription?: string | null;
  source: EvidenceSource;
  primaryEvidenceAssetId?: string | null;
  latestAnalysisId?: string | null;
  latestEvidenceScore?: EvidenceScore | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateObservationInput {
  organizationId: string;
  siteId: string;
  submittedByUserId: string;
  source: EvidenceSource;
  title?: string;
  userDescription?: string;
  userSuppliedLocation?: GeoPoint;
  userSuppliedCapturedAt?: string;
}
