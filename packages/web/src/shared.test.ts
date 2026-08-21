import { describe, expect, test } from "bun:test";

import { costSummary, formatRequestCost } from "./shared.js";

describe("request pricing", () => {
  test("formats request prices without rounding small values to zero", () => {
    expect(formatRequestCost(0.002206)).toBe("$0.002206");
    expect(formatRequestCost(0.1)).toBe("$0.10");
  });

  test("summarizes request-only and mixed pricing", () => {
    expect(costSummary(undefined, undefined, 0.24)).toBe("$0.24 / request");
    expect(costSummary(1, 2, 0.24)).toBe("$1.00 / $2.00 + $0.24 / request");
  });
});
