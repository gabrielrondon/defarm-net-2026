import { registryRequest } from "./client";

// --- DFID Types ---

export interface GenerateDFIDRequest {
  value_chain: string;
  country: string;
  year: number;
}

export interface GenerateDFIDResponse {
  dfid: string;
  value_chain: string;
  country: string;
  year: number;
}

export interface ValidateDFIDRequest {
  dfid: string;
}

export interface ValidateDFIDResponse {
  valid: boolean;
  dfid: string;
  components?: {
    value_chain: string;
    country: string;
    year: number;
    sequence: string;
  } | null;
  message?: string;
}

// --- DFID Endpoints ---

/** Generate a new DFID identifier */
export async function generateDFID(
  data: GenerateDFIDRequest
): Promise<GenerateDFIDResponse> {
  return registryRequest<GenerateDFIDResponse>("/dfid/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Validate an existing DFID */
export async function validateDFID(
  data: ValidateDFIDRequest
): Promise<ValidateDFIDResponse> {
  return registryRequest<ValidateDFIDResponse>("/dfid/validate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
