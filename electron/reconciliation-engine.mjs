import crypto from "node:crypto";

const EPSILON = 1e-9;

export function parseMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;

  let raw = String(value).trim();
  if (!raw) return 0;

  const isNegative = /^\(.*\)$/.test(raw) || /^-/.test(raw) || /-$/.test(raw);
  raw = raw.replace(/[()$\sA-Za-z]/g, "").replace(/^-|-$/g, "");
  if (!raw) return 0;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = raw.split(thousandsSeparator).join("").replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    const decimals = raw.length - lastComma - 1;
    normalized = decimals > 0 && decimals <= 2
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const decimals = raw.length - lastDot - 1;
    normalized = decimals > 0 && decimals <= 2
      ? raw.replace(/,/g, "")
      : raw.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return isNegative ? -Math.abs(parsed) : parsed;
}

export function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 86400000).toISOString().slice(0, 10);
  }

  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const latin = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (latin) {
    let year = Number(latin[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    return `${year}-${latin[2].padStart(2, "0")}-${latin[1].padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function normalizedText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function descriptionSimilarity(left, right) {
  const a = new Set(normalizedText(left).split(" ").filter((token) => token.length > 2));
  const b = new Set(normalizedText(right).split(" ").filter((token) => token.length > 2));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / Math.max(a.size, b.size);
}

function daysBetween(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  return Math.abs(new Date(`${left}T00:00:00Z`) - new Date(`${right}T00:00:00Z`)) / 86400000;
}

function inferSignedAmount(row, mapping, role) {
  const debit = parseMoney(row[mapping.debit]);
  const credit = parseMoney(row[mapping.credit]);
  const amount = parseMoney(row[mapping.amount]);
  const movementType = normalizedText(row[mapping.type]);

  if (mapping.debit || mapping.credit) {
    return role === "accounting" ? debit - credit : credit - debit;
  }

  if (mapping.type && Math.abs(amount) > EPSILON) {
    const debitLike = /(^| )(d|db|debito|cargo|retiro|egreso|salida|pago)( |$)/.test(movementType);
    const creditLike = /(^| )(c|cr|credito|abono|deposito|ingreso|entrada)( |$)/.test(movementType);
    if (role === "accounting") {
      if (debitLike) return Math.abs(amount);
      if (creditLike) return -Math.abs(amount);
    } else {
      if (debitLike) return -Math.abs(amount);
      if (creditLike) return Math.abs(amount);
    }
  }

  return amount;
}

function inferBankSign(amount, description) {
  if (amount < 0) return amount;
  const text = normalizedText(description);
  const debitWords = /compra|retiro|debito|pago|cuota|comision|gravamen|impuesto|transferencia enviada|salida/;
  const creditWords = /consignacion|abono|deposito|interes|transferencia recibida|recaudo|entrada/;
  if (debitWords.test(text) && !creditWords.test(text)) return -Math.abs(amount);
  return amount;
}

export function normalizeRows({ fileId, rows, mapping, role, sourceName }) {
  const transactions = [];
  const warnings = [];

  rows.forEach((row, index) => {
    const date = parseDate(row[mapping.date]);
    const description = String(row[mapping.description] ?? "").trim();
    const reference = String(row[mapping.reference] ?? "").trim();
    let amount = inferSignedAmount(row, mapping, role);
    if (role === "bank" && mapping.amount && !mapping.type && !mapping.debit && !mapping.credit) {
      amount = inferBankSign(amount, description);
    }
    const balance = mapping.balance ? parseMoney(row[mapping.balance]) : null;

    if (!date && Math.abs(amount) <= EPSILON && !description) return;
    if (!date || Math.abs(amount) <= EPSILON) {
      if (warnings.length < 8) warnings.push(`Fila ${index + 1}: falta fecha o valor; no se incluyó.`);
      return;
    }

    transactions.push({
      id: `${role === "accounting" ? "L" : "B"}-${fileId.slice(0, 6)}-${index + 1}`,
      sourceFileId: fileId,
      sourceName,
      sourceRow: index + 1,
      date,
      description: description || "Sin descripción",
      reference,
      amount: roundCurrency(amount),
      balance: balance === null ? null : roundCurrency(balance),
    });
  });

  return { transactions, warnings };
}

export function detectDuplicates(transactions) {
  const groups = new Map();
  for (const transaction of transactions) {
    const key = [transaction.date, roundCurrency(transaction.amount), normalizedText(transaction.description)].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(transaction.id);
  }
  return [...groups.values()].filter((ids) => ids.length > 1);
}

function candidateScore(book, bank, dateToleranceDays, amountTolerance) {
  if (Math.sign(book.amount) !== Math.sign(bank.amount)) return null;
  const amountDifference = Math.abs(book.amount - bank.amount);
  if (amountDifference > amountTolerance) return null;
  const dayDifference = daysBetween(book.date, bank.date);
  if (dayDifference > dateToleranceDays) return null;

  const refA = normalizedText(book.reference);
  const refB = normalizedText(bank.reference);
  const sameReference = refA && refB && (refA === refB || refA.includes(refB) || refB.includes(refA));
  const similarity = descriptionSimilarity(book.description, bank.description);
  const amountScore = amountDifference <= 0.01 ? 0.56 : 0.48;
  const dateScore = 0.2 * (1 - dayDifference / Math.max(1, dateToleranceDays + 1));
  const referenceScore = sameReference ? 0.17 : 0;
  const descriptionScore = 0.07 * similarity;
  return {
    score: Math.min(0.99, amountScore + dateScore + referenceScore + descriptionScore),
    dayDifference,
    sameReference,
    similarity,
  };
}

function findCombination(target, candidates, tolerance, maxSize = 3) {
  const usable = candidates
    .filter((item) => Math.sign(item.amount) === Math.sign(target.amount))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 20);
  const targetCents = Math.round(target.amount * 100);
  const toleranceCents = Math.max(1, Math.round(tolerance * 100));

  for (let size = 2; size <= maxSize; size += 1) {
    const walk = (start, picked, total) => {
      if (picked.length === size) {
        return Math.abs(total - targetCents) <= toleranceCents ? picked : null;
      }
      for (let i = start; i < usable.length; i += 1) {
        const result = walk(i + 1, [...picked, usable[i]], total + Math.round(usable[i].amount * 100));
        if (result) return result;
      }
      return null;
    };
    const result = walk(0, [], 0);
    if (result) return result;
  }
  return null;
}

export function reconcileTransactions(bookTransactions, bankTransactions, options = {}) {
  const amountTolerance = Number(options.amountTolerance ?? 1);
  const dateToleranceDays = Number(options.dateToleranceDays ?? 3);
  const allowGrouped = options.allowGrouped !== false;
  const matches = [];
  const usedBook = new Set();
  const usedBank = new Set();

  const candidates = [];
  for (const book of bookTransactions) {
    for (const bank of bankTransactions) {
      const candidate = candidateScore(book, bank, dateToleranceDays, amountTolerance);
      if (candidate) candidates.push({ book, bank, ...candidate });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.dayDifference - b.dayDifference);

  for (const candidate of candidates) {
    if (usedBook.has(candidate.book.id) || usedBank.has(candidate.bank.id)) continue;
    usedBook.add(candidate.book.id);
    usedBank.add(candidate.bank.id);
    const matchType = candidate.sameReference
      ? "reference"
      : candidate.dayDifference === 0
        ? "exact"
        : "date_window";
    matches.push({
      id: `M-${matches.length + 1}`,
      bookTransactionIds: [candidate.book.id],
      bankTransactionIds: [candidate.bank.id],
      amount: roundCurrency(Math.abs(candidate.book.amount)),
      matchType,
      confidence: roundScore(candidate.score),
      explanation: buildMatchExplanation(candidate, matchType),
    });
  }

  if (allowGrouped) {
    const remainingBook = () => bookTransactions.filter((item) => !usedBook.has(item.id));
    const remainingBank = () => bankTransactions.filter((item) => !usedBank.has(item.id));

    for (const bank of remainingBank()) {
      const nearBook = remainingBook().filter((book) => daysBetween(book.date, bank.date) <= dateToleranceDays);
      const combination = findCombination(bank, nearBook, amountTolerance);
      if (!combination) continue;
      combination.forEach((item) => usedBook.add(item.id));
      usedBank.add(bank.id);
      matches.push({
        id: `M-${matches.length + 1}`,
        bookTransactionIds: combination.map((item) => item.id),
        bankTransactionIds: [bank.id],
        amount: roundCurrency(Math.abs(bank.amount)),
        matchType: "grouped",
        confidence: 0.82,
        explanation: "La suma de varios movimientos contables coincide con un movimiento bancario dentro de la ventana de fechas.",
      });
    }

    for (const book of remainingBook()) {
      const nearBank = remainingBank().filter((bank) => daysBetween(book.date, bank.date) <= dateToleranceDays);
      const combination = findCombination(book, nearBank, amountTolerance);
      if (!combination) continue;
      usedBook.add(book.id);
      combination.forEach((item) => usedBank.add(item.id));
      matches.push({
        id: `M-${matches.length + 1}`,
        bookTransactionIds: [book.id],
        bankTransactionIds: combination.map((item) => item.id),
        amount: roundCurrency(Math.abs(book.amount)),
        matchType: "grouped",
        confidence: 0.82,
        explanation: "Un movimiento contable coincide con la suma de varios movimientos bancarios dentro de la ventana de fechas.",
      });
    }
  }

  const unmatchedBook = bookTransactions.filter((item) => !usedBook.has(item.id));
  const unmatchedBank = bankTransactions.filter((item) => !usedBank.has(item.id));
  const totalAbsoluteBook = bookTransactions.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const matchedBook = bookTransactions
    .filter((item) => usedBook.has(item.id))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);

  return {
    runId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    options: { amountTolerance, dateToleranceDays, allowGrouped },
    matches,
    unmatchedBook,
    unmatchedBank,
    duplicateBookGroups: detectDuplicates(bookTransactions),
    duplicateBankGroups: detectDuplicates(bankTransactions),
    metrics: {
      totalBookCount: bookTransactions.length,
      totalBankCount: bankTransactions.length,
      matchedBookCount: usedBook.size,
      matchedBankCount: usedBank.size,
      unmatchedBookCount: unmatchedBook.length,
      unmatchedBankCount: unmatchedBank.length,
      matchedAmount: roundCurrency(matchedBook),
      reconciliationRate: totalAbsoluteBook <= EPSILON ? 0 : roundScore((matchedBook / totalAbsoluteBook) * 100),
    },
  };
}

function buildMatchExplanation(candidate, matchType) {
  if (matchType === "reference") return "Valor y referencia coinciden dentro de la ventana de fechas.";
  if (matchType === "exact") return "Valor y fecha coinciden exactamente.";
  return `El valor coincide y existe una diferencia de ${candidate.dayDifference} día(s) entre registros.`;
}

export function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function roundScore(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
