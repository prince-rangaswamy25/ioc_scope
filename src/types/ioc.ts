export type IOCType =
  | "ip"
  | "domain"
  | "url"
  | "email"
  | "hash"
  | "cve"
  | "filepath"
  | "registry"
  | "wallet";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface IOCMatchSpan {
  start: number;
  end: number;
  rawText: string;
  iocId: string;
  type: IOCType;
  normalizedValue: string;
}

export interface ExtractedIOC {
  id: string;
  value: string; // Normalized / refanged canonical value
  originalValues: string[]; // Distinct raw representations observed in text
  type: IOCType;
  subtype?: string; // e.g., IPv4, IPv6, CIDR, MD5, SHA-1, SHA-256, SHA-512, Windows, Linux, BTC, ETH
  occurrences: number;
  confidence: ConfidenceLevel;
  confidenceScore: number; // 0-100 internal score supporting label
  contextSnippet: string;
  isDefanged: boolean;
  isPrivateOrReserved?: boolean;
  isFalsePositive: boolean;
}

export interface ExtractionOptions {
  refangDefanged: boolean;
  filterPrivateIPs: boolean;
  filterBenignDomains: boolean;
  benignDomainsAllowlist: string[];
  enableAIEnrichment: boolean;
}

export interface ExtractionSummary {
  totalOccurrences: number;
  uniqueCount: number;
  byType: Record<IOCType, number>;
  riskScore: number; // 0-100
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  processingTimeMs: number;
  charCount: number;
  wordCount: number;
}

export interface ExtractionResult {
  iocs: ExtractedIOC[];
  spans: IOCMatchSpan[];
  summary: ExtractionSummary;
  filteredOutCount: number;
}

export interface MitreTechniqueMapping {
  id: string;
  name: string;
  tactic: string;
  reason: string;
}

export interface ContainmentStep {
  priority: "Immediate" | "Short-Term" | "Follow-Up" | string;
  action: string;
  targetIndicator: string;
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
}

export interface AIInsightsResult {
  executiveSummary: string;
  threatType: string;
  severityAssessment: string;
  probableAttackStage: string;
  referencedIOCs: string[];
  mitreTechniques: MitreTechniqueMapping[];
  containmentSteps: ContainmentStep[];
  timeline: TimelineEvent[];
  generatedAt: string;
  model: string;
}

export interface SavedAnalysis {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceName?: string;
  rawText: string;
  options: ExtractionOptions;
  result: ExtractionResult;
  aiInsights?: AIInsightsResult | null;
}

export interface AppSettings {
  theme: "dark" | "light";
  defaultOptions: ExtractionOptions;
}

export interface SampleReport {
  id: string;
  title: string;
  category: "Phishing Campaign" | "Ransomware Outbreak" | "C2 Beaconing" | "Data Exfiltration";
  severity: "Critical" | "High" | "Medium";
  date: string;
  summary: string;
  text: string;
}
