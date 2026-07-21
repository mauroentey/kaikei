import { describe, expect, it } from "vitest";
import { reconciliationOutputSchema, parseReconciliationReport } from "../electron/report-schema.mjs";

describe("esquema del reporte", () => {
  it("expone un JSON Schema estricto para App Server", () => {
    expect(reconciliationOutputSchema.type).toBe("object");
    expect(reconciliationOutputSchema.properties.metrics).toBeTruthy();
    expect(reconciliationOutputSchema.required).toContain("findings");
  });

  it("rechaza reportes sin campos de auditoría", () => {
    expect(() => parseReconciliationReport({ version: "1.0" })).toThrow();
  });
});
