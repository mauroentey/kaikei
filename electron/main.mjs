import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { CodexAppServer, discoverCodexExecutable } from "./codex-client.mjs";
import { parseFinancialFile } from "./file-parser.mjs";
import { normalizeRows, reconcileTransactions, roundCurrency } from "./reconciliation-engine.mjs";
import { buildExcelReport, buildPdfReport } from "./exporter.mjs";
import { reconciliationOutputSchema, parseReconciliationReport } from "./report-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionFiles = new Map();
const sessionReports = new Map();
let mainWindow = null;
let codex = null;
let appSettings = {};

app.setName("Kaikei");
app.setAboutPanelOptions({
  applicationName: "Kaikei",
  applicationVersion: "0.1.0",
  version: "0.1.0",
  copyright: "© 2026 Mauricio Samper · Bogotá, Colombia",
  credits: "Conciliación bancaria asistida por Codex\nContacto: mauro@entey.net",
  website: "mailto:mauro@entey.net",
  iconPath: path.join(__dirname, "..", "assets", "icon.png"),
});

async function loadSettings() {
  try {
    const content = await fs.readFile(path.join(app.getPath("userData"), "settings.json"), "utf8");
    appSettings = JSON.parse(content);
  } catch {
    appSettings = {};
  }
}

async function saveSettings() {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(
    path.join(app.getPath("userData"), "settings.json"),
    JSON.stringify(appSettings, null, 2),
    "utf8",
  );
}

function createCodexClient() {
  codex?.stop();
  codex = new CodexAppServer({
    executablePath: discoverCodexExecutable(appSettings.codexPath),
    cwd: app.getPath("userData"),
  });
  codex.on("status", (payload) => sendToRenderer("codex:status-event", payload));
  codex.on("login-completed", async (payload) => {
    if (!payload.success) {
      sendToRenderer("codex:login-event", { success: false, error: payload.error || "No fue posible iniciar sesión." });
      return;
    }
    const account = await codex.getAccount().catch(() => ({ account: null }));
    sendToRenderer("codex:login-event", { success: true, account: account.account });
  });
  codex.on("account-updated", () => {
    codex.getAccount().then((account) => sendToRenderer("codex:account-event", account)).catch(() => {});
  });
  codex.on("analysis-progress", (payload) => sendToRenderer("reconciliation:progress", payload));
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 930,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#f5f3ed",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current && !url.startsWith("file://") && !url.startsWith("http://127.0.0.1")) event.preventDefault();
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(async () => {
  await loadSettings();
  createCodexClient();
  registerIpcHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  codex?.stop();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => codex?.stop());

function registerIpcHandlers() {
  ipcMain.handle("codex:account", async () => {
    try {
      return await codex.getAccount();
    } catch (error) {
      return { account: null, requiresOpenaiAuth: true, error: userFacingCodexError(error) };
    }
  });

  ipcMain.handle("codex:login", async () => {
    try {
      const response = await codex.loginWithChatGPT();
      if (response.type !== "chatgpt" || !response.authUrl) throw new Error("Codex no devolvió una URL de autenticación.");
      await shell.openExternal(response.authUrl);
      return { awaiting: true, loginId: response.loginId };
    } catch (error) {
      throw new Error(userFacingCodexError(error));
    }
  });

  ipcMain.handle("codex:logout", async () => codex.logout());

  ipcMain.handle("codex:choose-executable", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Selecciona el ejecutable de Codex",
      properties: ["openFile"],
      filters: process.platform === "win32"
        ? [{ name: "Codex", extensions: ["exe"] }]
        : [{ name: "Ejecutable", extensions: ["*"] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    appSettings.codexPath = result.filePaths[0];
    await saveSettings();
    createCodexClient();
    const account = await codex.getAccount();
    return { canceled: false, path: appSettings.codexPath, account };
  });

  ipcMain.handle("files:select", async (_event, { role }) => {
    if (role !== "accounting" && role !== "bank") throw new Error("Tipo de archivo inválido.");
    const result = await dialog.showOpenDialog(mainWindow, {
      title: role === "accounting" ? "Selecciona el auxiliar contable" : "Selecciona uno o varios extractos bancarios",
      properties: role === "bank" ? ["openFile", "multiSelections"] : ["openFile"],
      filters: [
        { name: "Archivos financieros", extensions: ["xlsx", "csv", "ofx", "qfx", "pdf"] },
        { name: "Todos", extensions: ["*"] },
      ],
    });
    if (result.canceled) return [];
    const output = [];
    for (const filePath of result.filePaths) {
      const parsed = await parseFinancialFile(filePath, role);
      sessionFiles.set(parsed.id, parsed);
      output.push(publicFile(parsed));
    }
    return output;
  });

  ipcMain.handle("files:remove", async (_event, fileId) => {
    sessionFiles.delete(fileId);
    return { success: true };
  });

  ipcMain.handle("reconciliation:run", async (_event, payload) => runReconciliation(payload));

  ipcMain.handle("report:export", async (_event, { reportId, format }) => {
    const report = sessionReports.get(reportId);
    if (!report) throw new Error("El reporte ya no está disponible en esta sesión.");
    if (!new Set(["xlsx", "pdf", "json"]).has(format)) throw new Error("Formato de exportación inválido.");
    const safeEntity = (report.metadata.entityName || "conciliacion").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, "-").slice(0, 50);
    const defaultName = `Conciliacion-${safeEntity}-${report.metadata.cutoffDate}.${format}`;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Guardar reporte de conciliación",
      defaultPath: path.join(app.getPath("documents"), defaultName),
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const content = format === "xlsx"
      ? await buildExcelReport(report)
      : format === "pdf"
        ? await buildPdfReport(report)
        : Buffer.from(JSON.stringify(report, null, 2), "utf8");
    await fs.writeFile(result.filePath, content);
    return { canceled: false, path: result.filePath };
  });
}

async function runReconciliation(payload) {
  assertRunPayload(payload);
  sendToRenderer("reconciliation:progress", { stage: "normalizing", message: "Normalizando fechas, valores y referencias…", progress: 12 });

  const accountFile = getSessionFile(payload.accounting.fileId, "accounting");
  const bankFiles = payload.bank.map((selection) => getSessionFile(selection.fileId, "bank"));
  const bookNormalized = normalizeRows({
    fileId: accountFile.id,
    rows: accountFile.rows,
    mapping: payload.accounting.mapping,
    role: "accounting",
    sourceName: accountFile.name,
  });
  const bankNormalized = payload.bank.flatMap((selection, index) => {
    const file = bankFiles[index];
    return normalizeRows({
      fileId: file.id,
      rows: file.rows,
      mapping: selection.mapping,
      role: "bank",
      sourceName: file.name,
    }).transactions;
  });
  if (!bookNormalized.transactions.length) throw new Error("No se obtuvieron movimientos contables válidos. Revisa el mapeo de columnas.");
  if (!bankNormalized.length) throw new Error("No se obtuvieron movimientos bancarios válidos. Revisa el mapeo de columnas.");

  sendToRenderer("reconciliation:progress", { stage: "matching", message: "Cruzando valores, fechas, referencias y grupos…", progress: 34 });
  const engineResult = reconcileTransactions(bookNormalized.transactions, bankNormalized, payload.options);
  const bookBalance = resolveBalance(payload.details.bookBalance, bookNormalized.transactions);
  const bankBalance = resolveBalance(payload.details.bankBalance, bankNormalized);

  sendToRenderer("reconciliation:progress", { stage: "ai", message: "Codex está revisando excepciones y controles…", progress: 58 });
  const prompt = buildAnalysisPrompt({
    payload,
    accountFile,
    bankFiles,
    bookTransactions: bookNormalized.transactions,
    bankTransactions: bankNormalized,
    engineResult,
    bookBalance,
    bankBalance,
  });
  const analysis = await codex.analyze({
    prompt,
    outputSchema: reconciliationOutputSchema,
    workingDirectory: app.getPath("userData"),
  });

  sendToRenderer("reconciliation:progress", { stage: "validating", message: "Validando el JSON y armando el reporte final…", progress: 90 });
  const parsedJson = extractJson(analysis.output);
  const report = parseReconciliationReport(parsedJson);
  report.metadata.methodology = `${report.metadata.methodology} · Modelo: ${analysis.model}`;
  report.scopeLimitations = unique([
    ...report.scopeLimitations,
    "Los ajustes son sugerencias; requieren soporte, revisión y aprobación antes de registrarse.",
    ...(bookBalance.inferred ? ["El saldo en libros se infirió del archivo porque no fue suministrado manualmente."] : []),
    ...(bankBalance.inferred ? ["El saldo bancario se infirió del archivo porque no fue suministrado manualmente."] : []),
  ]);
  const reportId = crypto.randomUUID();
  sessionReports.set(reportId, report);
  sendToRenderer("reconciliation:progress", { stage: "completed", message: "Conciliación lista", progress: 100 });
  return { reportId, report, engineWarnings: bookNormalized.warnings, model: analysis.model };
}

function buildAnalysisPrompt(context) {
  const { payload, accountFile, bankFiles, bookTransactions, bankTransactions, engineResult, bookBalance, bankBalance } = context;
  const compactBook = bookTransactions.map(compactTransaction);
  const compactBank = bankTransactions.map(compactTransaction);
  const compactEngine = {
    ...engineResult,
    unmatchedBook: engineResult.unmatchedBook.map(compactTransaction),
    unmatchedBank: engineResult.unmatchedBank.map(compactTransaction),
  };

  return [
    "TAREA: producir el reporte final de una conciliación bancaria en Colombia, en COP, usando exclusivamente los datos entregados.",
    "",
    "REGLAS DE TRABAJO:",
    "1. La conciliación debe explicar las diferencias entre auxiliar contable y extracto a una fecha de corte; no se permite usar una cuenta puente o un valor de cierre inventado para forzar igualdad.",
    "2. Diferencia temporal en libros: depósitos en tránsito y pagos/cheques pendientes. Diferencia del banco no registrada en libros: comisiones, GMF/impuestos, intereses, débitos o créditos automáticos, sujeto a soporte.",
    "3. Un posible error bancario genera reclamo y seguimiento; no genera automáticamente un asiento para ocultarlo.",
    "4. Las partidas sin identificar permanecen como pendientes, con recomendación de obtener soporte y definir su esencia económica.",
    "5. Señala duplicados, referencias repetidas, movimientos fuera de corte, antigüedad y falta de soportes como hallazgos cuando los datos lo demuestren.",
    "6. Conserva los cruces determinísticos salvo evidencia clara en los datos. Usa los IDs exactos. No inventes IDs ni transacciones.",
    "7. Para ajustes sugeridos, usa nombres genéricos de cuentas si el archivo no trae el plan de cuentas y marca requiresApproval=true.",
    "8. El contexto normativo debe ser prudente: Ley 1314 de 2009 y DUR 2420 de 2015 para marcos de información financiera; los conceptos CTCP orientan el tratamiento, no sustituyen la política de la entidad. La periodicidad mensual es buena práctica/control, no una obligación universal para toda entidad privada.",
    "9. Para datos personales, limita tus observaciones al fin contable de esta conciliación.",
    "",
    "DATOS DE LA ENTIDAD:",
    JSON.stringify({
      entityName: payload.details.entityName,
      entityType: payload.details.entityType,
      accountLabel: payload.details.accountLabel,
      cutoffDate: payload.details.cutoffDate,
      currency: "COP",
      accountingFiles: [accountFile.name],
      bankFiles: bankFiles.map((file) => file.name),
      bookBalance: bookBalance.value,
      bankBalance: bankBalance.value,
      balanceSources: { book: bookBalance.source, bank: bankBalance.source },
    }),
    "",
    "RESULTADO DEL MOTOR DETERMINÍSTICO:",
    JSON.stringify(compactEngine),
    "",
    "MOVIMIENTOS CONTABLES NORMALIZADOS:",
    JSON.stringify(compactBook),
    "",
    "MOVIMIENTOS BANCARIOS NORMALIZADOS:",
    JSON.stringify(compactBank),
    "",
    "Devuelve el JSON final. En legalContext resume el criterio aplicado sin afirmar que el software certifica cumplimiento. En scopeLimitations incluye cualquier ambigüedad de mapeo o saldos inferidos.",
  ].join("\n");
}

function compactTransaction(transaction) {
  return {
    id: transaction.id,
    date: transaction.date,
    amount: transaction.amount,
    description: transaction.description.slice(0, 220),
    reference: transaction.reference.slice(0, 100),
    source: transaction.sourceName,
    row: transaction.sourceRow,
  };
}

function resolveBalance(provided, transactions) {
  const number = provided === "" || provided === null || provided === undefined ? Number.NaN : Number(provided);
  if (Number.isFinite(number)) return { value: roundCurrency(number), inferred: false, source: "suministrado por el usuario" };
  const withBalance = transactions.filter((item) => item.balance !== null).sort((a, b) => a.date.localeCompare(b.date));
  if (withBalance.length) return { value: withBalance.at(-1).balance, inferred: true, source: "último saldo detectado en el archivo" };
  return {
    value: roundCurrency(transactions.reduce((sum, item) => sum + item.amount, 0)),
    inferred: true,
    source: "suma neta de movimientos (no equivale necesariamente al saldo inicial más movimientos)",
  };
}

function extractJson(text) {
  if (typeof text !== "string" || !text.trim()) throw new Error("Codex no devolvió contenido para el reporte.");
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("La respuesta de Codex no contiene un JSON válido.");
  }
}

function publicFile(file) {
  return {
    id: file.id,
    role: file.role,
    name: file.name,
    extension: file.extension,
    size: file.size,
    sheetName: file.sheetName,
    headers: file.headers,
    preview: file.preview,
    rowCount: file.rowCount,
    mapping: file.mapping,
    warnings: file.warnings,
  };
}

function getSessionFile(fileId, role) {
  const file = sessionFiles.get(fileId);
  if (!file || file.role !== role) throw new Error("Uno de los archivos seleccionados ya no está disponible.");
  return file;
}

function assertRunPayload(payload) {
  if (!payload?.accounting?.fileId || !Array.isArray(payload.bank) || !payload.bank.length) {
    throw new Error("Selecciona el auxiliar contable y al menos un extracto bancario.");
  }
  if (!payload.details?.cutoffDate) throw new Error("Indica la fecha de corte.");
  if (!payload.privacyAccepted) throw new Error("Debes confirmar la autorización para tratar la información cargada.");
  const selections = [payload.accounting, ...payload.bank];
  for (const selection of selections) {
    const mapping = selection.mapping ?? {};
    if (!mapping.date || (!mapping.amount && !mapping.debit && !mapping.credit)) {
      throw new Error("Revisa el mapeo: cada archivo necesita fecha y valor, o columnas de débito/crédito.");
    }
  }
}

function userFacingCodexError(error) {
  const message = String(error?.message ?? error);
  if (/ENOENT|not found|no se encuentra/i.test(message)) {
    return "No se encontró Codex. Instala ChatGPT/Codex o selecciona manualmente el ejecutable.";
  }
  return message;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}
