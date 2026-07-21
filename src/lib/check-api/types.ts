// DeFarm Check API types (Compliance)

export type CheckInputType = "CNPJ" | "CPF" | "CAR" | "COORDINATES" | "ADDRESS";

export interface CheckRequestInput {
  type: CheckInputType;
  value: string | { lat: number; lon: number };
}

export interface CheckRequest {
  input: CheckRequestInput;
  options?: {
    useCache?: boolean;
    includeEvidence?: boolean;
    timeout?: number;
  };
}

export interface CheckSource {
  name: string;
  category: "social" | "environmental" | "legal" | "certification";
  status: "PASS" | "FAIL" | "WARNING" | "ERROR" | "NOT_APPLICABLE";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  details?: Record<string, any>;
  evidence?: {
    dataSource: string;
    url?: string;
    lastUpdate?: string;
  };
  executionTimeMs?: number;
  cached?: boolean;
}

export interface CheckResponse {
  checkId: string;
  input: {
    type: string;
    value: any;
  };
  timestamp: string;
  verdict: "COMPLIANT" | "NON_COMPLIANT" | "PARTIAL" | "INCONCLUSIVE";
  score: number;
  sources: CheckSource[];
  summary: {
    totalCheckers: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
    notApplicable: number;
  };
  metadata: {
    processingTimeMs: number;
    cacheHitRate: number;
    apiVersion: string;
    timestamp: string;
    dataQuality?: {
      status: "fresh" | "warning" | "degraded" | "unknown";
      staleSources: string[];
      warningSources: string[];
      neverUpdatedSources: string[];
      unknownFreshnessSources: string[];
      generatedAt: string;
    };
  };
}

export interface SourceInfo {
  name: string;
  category: string;
  enabled: boolean;
  status: string;
  description: string;
  freshness?: {
    name: string;
    category: string | null;
    lastUpdated: string | null;
    hoursSinceUpdate: number | null;
    freshnessStatus: "fresh" | "warning" | "stale" | "never_updated" | "unknown";
    totalRecords: number | null;
    recordCountSource: "table" | "metadata" | "unknown";
    dataSourceUrl: string | null;
  } | null;
}
