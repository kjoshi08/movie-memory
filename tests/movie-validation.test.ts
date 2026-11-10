import { describe, expect, it } from "vitest";
import { movieSchema } from "@/lib/movie";

describe("favorite movie input", () => {
  it("trims valid titles, including short film titles", () => {
    expect(movieSchema.parse("  M  ")).toBe("M");
    expect(movieSchema.parse("  Spirited Away  ")).toBe("Spirited Away");
  });
  it("rejects blank, oversized, non-string, and control-character values", () => {
    for (const value of ["   ", "a".repeat(121), null, "Film\u0000"]) {
      expect(movieSchema.safeParse(value).success).toBe(false);
    }
  });
});
