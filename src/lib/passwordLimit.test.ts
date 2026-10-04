import { describe, expect, it } from "vitest";
import { MAX_PASSWORD_BYTES, passwordBytes, passwordTooLong } from "./passwordLimit";

describe("passwordLimit (bcrypt: 72 bytes)", () => {
  it("conta bytes UTF-8, não caracteres", () => {
    expect(passwordBytes("abc")).toBe(3);
    expect(passwordBytes("é")).toBe(2);
    expect(passwordBytes("😀")).toBe(4);
  });

  it("aceita até 72 bytes e recusa acima, igual ao servidor", () => {
    expect(MAX_PASSWORD_BYTES).toBe(72);
    expect(passwordTooLong("a".repeat(72))).toBe(false);
    expect(passwordTooLong("a".repeat(73))).toBe(true);
    expect(passwordTooLong("é".repeat(36))).toBe(false);
    expect(passwordTooLong("é".repeat(37))).toBe(true);
  });
});
