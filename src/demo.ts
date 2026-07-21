import type { FileSummary, ReconciliationReport } from "./types";

export const demoAccountingFile: FileSummary = {
  id: "demo-accounting",
  role: "accounting",
  name: "Auxiliar_Bancos_Junio.xlsx",
  extension: ".xlsx",
  size: 184_220,
  sheetName: "Auxiliar 111005",
  headers: ["Fecha", "Comprobante", "Detalle", "Débito", "Crédito", "Saldo"],
  preview: [
    { Fecha: "2026-06-02", Comprobante: "RC-1044", Detalle: "Pago cliente Andina", Débito: 8_450_000, Crédito: 0, Saldo: 42_810_000 },
    { Fecha: "2026-06-03", Comprobante: "CE-889", Detalle: "Pago proveedor", Débito: 0, Crédito: 3_280_000, Saldo: 39_530_000 },
  ],
  rowCount: 486,
  mapping: { date: "Fecha", description: "Detalle", reference: "Comprobante", debit: "Débito", credit: "Crédito", amount: "", balance: "Saldo", type: "" },
  warnings: [],
};

export const demoBankFile: FileSummary = {
  id: "demo-bank",
  role: "bank",
  name: "Extracto_Bancolombia_Junio.pdf",
  extension: ".pdf",
  size: 428_100,
  sheetName: "PDF",
  headers: ["Fecha", "Descripción", "Valor", "Saldo"],
  preview: [
    { Fecha: "2026-06-02", Descripción: "ABONO PAGO PSE ANDINA", Valor: 8_450_000, Saldo: 42_810_000 },
    { Fecha: "2026-06-03", Descripción: "TRANSFERENCIA PROVEEDOR", Valor: -3_280_000, Saldo: 39_530_000 },
  ],
  rowCount: 491,
  mapping: { date: "Fecha", description: "Descripción", reference: "", debit: "", credit: "", amount: "Valor", balance: "Saldo", type: "" },
  warnings: ["Los PDF se interpretan por texto. Revisa la vista previa y el sentido de débitos/créditos antes de analizar."],
};

export const demoReport: ReconciliationReport = {
  version: "1.0",
  metadata: {
    generatedAt: "2026-07-21T17:20:00.000Z",
    cutoffDate: "2026-06-30",
    currency: "COP",
    entityName: "Comercializadora Horizonte S.A.S.",
    accountLabel: "Bancolombia · Cuenta corriente • 4821",
    accountingFiles: ["Auxiliar_Bancos_Junio.xlsx"],
    bankFiles: ["Extracto_Bancolombia_Junio.pdf"],
    methodology: "Cruce determinístico y revisión asistida por Codex",
  },
  executiveSummary: "La cuenta quedó conciliada al 96,8 %. Se identificaron tres partidas que requieren gestión: una comisión bancaria aún no registrada, una transferencia en tránsito y un posible movimiento duplicado en el auxiliar. Los saldos ajustados coinciden, sujeto a verificar los soportes indicados.",
  metrics: {
    bookBalance: 128_450_800,
    bankBalance: 126_970_800,
    adjustedBookBalance: 127_970_800,
    adjustedBankBalance: 127_970_800,
    differenceBefore: 1_480_000,
    differenceAfter: 0,
    matchedAmount: 418_620_000,
    matchedCount: 472,
    unmatchedBookAmount: 1_000_000,
    unmatchedBookCount: 2,
    unmatchedBankAmount: 480_000,
    unmatchedBankCount: 1,
    reconciliationRate: 96.8,
  },
  matches: [
    { id: "M-1", bookTransactionIds: ["L-a23-14"], bankTransactionIds: ["B-c91-11"], amount: 8_450_000, matchType: "reference", confidence: 0.98, explanation: "Valor y referencia coinciden dentro de la ventana de fechas." },
    { id: "M-2", bookTransactionIds: ["L-a23-15", "L-a23-16"], bankTransactionIds: ["B-c91-12"], amount: 3_280_000, matchType: "grouped", confidence: 0.84, explanation: "La suma de dos registros coincide con la transferencia bancaria." },
  ],
  unmatchedBook: [
    { transactionId: "L-a23-481", category: "outstanding_payment", amount: -1_000_000, date: "2026-06-30", description: "Transferencia proveedor Atlas", explanation: "Registrada el último día y no visible en el extracto del corte.", suggestedAction: "Verificar aplicación bancaria en julio y conservar soporte de la transferencia." },
    { transactionId: "L-a23-312", category: "book_error", amount: -320_000, date: "2026-06-18", description: "Pago servicio logística", explanation: "Mismo valor, fecha y descripción aparecen dos veces en libros.", suggestedAction: "Comparar comprobantes y reversar solo si se confirma el duplicado." },
  ],
  unmatchedBank: [
    { transactionId: "B-c91-490", category: "bank_fee", amount: -480_000, date: "2026-06-30", description: "COMISIÓN SERVICIOS EMPRESARIALES", explanation: "Cargo del banco sin movimiento contable asociado.", suggestedAction: "Obtener soporte bancario y registrar gasto/comisión contra bancos si procede." },
  ],
  findings: [
    { id: "H-1", severity: "critical", title: "Posible duplicado en el auxiliar", description: "Dos egresos por $320.000 comparten fecha y descripción.", evidenceIds: ["L-a23-312", "L-a23-313"], recommendation: "Revisar comprobantes y aprobación antes de cualquier reversión." },
    { id: "H-2", severity: "warning", title: "Comisión pendiente de registro", description: "El extracto incluye un cargo de $480.000 no localizado en libros.", evidenceIds: ["B-c91-490"], recommendation: "Reconocer el gasto únicamente con soporte suficiente." },
    { id: "H-3", severity: "info", title: "Transferencia en tránsito", description: "Un pago del cierre podría haberse aplicado en el periodo siguiente.", evidenceIds: ["L-a23-481"], recommendation: "Confirmar en el extracto de julio y cerrar el seguimiento." },
  ],
  adjustments: [
    { id: "A-1", status: "suggested", debitAccount: "Gastos bancarios", creditAccount: "Bancos", amount: 480_000, description: "Comisión de servicios empresariales de junio", evidenceIds: ["B-c91-490"], requiresApproval: true },
  ],
  controls: [
    { id: "C-1", name: "Igualdad de saldos ajustados", status: "pass", note: "Los saldos ajustados coinciden después de clasificar las partidas." },
    { id: "C-2", name: "Partidas antiguas", status: "pass", note: "No se detectaron partidas abiertas de periodos anteriores." },
    { id: "C-3", name: "Duplicidad", status: "review", note: "Existe un grupo con señales de duplicidad en el auxiliar." },
  ],
  scopeLimitations: ["Los ajustes son sugerencias; requieren soporte, revisión y aprobación antes de registrarse."],
  legalContext: ["Se aplicó el principio de representación fiel previsto en el marco colombiano de información financiera.", "La conciliación se trató como control que identifica, explica y gestiona diferencias; no como mecanismo para forzar saldos."],
};
