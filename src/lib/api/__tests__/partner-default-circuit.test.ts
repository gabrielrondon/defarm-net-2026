import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the client module
const mockRegistryRequest = vi.fn();
vi.mock("../client", () => ({
  registryRequest: (...args: unknown[]) => mockRegistryRequest(...args),
  buildQueryString: (params?: Record<string, unknown>) => {
    if (!params) return "";
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
    if (entries.length === 0) return "";
    return "?" + entries.map(([k, v]) => `${k}=${v}`).join("&");
  },
  registryFileRequest: vi.fn(),
  registryPublicRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
      this.name = "ApiError";
    }
  },
}));

import { getPartnerDefaultCircuit, updatePartnerDefaultCircuit, type DefaultCircuitResponse } from "../partner-routing";
import { ApiError } from "../client";

describe("GET /partner/default-circuit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the default circuit on 200", async () => {
    const mockResponse: DefaultCircuitResponse = {
      circuit_id: "circ_abc123",
      name: "Fazenda Modelo",
      is_staging: false,
      source: "WorkspaceSetting",
      workspace_id: "ws_001",
      changed: false,
    };
    mockRegistryRequest.mockResolvedValue(mockResponse);

    const result = await getPartnerDefaultCircuit();

    expect(mockRegistryRequest).toHaveBeenCalledWith("/partner/default-circuit");
    expect(result.circuit_id).toBe("circ_abc123");
    expect(result.name).toBe("Fazenda Modelo");
    expect(result.source).toBe("WorkspaceSetting");
    expect(result.is_staging).toBe(false);
  });

  it("throws ApiError with status 404 when no circuit found", async () => {
    mockRegistryRequest.mockRejectedValue(new ApiError(404, "NOT_FOUND", "No default circuit"));

    await expect(getPartnerDefaultCircuit()).rejects.toThrow();
    try {
      await getPartnerDefaultCircuit();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as InstanceType<typeof ApiError>).status).toBe(404);
    }
  });

  it("throws ApiError with status 401/403 for auth errors", async () => {
    mockRegistryRequest.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Token expired"));

    await expect(getPartnerDefaultCircuit()).rejects.toThrow();
    try {
      await getPartnerDefaultCircuit();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as InstanceType<typeof ApiError>).status).toBe(401);
    }
  });
});

describe("PUT /partner/default-circuit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the default circuit", async () => {
    const mockResponse: DefaultCircuitResponse = {
      circuit_id: "circ_new",
      name: "Novo Circuito",
      is_staging: true,
      source: "WorkspaceSetting",
      workspace_id: "ws_001",
      changed: true,
    };
    mockRegistryRequest.mockResolvedValue(mockResponse);

    const result = await updatePartnerDefaultCircuit("circ_new");

    expect(mockRegistryRequest).toHaveBeenCalledWith("/partner/default-circuit", {
      method: "PUT",
      body: JSON.stringify({ circuit_id: "circ_new" }),
    });
    expect(result.changed).toBe(true);
    expect(result.circuit_id).toBe("circ_new");
  });
});

describe("Fallback behavior (integration scenario)", () => {
  it("fallback: when endpoint fails with network error, caller can use circuits[0]", async () => {
    mockRegistryRequest.mockRejectedValue(new Error("Network error"));

    const mockCircuits = [{ id: "circ_fallback", name: "Primeiro" }];
    let resolvedId = "";

    try {
      await getPartnerDefaultCircuit();
    } catch {
      // Simulate wizard fallback logic
      console.warn("[Test] Fallback to circuits[0]");
      resolvedId = mockCircuits[0].id;
    }

    expect(resolvedId).toBe("circ_fallback");
  });
});
