import { describe, expect, it } from "vitest";
import {
  normalizeRows,
  parseDate,
  parseMoney,
  reconcileTransactions,
} from "../electron/reconciliation-engine.mjs";

describe("parseMoney", () => {
  it("interpreta formatos colombianos y anglosajones", () => {
    expect(parseMoney("$ 1.234.567,89")).toBe(1234567.89);
    expect(parseMoney("1,234,567.89")).toBe(1234567.89);
    expect(parseMoney("(250.000)")).toBe(-250000);
    expect(parseMoney("84.500-")).toBe(-84500);
  });
});

describe("parseDate", () => {
  it("normaliza fechas comunes y seriales de Excel", () => {
    expect(parseDate("31/01/2026")).toBe("2026-01-31");
    expect(parseDate("2026-06-30")).toBe("2026-06-30");
    expect(parseDate(46022)).toBe("2025-12-31");
  });
});

describe("normalizeRows", () => {
  it("usa la naturaleza contable correcta para débito y crédito", () => {
    const result = normalizeRows({
      fileId: "123456789",
      sourceName: "auxiliar.csv",
      role: "accounting",
      mapping: { date: "Fecha", description: "Detalle", reference: "Ref", debit: "Débito", credit: "Crédito", amount: "", balance: "", type: "" },
      rows: [
        { Fecha: "01/06/2026", Detalle: "Recaudo", Ref: "R-1", Débito: "1.000.000", Crédito: "" },
        { Fecha: "02/06/2026", Detalle: "Pago", Ref: "P-1", Débito: "", Crédito: "250.000" },
      ],
    });
    expect(result.transactions.map((item) => item.amount)).toEqual([1000000, -250000]);
  });
});

describe("reconcileTransactions", () => {
  it("cruza uno a uno por valor, fecha y referencia", () => {
    const book = [{ id: "L-1", date: "2026-06-05", amount: 100000, description: "Pago cliente", reference: "ABC123" }];
    const bank = [{ id: "B-1", date: "2026-06-06", amount: 100000, description: "Abono PSE", reference: "ABC123" }];
    const result = reconcileTransactions(book, bank, { amountTolerance: 1, dateToleranceDays: 3 });
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchType).toBe("reference");
    expect(result.unmatchedBook).toHaveLength(0);
    expect(result.unmatchedBank).toHaveLength(0);
  });

  it("encuentra cruces agrupados sin reutilizar transacciones", () => {
    const book = [
      { id: "L-1", date: "2026-06-10", amount: 60000, description: "Venta A", reference: "" },
      { id: "L-2", date: "2026-06-10", amount: 40000, description: "Venta B", reference: "" },
    ];
    const bank = [{ id: "B-1", date: "2026-06-11", amount: 100000, description: "Consignación", reference: "" }];
    const result = reconcileTransactions(book, bank, { amountTolerance: 1, dateToleranceDays: 3, allowGrouped: true });
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchType).toBe("grouped");
    expect(result.matches[0].bookTransactionIds).toEqual(["L-1", "L-2"]);
  });

  it("no cruza valores iguales con signos opuestos", () => {
    const book = [{ id: "L-1", date: "2026-06-05", amount: -100000, description: "Pago", reference: "" }];
    const bank = [{ id: "B-1", date: "2026-06-05", amount: 100000, description: "Abono", reference: "" }];
    const result = reconcileTransactions(book, bank);
    expect(result.matches).toHaveLength(0);
  });
});
