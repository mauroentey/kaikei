import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseDate, parseMoney } from "./reconciliation-engine.mjs";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_ROWS = 15_000;
const SUPPORTED_EXTENSIONS = new Set([".xlsx", ".csv", ".ofx", ".qfx", ".pdf"]);

const FIELD_SYNONYMS = {
  date: ["fecha", "date", "fec", "f movimiento", "fecha movimiento", "fecha transaccion", "f transaccion"],
  description: ["descripcion", "description", "detalle", "concepto", "memo", "nombre", "movimiento", "transaccion"],
  reference: ["referencia", "reference", "ref", "documento", "comprobante", "numero", "nro", "id transaccion", "fitid"],
  debit: ["debito", "debitos", "debe", "cargo", "cargos", "retiro", "retiros", "egreso", "egresos"],
  credit: ["credito", "creditos", "haber", "abono", "abonos", "deposito", "depositos", "ingreso", "ingresos"],
  amount: ["valor", "monto", "importe", "amount", "valor movimiento", "monto transaccion"],
  balance: ["saldo", "balance", "saldo disponible", "saldo contable", "saldo final"],
  type: ["tipo", "naturaleza", "clase", "tipo movimiento", "debito credito", "d c", "dc"],
};

export async function parseFinancialFile(filePath, role) {
  const stat = await fs.stat(filePath);
  const extension = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("Formato no compatible. Usa XLSX, CSV, OFX, QFX o PDF.");
  }
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error("El archivo supera el máximo de 25 MB.");
  }

  const buffer = await fs.readFile(filePath);
  let parsed;
  if (extension === ".xlsx") parsed = await parseWorkbook(buffer);
  else if (extension === ".csv") parsed = parseCsv(buffer);
  else if (extension === ".ofx" || extension === ".qfx") parsed = parseOfx(buffer);
  else parsed = await parsePdf(buffer);

  const headerRowIndex = selectHeaderRow(parsed.matrix);
  const { headers, rows } = matrixToRows(parsed.matrix, headerRowIndex);
  const mapping = inferMapping(headers);
  const warnings = [...parsed.warnings];
  if (!mapping.date) warnings.push("No se detectó la columna de fecha.");
  if (!mapping.amount && !mapping.debit && !mapping.credit) {
    warnings.push("No se detectaron columnas de valor, débito o crédito.");
  }
  if (parsed.matrix.length > MAX_ROWS + headerRowIndex + 1) {
    warnings.push(`Se cargaron las primeras ${MAX_ROWS.toLocaleString("es-CO")} filas.`);
  }
  if (extension === ".pdf") {
    warnings.push("Los PDF se interpretan por texto. Revisa la vista previa y el sentido de débitos/créditos antes de analizar.");
  }

  return {
    id: crypto.randomUUID(),
    role,
    name: path.basename(filePath),
    extension,
    size: stat.size,
    sheetName: parsed.sheetName,
    headers,
    rows: rows.slice(0, MAX_ROWS),
    preview: rows.slice(0, 6),
    rowCount: Math.min(rows.length, MAX_ROWS),
    mapping,
    warnings,
    rawText: parsed.rawText?.slice(0, 60_000) ?? "",
  };
}

async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  let selected = null;
  for (const worksheet of workbook.worksheets) {
    if (!selected || worksheet.actualRowCount > selected.actualRowCount) selected = worksheet;
  }
  if (!selected) throw new Error("El libro no contiene hojas con información.");

  const matrix = [];
  selected.eachRow({ includeEmpty: false }, (row) => {
    const values = [];
    const upper = Math.min(row.cellCount, 80);
    for (let column = 1; column <= upper; column += 1) {
      values.push(cellValue(row.getCell(column)));
    }
    matrix.push(values);
  });
  return { matrix, sheetName: selected.name, warnings: [], rawText: "" };
}

function cellValue(cell) {
  if (cell.value instanceof Date) return cell.value;
  if (typeof cell.value === "number") return cell.value;
  if (cell.value && typeof cell.value === "object") {
    if ("result" in cell.value && cell.value.result !== undefined) return cell.value.result;
    if ("text" in cell.value) return cell.value.text;
    if ("richText" in cell.value) return cell.value.richText.map((part) => part.text).join("");
  }
  return cell.text || cell.value || "";
}

function decodeText(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return new TextDecoder("utf-16le").decode(buffer);
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  const replacementCount = (utf8.match(/�/g) || []).length;
  if (replacementCount > 2) return new TextDecoder("windows-1252").decode(buffer);
  return utf8.replace(/^\uFEFF/, "");
}

function parseCsv(buffer) {
  const text = decodeText(buffer);
  const result = Papa.parse(text, { skipEmptyLines: "greedy", dynamicTyping: false });
  if (result.errors.length && !result.data.length) throw new Error(result.errors[0].message);
  return {
    matrix: result.data.map((row) => Array.isArray(row) ? row : Object.values(row)),
    sheetName: "CSV",
    warnings: result.errors.slice(0, 3).map((error) => `CSV: ${error.message}`),
    rawText: "",
  };
}

function parseOfx(buffer) {
  const text = decodeText(buffer);
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi)
    ?? text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>)/gi)
    ?? [];
  const header = ["Fecha", "Descripción", "Referencia", "Valor", "Tipo"];
  const matrix = [header];
  for (const block of blocks) {
    const date = tag(block, "DTPOSTED").slice(0, 8);
    const formattedDate = date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date;
    const amount = tag(block, "TRNAMT");
    const type = tag(block, "TRNTYPE");
    const name = tag(block, "NAME");
    const memo = tag(block, "MEMO");
    const reference = tag(block, "FITID") || tag(block, "CHECKNUM") || tag(block, "REFNUM");
    matrix.push([formattedDate, [name, memo].filter(Boolean).join(" · "), reference, amount, type]);
  }
  if (matrix.length === 1) throw new Error("No se encontraron movimientos STMTTRN en el archivo OFX/QFX.");
  return { matrix, sheetName: "OFX", warnings: [], rawText: "" };
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"));
  return match?.[1]?.trim() ?? "";
}

async function parsePdf(buffer) {
  const document = await getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;
  const lines = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const positioned = content.items
      .filter((item) => "str" in item && item.str.trim())
      .map((item) => ({ text: item.str.trim(), x: item.transform[4], y: item.transform[5] }))
      .sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x);
    let current = [];
    let y = null;
    for (const item of positioned) {
      if (y !== null && Math.abs(item.y - y) > 2) {
        lines.push(current.join(" "));
        current = [];
      }
      current.push(item.text);
      y = item.y;
    }
    if (current.length) lines.push(current.join(" "));
  }

  const rawText = lines.join("\n");
  const matrix = [["Fecha", "Descripción", "Valor", "Saldo"]];
  for (const line of lines) {
    const dateMatch = line.match(/\b(\d{1,2}[/.\-]\d{1,2}[/.\-](?:\d{2}|\d{4}))\b/);
    if (!dateMatch) continue;
    const moneyMatches = [...line.matchAll(/(?:\(?-?\$?\s*\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?\)?|\(?-?\$?\s*\d+(?:[.,]\d{2})\)?)/g)]
      .map((match) => ({ token: match[0].trim(), index: match.index ?? 0 }))
      .filter((item) => item.index > (dateMatch.index ?? 0) + dateMatch[0].length);
    if (!moneyMatches.length) continue;

    const balanceToken = moneyMatches.length > 1 ? moneyMatches[moneyMatches.length - 1].token : "";
    const amountToken = moneyMatches.length > 1 ? moneyMatches[moneyMatches.length - 2].token : moneyMatches[0].token;
    const descriptionStart = (dateMatch.index ?? 0) + dateMatch[0].length;
    const descriptionEnd = moneyMatches[Math.max(0, moneyMatches.length - 2)].index;
    const description = line.slice(descriptionStart, descriptionEnd).trim();
    let amount = parseMoney(amountToken);
    const lowered = normalize(description);
    if (amount > 0 && /compra|retiro|debito|pago|cuota|comision|gravamen|impuesto|cargo/.test(lowered)) {
      amount = -amount;
    }
    matrix.push([parseDate(dateMatch[1]), description || "Movimiento bancario", amount, balanceToken]);
  }
  if (matrix.length === 1) {
    throw new Error("No fue posible identificar filas de movimientos en el PDF. Exporta el extracto como CSV, XLSX u OFX.");
  }
  return { matrix, sheetName: "PDF", warnings: [], rawText };
}

function selectHeaderRow(matrix) {
  let bestIndex = 0;
  let bestScore = -1;
  matrix.slice(0, 20).forEach((row, index) => {
    const normalized = row.map(normalize);
    const synonymHits = Object.values(FIELD_SYNONYMS).flat().filter((term) => normalized.some((cell) => cell === term || cell.includes(term))).length;
    const textCells = normalized.filter((cell) => cell && !/^[-+$\d.,()\s]+$/.test(cell)).length;
    const score = synonymHits * 10 + textCells;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function matrixToRows(matrix, headerRowIndex) {
  const rawHeaders = matrix[headerRowIndex] ?? [];
  const seen = new Map();
  const headers = rawHeaders.map((value, index) => {
    const base = String(value ?? "").trim() || `Columna ${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
  const rows = matrix.slice(headerRowIndex + 1).map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  }).filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
  return { headers, rows };
}

export function inferMapping(headers) {
  const mapping = {};
  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    const exact = headers.find((header) => synonyms.includes(normalize(header)));
    const partial = headers.find((header) => synonyms.some((term) => normalize(header).includes(term)));
    mapping[field] = exact || partial || "";
  }
  if (!mapping.description) {
    mapping.description = headers.find((header) => !Object.values(mapping).includes(header)) ?? "";
  }
  return mapping;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const fileLimits = {
  maxFileBytes: MAX_FILE_BYTES,
  maxRows: MAX_ROWS,
  supportedExtensions: [...SUPPORTED_EXTENSIONS],
};
