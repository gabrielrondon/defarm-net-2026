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
  };
}

export interface SourceInfo {
  name: string;
  category: string;
  enabled: boolean;
  status: string;
  description: string;
}
