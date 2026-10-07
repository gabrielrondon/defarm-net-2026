import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./safeReturnPath";

describe("safeReturnPath (net#237)", () => {
  it("keeps internal paths with query and hash", () => {
    expect(safeReturnPath("/app/configuracoes?tab=seguranca")).toBe("/app/configuracoes?tab=seguranca");
    expect(safeReturnPath("/app")).toBe("/app");
    expect(safeReturnPath("/app/selados#x")).toBe("/app/selados#x");
    expect(safeReturnPath("/i/DFID-DEFARM-BR-2026-000001-abcdef")).toBe("/i/DFID-DEFARM-BR-2026-000001-abcdef");
  });

  it("rejects anything that could leave the app", () => {
    for (const bad of [
      "https://evil.example/app/x",
      "//evil.example/app",
      "/\\evil.example",
      "\\\\evil.example",
      "/%2F%2Fevil.example",
      "%2F%2Fevil.example",
      "/app/%5C%5Cevil.example",
      "/app\n/x",
      "/app/%0a",
      "javascript:alert(1)",
      "/app/../admin",
      "/admin",
      "/login",
      "",
      "   ",
      "app/x",
    ]) {
      expect(safeReturnPath(bad), bad).toBeNull();
    }
  });

  it("ignores non-strings", () => {
    expect(safeReturnPath(undefined)).toBeNull();
    expect(safeReturnPath(null)).toBeNull();
    expect(safeReturnPath({ pathname: "/app" })).toBeNull();
  });
});
