import ExcelJS from "exceljs";
import { BrowserWindow } from "electron";

const BRAND_DARK = "FF103C34";
const BRAND_GREEN = "FF2D7A67";
const BRAND_MINT = "FFDCEEE8";
const BRAND_SAND = "FFF3F0E9";
const WHITE = "FFFFFFFF";

export async function buildExcelReport(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kaikei";
  workbook.created = new Date();
  workbook.subject = "Conciliación bancaria";
  workbook.properties.date1904 = false;

  addSummarySheet(workbook, report);
  addMatchesSheet(workbook, report.matches);
  addPendingBookSheet(workbook, report.unmatchedBook);
  addPendingBankSheet(workbook, report.unmatchedBank);
  addFindingsSheet(workbook, report.findings);
  addAdjustmentsSheet(workbook, report.adjustments);
  addControlsSheet(workbook, report.controls);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function addSummarySheet(workbook, report) {
  const sheet = workbook.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 34 }, { width: 24 }, { width: 70 }];
  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value = "KAIKEI · REPORTE DE CONCILIACIÓN BANCARIA";
  sheet.getCell("A1").font = { color: WHITE, bold: true, size: 16 };
  sheet.getCell("A1").fill = fill(BRAND_DARK);
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 34;

  const metadataRows = [
    ["Entidad", report.metadata.entityName],
    ["Cuenta", report.metadata.accountLabel],
    ["Fecha de corte", report.metadata.cutoffDate],
    ["Generado", report.metadata.generatedAt],
    ["Moneda", report.metadata.currency],
    ["Metodología", report.metadata.methodology],
  ];
  metadataRows.forEach((row, index) => {
    sheet.getCell(index + 3, 1).value = row[0];
    sheet.getCell(index + 3, 1).font = { bold: true, color: BRAND_DARK };
    sheet.getCell(index + 3, 2).value = row[1];
    sheet.mergeCells(index + 3, 2, index + 3, 3);
  });

  const start = 11;
  sheet.getCell(start, 1).value = "Indicador";
  sheet.getCell(start, 2).value = "Resultado";
  styleHeader(sheet.getRow(start));
  const metrics = [
    ["Saldo en libros", report.metrics.bookBalance, "currency"],
    ["Saldo del extracto", report.metrics.bankBalance, "currency"],
    ["Saldo ajustado en libros", report.metrics.adjustedBookBalance, "currency"],
    ["Saldo ajustado bancario", report.metrics.adjustedBankBalance, "currency"],
    ["Diferencia inicial", report.metrics.differenceBefore, "currency"],
    ["Diferencia después de ajustes", report.metrics.differenceAfter, "currency"],
    ["Movimientos conciliados", report.metrics.matchedCount, "number"],
    ["Tasa de conciliación", report.metrics.reconciliationRate / 100, "percent"],
  ];
  metrics.forEach(([label, value, type], index) => {
    const row = sheet.getRow(start + index + 1);
    row.values = [label, value];
    if (type === "currency") row.getCell(2).numFmt = '"$" #,##0.00;[Red]-"$" #,##0.00';
    if (type === "percent") row.getCell(2).numFmt = "0.0%";
    row.getCell(1).font = { bold: true };
  });

  const summaryRow = start + metrics.length + 3;
  sheet.mergeCells(summaryRow, 1, summaryRow, 3);
  sheet.getCell(summaryRow, 1).value = "Resumen ejecutivo";
  sheet.getCell(summaryRow, 1).font = { bold: true, color: BRAND_DARK, size: 12 };
  sheet.getCell(summaryRow, 1).fill = fill(BRAND_MINT);
  sheet.mergeCells(summaryRow + 1, 1, summaryRow + 3, 3);
  sheet.getCell(summaryRow + 1, 1).value = report.executiveSummary;
  sheet.getCell(summaryRow + 1, 1).alignment = { wrapText: true, vertical: "top" };

  const limitationsRow = summaryRow + 5;
  sheet.mergeCells(limitationsRow, 1, limitationsRow, 3);
  sheet.getCell(limitationsRow, 1).value = "Limitaciones y revisión humana";
  sheet.getCell(limitationsRow, 1).font = { bold: true, color: BRAND_DARK, size: 12 };
  sheet.getCell(limitationsRow, 1).fill = fill(BRAND_SAND);
  report.scopeLimitations.forEach((item, index) => {
    sheet.mergeCells(limitationsRow + index + 1, 1, limitationsRow + index + 1, 3);
    sheet.getCell(limitationsRow + index + 1, 1).value = `• ${item}`;
    sheet.getCell(limitationsRow + index + 1, 1).alignment = { wrapText: true };
  });
  sheet.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

function addMatchesSheet(workbook, matches) {
  const sheet = createTableSheet(workbook, "Conciliados", [
    { header: "ID", key: "id", width: 14 },
    { header: "IDs contables", key: "book", width: 34 },
    { header: "IDs bancarios", key: "bank", width: 34 },
    { header: "Valor", key: "amount", width: 18 },
    { header: "Tipo de cruce", key: "type", width: 20 },
    { header: "Confianza", key: "confidence", width: 14 },
    { header: "Explicación", key: "explanation", width: 62 },
  ]);
  matches.forEach((item) => sheet.addRow({
    id: item.id,
    book: item.bookTransactionIds.join(", "),
    bank: item.bankTransactionIds.join(", "),
    amount: item.amount,
    type: item.matchType,
    confidence: item.confidence,
    explanation: item.explanation,
  }));
  formatColumns(sheet, ["D"], ["F"]);
}

function addPendingBookSheet(workbook, items) {
  const sheet = createTableSheet(workbook, "Pendientes libros", pendingColumns());
  items.forEach((item) => sheet.addRow(pendingRow(item)));
  formatColumns(sheet, ["E"]);
}

function addPendingBankSheet(workbook, items) {
  const sheet = createTableSheet(workbook, "Pendientes banco", pendingColumns());
  items.forEach((item) => sheet.addRow(pendingRow(item)));
  formatColumns(sheet, ["E"]);
}

function pendingColumns() {
  return [
    { header: "ID transacción", key: "id", width: 22 },
    { header: "Fecha", key: "date", width: 14 },
    { header: "Categoría", key: "category", width: 24 },
    { header: "Descripción", key: "description", width: 44 },
    { header: "Valor", key: "amount", width: 18 },
    { header: "Explicación", key: "explanation", width: 55 },
    { header: "Acción sugerida", key: "action", width: 55 },
  ];
}

function pendingRow(item) {
  return {
    id: item.transactionId,
    date: item.date,
    category: item.category,
    description: item.description,
    amount: item.amount,
    explanation: item.explanation,
    action: item.suggestedAction,
  };
}

function addFindingsSheet(workbook, findings) {
  const sheet = createTableSheet(workbook, "Hallazgos", [
    { header: "ID", key: "id", width: 14 },
    { header: "Severidad", key: "severity", width: 16 },
    { header: "Hallazgo", key: "title", width: 38 },
    { header: "Descripción", key: "description", width: 60 },
    { header: "Evidencia", key: "evidence", width: 36 },
    { header: "Recomendación", key: "recommendation", width: 60 },
  ]);
  findings.forEach((item) => sheet.addRow({
    ...item,
    evidence: item.evidenceIds.join(", "),
  }));
}

function addAdjustmentsSheet(workbook, adjustments) {
  const sheet = createTableSheet(workbook, "Ajustes sugeridos", [
    { header: "ID", key: "id", width: 14 },
    { header: "Estado", key: "status", width: 16 },
    { header: "Cuenta débito", key: "debit", width: 34 },
    { header: "Cuenta crédito", key: "credit", width: 34 },
    { header: "Valor", key: "amount", width: 18 },
    { header: "Descripción", key: "description", width: 56 },
    { header: "Evidencia", key: "evidence", width: 32 },
    { header: "Requiere aprobación", key: "approval", width: 20 },
  ]);
  adjustments.forEach((item) => sheet.addRow({
    id: item.id,
    status: "Sugerido — no contabilizado",
    debit: item.debitAccount,
    credit: item.creditAccount,
    amount: item.amount,
    description: item.description,
    evidence: item.evidenceIds.join(", "),
    approval: item.requiresApproval ? "Sí" : "No",
  }));
  formatColumns(sheet, ["E"]);
}

function addControlsSheet(workbook, controls) {
  const sheet = createTableSheet(workbook, "Controles", [
    { header: "ID", key: "id", width: 14 },
    { header: "Control", key: "name", width: 44 },
    { header: "Estado", key: "status", width: 16 },
    { header: "Observación", key: "note", width: 72 },
  ]);
  controls.forEach((item) => sheet.addRow(item));
}

function createTableSheet(workbook, name, columns) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns;
  styleHeader(sheet.getRow(1));
  sheet.autoFilter = { from: "A1", to: `${columnLetter(columns.length)}1` };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true };
  });
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return sheet;
}

function styleHeader(row) {
  row.font = { color: WHITE, bold: true };
  row.fill = fill(BRAND_GREEN);
  row.alignment = { vertical: "middle", horizontal: "left" };
  row.height = 26;
}

function formatColumns(sheet, currencyColumns = [], percentColumns = []) {
  currencyColumns.forEach((letter) => {
    sheet.getColumn(letter).numFmt = '"$" #,##0.00;[Red]-"$" #,##0.00';
  });
  percentColumns.forEach((letter) => {
    sheet.getColumn(letter).numFmt = "0.0%";
  });
}

function fill(argb) {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function columnLetter(number) {
  let result = "";
  let current = number;
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}

export async function buildPdfReport(report) {
  const window = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true },
  });
  try {
    const html = reportHtml(report);
    await window.loadURL(`data:text/html;base64,${Buffer.from(html).toString("base64")}`);
    return await window.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    });
  } finally {
    window.destroy();
  }
}

function reportHtml(report) {
  const findingRows = report.findings.map((item) => `
    <tr><td><span class="severity ${escapeHtml(item.severity)}">${escapeHtml(item.severity)}</span></td><td><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.description)}</td><td>${escapeHtml(item.recommendation)}</td></tr>`).join("");
  const pendingRows = [...report.unmatchedBook.map((item) => ({ ...item, source: "Libros" })), ...report.unmatchedBank.map((item) => ({ ...item, source: "Banco" }))]
    .slice(0, 120)
    .map((item) => `<tr><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.description)}</td><td class="amount">${formatCop(item.amount)}</td><td>${escapeHtml(item.suggestedAction)}</td></tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:12px/1.5 Arial,sans-serif;color:#173d35;margin:0}header{background:#103c34;color:white;padding:24px;border-radius:14px;margin-bottom:18px}h1{font-size:24px;margin:0 0 4px}.eyebrow{text-transform:uppercase;letter-spacing:1.6px;font-size:9px;color:#a6d8c8}.meta{color:#dceee8}.summary{font-size:14px;background:#edf7f3;border-left:4px solid #2d7a67;padding:14px;margin:16px 0}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.metric{background:#f5f3ee;padding:10px;border-radius:9px}.metric b{display:block;font-size:15px;margin-top:4px}h2{font-size:16px;margin:22px 0 8px}table{width:100%;border-collapse:collapse;page-break-inside:auto}tr{page-break-inside:avoid}th{background:#2d7a67;color:white;text-align:left;padding:7px}td{border-bottom:1px solid #dce6e2;padding:7px;vertical-align:top}.amount{text-align:right;white-space:nowrap}.severity{font-size:9px;text-transform:uppercase;font-weight:bold}.critical{color:#a23b32}.warning{color:#a86b00}.info{color:#266596}.note{margin-top:20px;padding-top:10px;border-top:1px solid #ccd9d5;color:#526e67;font-size:10px}
  </style></head><body><header><div class="eyebrow">Kaikei · Conciliación bancaria</div><h1>${escapeHtml(report.metadata.entityName || "Reporte de conciliación")}</h1><div class="meta">${escapeHtml(report.metadata.accountLabel)} · Corte ${escapeHtml(report.metadata.cutoffDate)}</div></header>
  <div class="summary">${escapeHtml(report.executiveSummary)}</div><div class="metrics">
  <div class="metric">Conciliación<b>${report.metrics.reconciliationRate.toFixed(1)}%</b></div><div class="metric">Conciliados<b>${report.metrics.matchedCount}</b></div><div class="metric">Pendientes<b>${report.metrics.unmatchedBookCount + report.metrics.unmatchedBankCount}</b></div><div class="metric">Diferencia final<b>${formatCop(report.metrics.differenceAfter)}</b></div></div>
  <h2>Hallazgos</h2><table><thead><tr><th>Severidad</th><th>Hallazgo</th><th>Recomendación</th></tr></thead><tbody>${findingRows || "<tr><td colspan=3>Sin hallazgos materiales.</td></tr>"}</tbody></table>
  <h2>Partidas pendientes</h2><table><thead><tr><th>Fuente</th><th>Fecha</th><th>Descripción</th><th>Valor</th><th>Acción sugerida</th></tr></thead><tbody>${pendingRows || "<tr><td colspan=5>Sin partidas pendientes.</td></tr>"}</tbody></table>
  <div class="note">Documento generado por Kaikei con asistencia de Codex. Los ajustes son sugerencias sujetas a soporte, revisión y aprobación del responsable contable. Este reporte no reemplaza el juicio profesional ni las políticas de la entidad.</div></body></html>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function formatCop(value) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 }).format(value);
}
