import { app } from "electron";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildExcelReport, buildPdfReport } from "../electron/exporter.mjs";

await app.whenReady();
try {
  const report = JSON.parse(await fs.readFile(new URL("../fixtures/report_demo.json", import.meta.url), "utf8"));
  const [xlsx, pdf] = await Promise.all([buildExcelReport(report), buildPdfReport(report)]);
  if (xlsx.subarray(0, 2).toString() !== "PK") throw new Error("La exportación XLSX no produjo un ZIP válido.");
  if (pdf.subarray(0, 4).toString() !== "%PDF") throw new Error("La exportación PDF no produjo un PDF válido.");
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "kaikei-smoke-"));
  await fs.writeFile(path.join(outputDir, "reporte.xlsx"), xlsx);
  await fs.writeFile(path.join(outputDir, "reporte.pdf"), pdf);
  const sizes = { xlsx: xlsx.length, pdf: pdf.length };
  await fs.rm(outputDir, { recursive: true, force: true });
  process.stdout.write(`${JSON.stringify({ exporter: "ok", sizes })}\n`);
  app.quit();
} catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  app.exit(1);
}
