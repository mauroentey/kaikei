import { describe, expect, it } from "vitest";
import { inferMapping } from "../electron/file-parser.mjs";

describe("inferMapping", () => {
  it("reconoce encabezados frecuentes de auxiliares colombianos", () => {
    const mapping = inferMapping(["Fecha movimiento", "Comprobante", "Detalle", "Débitos", "Créditos", "Saldo final"]);
    expect(mapping.date).toBe("Fecha movimiento");
    expect(mapping.reference).toBe("Comprobante");
    expect(mapping.description).toBe("Detalle");
    expect(mapping.debit).toBe("Débitos");
    expect(mapping.credit).toBe("Créditos");
    expect(mapping.balance).toBe("Saldo final");
  });
});
